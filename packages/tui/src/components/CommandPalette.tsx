import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';

interface CommandPaletteProps {
  onExecute: (cmd: string) => void;
  onClose: () => void;
}

export function CommandPalette({ onExecute, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  return (
    <Box borderStyle="double" borderColor="magenta" padding={1} flexDirection="column" width={50}>
      <Text bold>Command Palette</Text>
      <Box marginTop={1}>
        <Text color="magenta">ᐳ </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          onSubmit={(val) => {
            onExecute(val);
            onClose();
          }}
          placeholder="Type a command..."
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Examples: /kill, /restart, /clear</Text>
      </Box>
    </Box>
  );
}
