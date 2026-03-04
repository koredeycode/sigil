import { Router } from 'express';
import { agentManager } from '../../agent/AgentManager.js';
import { getAgent, getAgentChats, insertChat } from '../../lib/Database.js';
import { validateBody } from '../middleware/validate.js';
import { chatMessageSchema } from '../schemas.js';

export const chatRouter: Router = Router();

// GET /api/chat/:agentId — get chat history
chatRouter.get('/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const before = req.query.before ? parseInt(req.query.before as string, 10) : undefined;
    const chats = getAgentChats(agentId, limit, before);
    res.json({ message: 'Success', data: chats });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// POST /api/chat — send a message to an agent's LLM
chatRouter.post('/', validateBody(chatMessageSchema), async (req, res) => {
  try {
    const { agentId, message } = req.body;

    const agent = getAgent(agentId);
    if (!agent) {
      res.status(404).json({ message: `Agent "${agentId}" not found`, data: null });
      return;
    }

    // Emit user message event
    agentManager.emit('chat:message', {
      agent: agent.name,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Save user message to DB
    insertChat(agent.id, 'user', message);

    // Invoke the LangGraph agent
    const { response, toolResults } = await agentManager.invoke(agentId, message, {
      includeHistory: true,
    });

    // Save assistant message to DB
    insertChat(agent.id, 'assistant', response, JSON.stringify(toolResults));

    // Emit agent response
    agentManager.emit('chat:message', {
      agent: agent.name,
      role: 'assistant',
      content: response,
      tools: toolResults,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'Chat sent successfully',
      data: {
        agent: agent.name,
        response,
        tools: toolResults,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
