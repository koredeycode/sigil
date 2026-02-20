import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Router } from 'express';
import { agentManager } from '../../agent/AgentManager.js';
import { buildSystemPrompt, getPrimaryModel } from '../../agent/LLMChain.js';
import { createTools } from '../../agent/ToolRegistry.js';
import { getAgent, getAgentChats, getAgentDirectives, insertChat, insertLog } from '../../lib/Database.js';
import { getConnection, lamportsToSol } from '../../wallet/TransactionBuilder.js';
import { getKeypair } from '../../wallet/Wallet.js';

export const chatRouter: Router = Router();

// GET /api/chat/:agentId — get chat history
chatRouter.get('/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const chats = getAgentChats(agentId, limit);
    res.json({ message: 'Success', data: chats });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// POST /api/chat — send a message to an agent's LLM
chatRouter.post('/', async (req, res) => {
  try {
    const { agentId, message } = req.body;
    if (!agentId || !message) {
      res.status(400).json({ message: 'agentId and message are required', data: null });
      return;
    }

    const agent = getAgent(agentId);
    if (!agent) {
      res.status(404).json({ message: `Agent "${agentId}" not found`, data: null });
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
    const modelWithTools = model.bindTools!(tools);

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

    // Save user message to DB
    insertChat(agent.id, 'user', message);

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
    
    // Save assistant message to DB
    insertChat(agent.id, 'assistant', content);

    // Emit agent response
    agentManager.emit('chat:message', {
      agent: agent.name,
      role: 'assistant',
      content,
      tools: toolResults,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'Chat sent successfully',
      data: {
        agent: agent.name,
        response: content,
        tools: toolResults,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
