import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { useAgents } from '../hooks/useAgents.js';
import { AgentSelector } from './AgentSelector.js';
import { ChatInput } from './ChatInput.js';
import { CommandPalette } from './CommandPalette.js';
import { LogStream } from './LogStream.js';
import { Portfolio } from './Portfolio.js';
import { SettingsPanel } from './SettingsPanel.js';

export function Layout() {
  const { agents, activeAgent, nextAgent, prevAgent } = useAgents(); 
  const [showSettings, setShowSettings] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  useInput((input, key) => {
    // Global shortcuts
    if (key.ctrl && input === 'k') {
      setShowPalette(true);
      setShowSettings(false);
    }
    if (key.ctrl && input === 's') {
      setShowSettings(true);
      setShowPalette(false);
    }
    if (key.escape) {
      setShowSettings(false);
      setShowPalette(false);
    }

    // Navigation (only if overlays are closed)
    if (!showSettings && !showPalette) {
      if (key.leftArrow) prevAgent();
      if (key.rightArrow) nextAgent();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box>
        <Text bold color="cyan"> ⎔ Sigil </Text>
        <AgentSelector activeAgent={activeAgent} agents={agents} />
      </Box>

      {/* Main Content Area (Overlay or Split Pane) */}
      <Box flexGrow={1}>
        {showSettings ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <SettingsPanel />
          </Box>
        ) : showPalette ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <CommandPalette 
              onExecute={(cmd) => { 
                // TODO: Handle commands
                setShowPalette(false);
              }} 
              onClose={() => setShowPalette(false)} 
            />
          </Box>
        ) : (
          <>
            <LogStream activeAgent={activeAgent} />
            <Portfolio activeAgent={activeAgent} />
          </>
        )}
      </Box>

      {/* Footer / Input (Hide when overlay active?) */}
      {!showSettings && !showPalette && (
        <ChatInput activeAgent={activeAgent} />
      )}
    </Box>
  );
}
