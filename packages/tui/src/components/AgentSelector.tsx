import { Box, Text } from 'ink';
import { Agent } from '../hooks/useAgents.js';

interface AgentSelectorProps {
  activeAgent: Agent | null;
  agents: Agent[];
}

export function AgentSelector({ activeAgent, agents }: AgentSelectorProps) {
  if (!activeAgent) {
    return (
        <Box borderStyle="round" borderColor="cyan" paddingX={1}>
            <Text>No agents found. Run </Text>
            <Text bold color="yellow">sigil agent create</Text>
        </Box>
    );
  }

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text>Agent: </Text>
      <Text bold color="green">{activeAgent.name}</Text>
      <Text dimColor> ({activeAgent.status})</Text>
      <Text> | </Text>
      <Text dimColor>Use ← → to switch</Text>
    </Box>
  );
}
