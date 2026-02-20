import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import { useConfig } from '../context/ConfigContext.js';
import { Agent } from '../hooks/useAgents.js';
import { ApiClient } from '../lib/api.js';

interface ChatInputProps {
  activeAgent: Agent | null;
}

export function ChatInput({ activeAgent }: ChatInputProps) {
  const { apiPort, authToken } = useConfig();
  const [query, setQuery] = useState('');

  if (!activeAgent) return null;

  return (
    <Box borderStyle="round" borderColor="magenta" paddingX={1}>
      <Text color="magenta">{activeAgent.name} ➜ </Text>
      <TextInput
        value={query}
        onChange={setQuery}
        onSubmit={async (val) => {
          setQuery('');
          if (!val.trim()) return;
          try {
             // We use fetch directly or extend ApiClient
             const client = new ApiClient(apiPort, authToken);
             await client.sendChat(activeAgent.id, val);
          } catch (e) {
              // TODO: Show error
          }
        }}
        placeholder={`Message ${activeAgent.name}...`}
      />
    </Box>
  );
}
