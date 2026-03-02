import { Box, Text, useApp, useInput } from 'ink';
import { useAgents } from '../hooks/useAgents.js';
import { ChatInput } from './ChatInput.js';


export function Layout() {
  const { agents } = useAgents();
  const { exit } = useApp();

  // Find the main "sigil" agent
  const activeAgent = agents.find(a => a.name === 'sigil');

  useInput((input, key) => {
    // Escape or Ctrl+C to exit
    if (input === 'q' && key.ctrl) {
      exit();
    }
  });

  if (!activeAgent) {
    return (
      <Box padding={1}>
        <Text dimColor>Waiting for sigil agent to initialize...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1} width="100%">
      {/* Optional Minimal Header */}
      <Box marginBottom={1} borderStyle="round" borderColor="magenta" paddingX={1} width="100%">
        <Text color="magenta">✵ Welcome to Sigil CLI!</Text>
        <Text dimColor>   /help for help, Ctrl+C to exit</Text>
      </Box>
      
      {/* Main Chat Area */}
      <Box flexDirection="column" flexGrow={1} width="100%">
         <ChatInput activeAgent={activeAgent} isFocused={true} />
      </Box>
    </Box>
  );
}
