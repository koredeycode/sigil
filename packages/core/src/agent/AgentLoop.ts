import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { getAgent, getAgentChats, getAgentDirectives, insertLog } from '../lib/Database.js';
import { agentManager } from './AgentManager.js';
import { buildSystemPrompt, getPrimaryModel } from './LLMChain.js';
import { createTools } from './ToolRegistry.js';

// In-memory checkpointer — provides state within agent tool-call loops.
// Cross-session chat persistence is handled by our existing SQLite database.
const checkpointer = new MemorySaver();

// Cached agent graphs per agent ID
const agentGraphCache = new Map<string, ReturnType<typeof createReactAgent>>();

/**
 * Get or create a LangGraph ReAct agent for the given agent.
 */
async function getOrCreateGraph(agentId: string, agentName: string) {
  if (agentGraphCache.has(agentId)) {
    return agentGraphCache.get(agentId)!;
  }

  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Agent "${agentId}" not found`);

  const model = getPrimaryModel();
  const tools = await createTools(agent.name, agent.id);

  const directiveTexts = getAgentDirectives(agentId).map(
    (d) => `${d.condition} → ${d.action}`
  );

  const systemPrompt = buildSystemPrompt(
    agentName,
    agent.pubkey,
    directiveTexts
  );

  const graph = createReactAgent({
    llm: model,
    tools,
    checkpointSaver: checkpointer,
    prompt: new SystemMessage(systemPrompt),
  });

  agentGraphCache.set(agentId, graph);
  return graph;
}

/**
 * Invalidate the cached graph for an agent (call when config changes).
 */
export function invalidateAgentGraph(agentId: string): void {
  agentGraphCache.delete(agentId);
}

/**
 * Invoke the Solana agent with a message.
 * Uses LangGraph's ReAct agent with persistent memory via SqliteSaver.
 * 
 * This is the unified entry point for:
 * - Chat messages from CLI/TUI/WebUI
 * - Directive-triggered cycles from the CronScheduler
 * - Any other programmatic invocation
 */
export async function invokeSolanaAgent(
  agentId: string,
  agentName: string,
  message: string,
  opts?: { includeHistory?: boolean }
): Promise<{ response: string; toolResults: Array<{ tool: string; result: string }> }> {
  console.info(`[AgentLoop:${agentName}] Invoking with message: ${message.substring(0, 100)}...`);

  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Agent "${agentId}" not found`);

  try {
    const graph = await getOrCreateGraph(agentId, agentName);

    // Build input messages - optionally include recent chat history for context
    const inputMessages: BaseMessage[] = [];

    if (opts?.includeHistory) {
      const recentChats = getAgentChats(agentId, 10);
      for (const chat of recentChats) {
        if (chat.role === 'user') {
          inputMessages.push(new HumanMessage(chat.content));
        } else if (chat.role === 'assistant') {
          inputMessages.push(new AIMessage(chat.content));
        }
      }
    }

    inputMessages.push(new HumanMessage(message));

    // Invoke the LangGraph agent with thread_id for memory persistence
    const result = await graph.invoke(
      { messages: inputMessages },
      { 
        configurable: { thread_id: agentId },
        callbacks: [
          {
            handleLLMEnd: (output) => {
              const usage = output.llmOutput?.tokenUsage || output.llmOutput?.estimatedTokenUsage;
              if (usage) {
                console.info(
                  `[Token Usage:${agentName}] Input: ${usage.promptTokens} | Output: ${usage.completionTokens} | Total: ${usage.totalTokens}`
                );
              }
            }
          }
        ]
      }
    );

    // Extract the last AI message from the result
    const resultMessages: BaseMessage[] = result.messages;
    const lastAiMessage = resultMessages
      .filter((m: BaseMessage) => m._getType() === 'ai')
      .pop();

    const response = lastAiMessage
      ? typeof lastAiMessage.content === 'string'
        ? lastAiMessage.content
        : JSON.stringify(lastAiMessage.content)
      : 'Action completed.';

    // Extract tool call results from messages
    const toolResults: Array<{ tool: string; result: string }> = [];
    for (const msg of resultMessages) {
      if (msg._getType() === 'tool') {
        toolResults.push({
          tool: (msg as any).name || 'unknown',
          result: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        });
      }
    }

    // Log the interaction
    insertLog(agentId, 'agent_invoke', response, message);

    // Emit events
    if (toolResults.length > 0) {
      for (const tr of toolResults) {
        agentManager.emit('agent:action', {
          agent: agentName,
          tool: tr.tool,
          result: tr.result,
          timestamp: new Date().toISOString(),
        });
      }
    }

    agentManager.emit('agent:thought', {
      agent: agentName,
      thought: response,
      timestamp: new Date().toISOString(),
    });

    console.info(`[AgentLoop:${agentName}] Response: ${response.substring(0, 200)}...`);

    return { response, toolResults };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[AgentLoop:${agentName}] Error:`, errMsg);
    insertLog(agentId, 'agent_error', `Error: ${errMsg}`, message);

    agentManager.emit('agent:error', {
      agent: agentName,
      error: errMsg,
      timestamp: new Date().toISOString(),
    });

    return { response: `Error: ${errMsg}`, toolResults: [] };
  }
}

/**
 * Run a directive-triggered cycle for an agent.
 * Evaluates active directives and sends triggered ones as messages to the agent.
 */
export async function runDirectiveCycle(agentId: string, agentName: string): Promise<void> {
  console.info(`[AgentLoop:${agentName}] Running directive cycle`);

  const agent = getAgent(agentId);
  if (!agent || agent.status === 'killed') {
    insertLog(agentId, 'cycle_skip', 'Agent is killed or not found');
    return;
  }

  const directives = getAgentDirectives(agentId);
  if (directives.length === 0) {
    insertLog(agentId, 'cycle_skip', 'No active directives');
    return;
  }

  // Format directives as a prompt for the agent
  const directivePrompt = directives.map(
    (d) => `- Condition: "${d.condition}" → Action: "${d.action}"${d.max_amount ? ` (max: ${d.max_amount})` : ''}`
  ).join('\n');

  const message = `You have active directives that need evaluation. Please check each condition against the current wallet state and execute any that are triggered:\n\n${directivePrompt}\n\nCheck the current state using your tools and act on any triggered conditions.`;

  await invokeSolanaAgent(agentId, agentName, message);
}
