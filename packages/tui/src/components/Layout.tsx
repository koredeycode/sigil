import { Box, Text, useApp, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { useAgents } from '../hooks/useAgents.js';
import { ChatInput } from './ChatInput.js';
import { Portfolio } from './Portfolio.js';

export function Layout() {
  const { agents, activeAgent, nextAgent, prevAgent } = useAgents();
  const { exit } = useApp();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useInput((input, key) => {
    if (key.upArrow) prevAgent();
    if (key.downArrow) nextAgent();
    if (input === 'q') exit();
  });

  return (
    <Box flexDirection="row" height="100%" width="100%">
      {/* Left Sidebar */}
      <Box flexDirection="column" width={35} borderStyle="single" paddingX={1}>
        <Text color="red">Welcome to SIGIL!</Text>
        <Text>Current Time: {time.toLocaleTimeString()}</Text>
        
        <Box height={1} />
        
        {/* Pixel Art Robot */}
        <Box flexDirection="column" alignItems="center">
          <Text color="white">{`      _______     `}</Text>
          <Text color="white">{`     _[_o_o_]_    `}</Text>
          <Text color="white">{`     \\___|___/    `}</Text>
          <Text color="white">{`     / |_|_| \\    `}</Text>
          <Text color="white">{`    (____|____)   `}</Text>
        </Box>
        
        <Box height={1} />
        {activeAgent && (
          <Box flexDirection="column" alignItems="center">
             <Portfolio activeAgent={activeAgent} />
          </Box>
        )}
        
        <Box height={1} />
        <Text dimColor>------- Status -------</Text>
        <Text color="white">Active Agents: <Text color="green">{agents.filter(a => a.status === 'running').length}</Text></Text>
        <Text color="white">Total Agents: <Text color="blue">{agents.length}</Text></Text>
        
        <Box height={1} />
        <Text dimColor>------ Controls ------</Text>
        <Text>Press keys to navigate:</Text>
        <Text><Text color="red">&lt;↑/↓&gt;</Text> for Agent Selection</Text>
        <Text><Text color="red">&lt;Enter&gt;</Text> for Logs</Text>
        <Text><Text color="red">&lt;q&gt;</Text>     for Exit</Text>
      </Box>

      {/* Right Main Area */}
      <Box flexDirection="column" flexGrow={1} marginLeft={1}>
        {/* Title ASCII */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold>
{`
   _____ _____ _____ _____ _      
  / ____|_   _/ ____|_   _| |     
 | (___   | || |  __  | | | |     
  \\___ \\  | || | |_ | | | | |     
  ____) |_| || |__| |_| |_| |____ 
 |_____/|_____\\_____|_____|______|
`}
          </Text>
        </Box>
        
        <Text color="red">Explore what's possible with Sigil</Text>
        <Text>Use arrow keys to navigate and hit <Text color="red">&lt;Return&gt;/&lt;Enter&gt;</Text> to select an option.</Text>
        
        {/* Agent List */}
        <Box borderStyle="single" flexDirection="column" flexGrow={1} paddingX={1} marginTop={1}>
          {agents.length === 0 ? (
            <Text dimColor>No agents found. Run \`sigil agent create\` in another terminal.</Text>
          ) : (
            agents.map((agent) => {
              const isActive = agent.id === activeAgent?.id;
              return (
                <Text key={agent.id} color={isActive ? 'white' : 'gray'}>
                  <Text color="red">{isActive ? '> ' : '  '}</Text>
                  {agent.name} <Text dimColor>| {agent.status}</Text>
                </Text>
              );
            })
          )}
        </Box>

        {/* Action Panel / Chat */}
        <Box borderStyle="single" flexDirection="column" height={10} paddingX={1}>
          {activeAgent ? (
            <>
              <Text bold color="red">{activeAgent.name} <Text color="gray">| Active Agent</Text></Text>
              <Text>Agent ID: {activeAgent.id}</Text>
              <Box height={1} />
              <Box flexDirection="row" marginBottom={1}>
                <Text color="white" backgroundColor="red"> View Logs </Text>
                <Text> | </Text>
                <Text> Pause </Text>
                <Text> | </Text>
                <Text> Delete Agent </Text>
              </Box>
              <ChatInput activeAgent={activeAgent} />
            </>
          ) : (
            <Text dimColor>Select an agent above.</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
