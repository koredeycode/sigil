import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { getAgent, getAgentChats, insertLog } from '../lib/Database.js';
import { logger } from '../lib/Logger.js';
import { LRUCache } from '../lib/LRUCache.js';
import { agentManager } from './AgentManager.js';
import { buildSystemPrompt, getPrimaryModel } from './LLMChain.js';
import { createTools } from './ToolRegistry.js';

// In-memory checkpointer — provides state within agent tool-call loops.
// Cross-session chat persistence is handled by our existing SQLite database.
const checkpointer = new MemorySaver();

// Cached agent graphs per agent ID
const agentGraphCache = new LRUCache<string, ReturnType<typeof createReactAgent>>(50);

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

  const systemPrompt = buildSystemPrompt(
    agentName,
    agent.pubkey,
    agent.prompt
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
 * Invalidate ALL cached agent graphs (call when global config like the LLM provider changes).
 */
export function invalidateAllAgentGraphs(): void {
  agentGraphCache.clear();
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

    // AbortController for LLM timeout (60 seconds)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(new Error('LLM Invocation timed out after 60s')), 60000);

    let result;
    try {
      // Invoke the LangGraph agent with thread_id for memory persistence
      result = await graph.invoke(
        { messages: inputMessages },
        { 
          configurable: { thread_id: agentId },
          signal: abortController.signal,
          callbacks: [
          {
            handleLLMEnd: (output) => {
              const usage = output.llmOutput?.tokenUsage || output.llmOutput?.estimatedTokenUsage;
              if (usage) {
                console.info(
                  `[Token Usage:${agentName}] Input: ${usage.promptTokens} | Output: ${usage.completionTokens} | Total: ${usage.totalTokens}`
                );
                insertLog(agentId, 'token_usage', `Input: ${usage.promptTokens} | Output: ${usage.completionTokens} | Total: ${usage.totalTokens}`, 'LLM Iteration');
              }
            }
          }
        ]
      }
      );
    } finally {
      clearTimeout(timeoutId);
    }

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
    const isCron = message.startsWith('[CRON JOB]');
    insertLog(agentId, isCron ? 'cron_invoke' : 'agent_invoke', response, message);

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
    logger.error(`AgentLoop error for ${agentName}`, { error: errMsg });
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
 * Run an autonomous cycle for an agent.
 * Evaluates active instructions and sends triggered ones as messages to the agent.
 */
export async function runAutonomousCycle(agentId: string, agentName: string): Promise<void> {
  console.info(`[AgentLoop:${agentName}] Running autonomous cycle`);

  const agent = getAgent(agentId);
  if (!agent || agent.status !== 'running') {
    insertLog(agentId, 'cycle_skip', 'Agent is paused or not found');
    return;
  }

  const agentPrompt = (agent.prompt || '').trim();
  if (!agentPrompt) {
    insertLog(agentId, 'cycle_skip', 'No active instructions');
    return;
  }

  const message = `[AUTONOMOUS CYCLE]\nEvaluate the following instructions against your current wallet state and take any necessary actions:\n\n---\n${agentPrompt}\n---\n\nIf the condition for an action is met, execute it now. If not, briefly explain why.`;

  await invokeSolanaAgent(agentId, agentName, message);
}
