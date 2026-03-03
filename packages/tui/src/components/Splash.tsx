import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

const SIGIL_ART = `
 ███████╗██╗ ██████╗ ██╗██╗     
 ██╔════╝██║██╔════╝ ██║██║     
 ███████╗██║██║  ███╗██║██║     
 ╚════██║██║██║   ██║██║██║     
 ███████║██║╚██████╔╝██║███████╗
 ╚══════╝╚═╝ ╚═════╝ ╚═╝╚══════╝`;

interface SplashProps {
  onDone: () => void;
}

export function Splash({ onDone }: SplashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="magenta">{SIGIL_ART}</Text>
      <Box marginTop={1} paddingX={1}>
        <Text color="magenta" bold>✵ </Text>
        <Text>Welcome to </Text>
        <Text bold>Sigil</Text>
        <Text dimColor> — local-first AI agents for Solana</Text>
      </Box>
    </Box>
  );
}
