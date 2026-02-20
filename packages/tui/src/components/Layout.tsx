import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { useAgents } from '../hooks/useAgents.js';
import { ChatInput } from './ChatInput.js';
import { LogStream } from './LogStream.js';
import { Portfolio } from './Portfolio.js';

export function Layout() {
  const { agents, activeAgent, nextAgent, prevAgent } = useAgents();
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState<'wallet' | 'logs'>('wallet');
  const [chatFocused, setChatFocused] = useState(true);

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (chatFocused) {
        if (key.escape) setChatFocused(false);
        return; // ignore global binds while typing in chat
    }

    if (key.upArrow) prevAgent();
    if (key.downArrow) nextAgent();
    if (key.return) setActiveTab(t => t === 'wallet' ? 'logs' : 'wallet'); 
    
    // Quick focus triggers
    if (input === 'f' || key.return) {
        setChatFocused(true);
        return;
    }

    if (input === 'q') exit();
  });

  return (
    <Box flexDirection="row" height="100%" width="100%">
      {/* Left Sidebar: Agents & Navigation */}
      <Box flexDirection="column" width={30} borderStyle="single" paddingX={1} borderColor="gray">
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="red">SIGIL CLI</Text>
        </Box>
        <Text dimColor>{time.toLocaleTimeString()}</Text>
        <Box height={1} />
        
        <Text dimColor>--- AGENTS ---</Text>
        <Box flexDirection="column" flexGrow={1} marginTop={1}>
          {agents.length === 0 ? (
            <Text dimColor>No agents found.</Text>
          ) : (
            agents.map((agent) => {
              const isActive = agent.id === activeAgent?.id;
              return (
                <Text key={agent.id} color={isActive ? 'white' : 'gray'}>
                  <Text color={isActive ? 'red' : 'gray'}>{isActive ? '▶ ' : '  '}</Text>
                  {agent.name} <Text dimColor>[{agent.status.substring(0, 1).toUpperCase()}]</Text>
                </Text>
              );
            })
          )}
        </Box>

        <Box height={1} />
        <Text dimColor>--- CONTROLS ---</Text>
        <Text><Text color="red">↑/↓</Text> Select Agent</Text>
        <Text><Text color="red">Enter</Text> Toggle Tabs/Focus Chat</Text>
        <Text><Text color="red">Esc</Text> Unfocus Chat</Text>
        <Text><Text color="red">q</Text>   Exit (When Unfocused)</Text>
      </Box>

      {/* Middle Area: Chat Interface */}
      <Box flexDirection="column" flexGrow={2} marginLeft={1}>
        <Box borderStyle="single" borderColor="gray" flexDirection="column" flexGrow={1} paddingX={1}>
          {activeAgent ? (
             <Box flexDirection="column" height="100%">
               <Box borderBottom={false} paddingBottom={1} marginBottom={1} borderStyle="single" borderTop={false} borderLeft={false} borderRight={false}>
                 <Text bold>{activeAgent.name}</Text>
                 <Text dimColor> | {activeAgent.status}</Text>
               </Box>
               
               <Box flexGrow={1} flexDirection="column" justifyContent="flex-end">
                  <ChatInput activeAgent={activeAgent} isFocused={chatFocused} onFocusChange={setChatFocused} />
               </Box>
             </Box>
          ) : (
             <Box justifyContent="center" alignItems="center" height="100%">
               <Text dimColor>Select an agent from the sidebar.</Text>
             </Box>
          )}
        </Box>
      </Box>

      {/* Right Area: Info Panel (Wallet / Logs) */}
      <Box flexDirection="column" width={45} marginLeft={1}>
         <Box borderStyle="single" borderColor="gray" flexDirection="column" flexGrow={1} paddingX={1}>
            <Box borderBottom={false} paddingBottom={1} marginBottom={1} borderStyle="single" borderTop={false} borderLeft={false} borderRight={false}>
               <Text bold color={activeTab === 'wallet' ? 'white' : 'gray'}>[W]allet</Text>
               <Text dimColor>  |  </Text>
               <Text bold color={activeTab === 'logs' ? 'white' : 'gray'}>[L]ogs</Text>
            </Box>

            <Box flexGrow={1} flexDirection="column">
                {activeAgent ? (
                    activeTab === 'wallet' ? <Portfolio activeAgent={activeAgent} /> : <LogStream activeAgent={activeAgent} />
                ) : (
                    <Text dimColor>Waiting for agent context...</Text>
                )}
            </Box>
         </Box>
      </Box>
    </Box>
  );
}
