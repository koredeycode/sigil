import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Router } from 'express';
import { agentManager } from '../../agent/AgentManager.js';
import { buildSystemPrompt, getPrimaryModel } from '../../agent/LLMChain.js';
import { createTools } from '../../agent/ToolRegistry.js';
import { getAgent, getAgentDirectives, insertLog } from '../../lib/Database.js';
import { getConnection, lamportsToSol } from '../../wallet/TransactionBuilder.js';
import { getKeypair } from '../../wallet/Wallet.js';

export const chatRouter = Router();

// POST /api/chat — send a message to an agent's LLM
chatRouter.post('/', async (req, res) => {
  try {
    const { agentId, message } = req.body;
    if (!agentId || !message) {
      res.status(400).json({ error: 'agentId and message are required' });
      return;
    }

    const agent = getAgent(agentId);
    if (!agent) {
      res.status(404).json({ error: `Agent "${agentId}" not found` });
      return;
    }

    // Get current state for context
    const keypair = await getKeypair(agent.name);
    const connection = getConnection();
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = lamportsToSol(balance);

    const directiveTexts = getAgentDirectives(agent.id).map(
      (d) => `${d.condition} → ${d.action}`
    );

    const systemPrompt = buildSystemPrompt(
      agent.name,
      agent.pubkey,
      solBalance,
      directiveTexts
    );

    const model = getPrimaryModel();
    const tools = createTools(agent.id, agent.name);
    const modelWithTools = model.bindTools(tools);

    // Emit chat message event
    agentManager.emit('chat:message', {
      agent: agent.name,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    const response = await modelWithTools.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ]);

    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    // Execute any tool calls
    const toolResults: Array<{ tool: string; result: string }> = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        const tool = tools.find((t) => t.name === toolCall.name);
        if (tool) {
          const result = await tool.invoke(toolCall.args);
          toolResults.push({ tool: toolCall.name, result: String(result) });

          agentManager.emit('agent:action', {
            agent: agent.name,
            tool: toolCall.name,
            params: toolCall.args,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    insertLog(agent.id, 'chat', content, message);

    // Emit agent response
    agentManager.emit('chat:message', {
      agent: agent.name,
      role: 'assistant',
      content,
      tools: toolResults,
      timestamp: new Date().toISOString(),
    });

    res.json({
      agent: agent.name,
      response: content,
      tools: toolResults,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
