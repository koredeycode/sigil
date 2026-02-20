import { Box, Text } from 'ink';
import { Agent } from '../hooks/useAgents.js';

interface PortfolioProps {
  activeAgent: Agent | null;
}

export function Portfolio({ activeAgent }: PortfolioProps) {
  if (!activeAgent) return null;

  return (
    <Box borderStyle="round" borderColor="yellow" flexDirection="column" width={30} paddingX={1}>
      <Text bold underline>Portfolio: {activeAgent.name}</Text>
      <Box justifyContent="space-between">
        <Text>SOL:</Text>
        <Text color="green">0.00</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text>USDC:</Text>
        <Text color="green">0.00</Text>
      </Box>
    </Box>
  );
}
