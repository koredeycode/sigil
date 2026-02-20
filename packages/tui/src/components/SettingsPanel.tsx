import { Box, Text } from 'ink';

export function SettingsPanel() {
  return (
    <Box borderStyle="double" borderColor="yellow" padding={1} flexDirection="column" width={40}>
      <Text bold underline>Settings</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>Kill Switch: <Text color="green">OFF</Text></Text>
        <Text>Max Slippage: <Text color="green">1%</Text></Text>
        <Text>Theme: <Text color="cyan">Dark</Text></Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Esc to close</Text>
      </Box>
    </Box>
  );
}
