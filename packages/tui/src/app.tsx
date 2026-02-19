import { Box, render, Text } from 'ink';

function App() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">⎔ Sigil TUI</Text>
      <Text dimColor>Terminal dashboard — not yet implemented</Text>
    </Box>
  );
}

render(<App />);
