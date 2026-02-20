import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { PublicKey } from '@solana/web3.js';
import {
    buildEvalPrompt,
    EvalContext,
    getEvaluableDirectives,
    markDirectiveFired,
    parseEvalResponse,
} from '../directives/DirectiveEngine.js';
import { isKillSwitchActive } from '../lib/Config.js';
import { getAgent, getAgentDirectives, insertLog } from '../lib/Database.js';
import { getConnection, lamportsToSol } from '../wallet/TransactionBuilder.js';
import { getKeypair } from '../wallet/Wallet.js';
import { agentManager } from './AgentManager.js';
import { buildSystemPrompt, getPrimaryModel } from './LLMChain.js';
import { createTools } from './ToolRegistry.js';

/**
 * Run a single cycle of the agent thought loop.
 *
 * Steps (per ARCHITECTURE.md):
 * 1. CHECK KILL SWITCH
 * 2. GATHER STATE
 * 3. EVALUATE DIRECTIVES
 * 4. LLM DECISION
 * 5. GUARDRAILS CHECK (handled by tools internally)
 * 6. EXECUTE (handled by tools internally)
 * 7. LOG
 */
export async function runCycle(agentId: string, agentName: string): Promise<void> {
  // 1. CHECK KILL SWITCH
  console.info(`[AgentLoop:${agentName}] Start Cycle`);
  if (isKillSwitchActive()) {
    console.info(`[AgentLoop:${agentName}] Kill switch active - aborting`);
    agentManager.emit('agent:status', { agent: agentName, status: 'killed' });
    insertLog(agentId, 'check_kill_switch', 'Kill switch active — skipping cycle');
    return;
  }

  const agent = getAgent(agentId);
  if (!agent || agent.status === 'killed') {
    insertLog(agentId, 'cycle_skip', 'Agent is killed or not found');
    return;
  }

  // 2. GATHER STATE
  let solBalance = 0;
  let tokenAccounts: EvalContext['tokenAccounts'] = [];

  try {
    const keypair = await getKeypair(agentName);
    const connection = getConnection();

    const balance = await connection.getBalance(keypair.publicKey);
    solBalance = lamportsToSol(balance);

    const tokenAccountData = await connection.getParsedTokenAccountsByOwner(
      keypair.publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    tokenAccounts = tokenAccountData.value.map((ta) => {
      const info = ta.account.data.parsed.info;
      return {
        mint: info.mint,
        balance: info.tokenAmount.uiAmount ?? 0,
        percentage: 0, // computed below
      };
    });

    // Compute portfolio percentages (SOL-based for devnet)
    const totalValue = solBalance;
    tokenAccounts = tokenAccounts.map((t) => ({
      ...t,
      percentage: totalValue > 0 ? 0 : 0, // devnet tokens have no SOL price
    }));
    console.info(`[AgentLoop:${agentName}] Gathered State - SOL: ${solBalance}, Tokens: ${tokenAccounts.length}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    insertLog(agentId, 'gather_state', `Error: ${errMsg}`);
    agentManager.emit('agent:error', {
      agent: agentName,
      error: errMsg,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  agentManager.emit('agent:thought', {
    agent: agentName,
    thought: `Checking state: SOL = ${solBalance}, ${tokenAccounts.length} token account(s)`,
    timestamp: new Date().toISOString(),
  });

  insertLog(agentId, 'gather_state', `SOL: ${solBalance}, Tokens: ${tokenAccounts.length}`);

  // 3. EVALUATE DIRECTIVES
  const directives = getEvaluableDirectives(agentId);
  const triggeredDirectives: string[] = [];

  const evalContext: EvalContext = {
    solBalance,
    tokenAccounts,
    portfolioValue: solBalance,
  };

  if (directives.length > 0) {
    const model = getPrimaryModel();

    for (const directive of directives) {
      try {
        const evalPrompt = buildEvalPrompt(directive, evalContext);
        const response = await model.invoke([new HumanMessage(evalPrompt)]);
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        const evalResult = parseEvalResponse(content);

        if (evalResult.triggered) {
          triggeredDirectives.push(
            `[${directive.condition}] → ${directive.action} (${evalResult.reasoning})`
          );
          markDirectiveFired(directive.id);

          agentManager.emit('agent:thought', {
            agent: agentName,
            thought: `Directive triggered: "${directive.condition}" → ${evalResult.reasoning}`,
            timestamp: new Date().toISOString(),
          });
        }

        insertLog(
          agentId,
          'evaluate_directive',
          `${directive.condition}: ${evalResult.triggered ? 'TRIGGERED' : 'not triggered'}`,
          evalResult.reasoning
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        insertLog(agentId, 'evaluate_directive', `Error evaluating: ${errMsg}`);
      }
    }
  } else {
    console.info(`[AgentLoop:${agentName}] No directives configured`);
    insertLog(agentId, 'evaluate_directive', 'No directives to evaluate');
  }

  // 4. LLM DECISION — only if directives were triggered
  if (triggeredDirectives.length === 0) {
    agentManager.emit('agent:thought', {
      agent: agentName,
      thought: 'No directives triggered. Cycle complete.',
      timestamp: new Date().toISOString(),
    });
    insertLog(agentId, 'llm_decision', 'No directives triggered — no action needed');
    return;
  }

  try {
    const model = getPrimaryModel();
    const tools = createTools(agentId, agentName);
    const modelWithTools = model.bindTools!(tools);

    const allDirectiveTexts = getAgentDirectives(agentId).map(
      (d) => `${d.condition} → ${d.action}`
    );

    const systemPrompt = buildSystemPrompt(
      agentName,
      agent.pubkey,
      solBalance,
      allDirectiveTexts
    );

    const userMessage = `The following directives have been triggered:\n${triggeredDirectives.join('\n')}\n\nExecute the appropriate actions now.`;

    const response = await modelWithTools.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage),
    ]);

    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    console.info(`[AgentLoop:${agentName}] LLM Decision Output:`, content);

    // Handle tool calls if present
    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        agentManager.emit('agent:action', {
          agent: agentName,
          tool: toolCall.name,
          params: toolCall.args,
          timestamp: new Date().toISOString(),
        });

        // Find and execute the tool
        const tool = tools.find((t) => t.name === toolCall.name);
        if (tool) {
          try {
            console.info(`[AgentLoop:${agentName}] Executing tool ${toolCall.name} with args:`, toolCall.args);
            const result = await tool.invoke(toolCall.args);
            console.info(`[AgentLoop:${agentName}] Tool ${toolCall.name} returned:`, result);
            insertLog(agentId, `tool:${toolCall.name}`, String(result), content);

            agentManager.emit('agent:transaction', {
              agent: agentName,
              type: toolCall.name,
              result: String(result),
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            insertLog(agentId, `tool:${toolCall.name}`, `Error: ${errMsg}`);
            agentManager.emit('agent:error', {
              agent: agentName,
              error: errMsg,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    } else {
      insertLog(agentId, 'llm_decision', content);
    }

    agentManager.emit('agent:thought', {
      agent: agentName,
      thought: content,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    insertLog(agentId, 'llm_decision', `Error: ${errMsg}`);
    agentManager.emit('agent:error', {
      agent: agentName,
      error: errMsg,
      timestamp: new Date().toISOString(),
    });
  }
}
