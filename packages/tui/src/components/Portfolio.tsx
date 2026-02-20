import { Box, Text } from 'ink';
import { Agent } from '../hooks/useAgents.js';

import { useEffect, useState } from 'react';
import { useConfig } from '../context/ConfigContext.js';
import { ApiClient } from '../lib/api.js';

interface PortfolioProps {
  activeAgent: Agent | null;
}

interface Transaction {
  signature: string;
  amount: string;
  status: string;
}

export function Portfolio({ activeAgent }: PortfolioProps) {
  const { apiPort, authToken } = useConfig();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!activeAgent) return;
    const fetchWallet = async () => {
       try {
         const client = new ApiClient(apiPort, authToken);
         const res = await client.getWallet(activeAgent.id);
         if (res && Array.isArray(res.transactions)) {
            setTransactions(res.transactions.slice(0, 5).map((t: any) => ({
                signature: (t.signature || 'Pending').substring(0, 8) + '...',
                amount: t.amount ? t.amount.toString() : '-',
                status: t.status || 'unknown'
            })));
         }
       } catch (e) {}
    };
    fetchWallet();
  }, [activeAgent, apiPort, authToken]);

  if (!activeAgent) return null;

  return (
    <Box flexDirection="column" width="100%">
      <Box borderStyle="round" borderColor="yellow" flexDirection="column" paddingX={1} marginBottom={1}>
        <Text bold underline>Portfolio Balances</Text>
        <Box justifyContent="space-between">
          <Text>SOL:</Text>
          <Text color="green">0.00</Text>
        </Box>
        <Box justifyContent="space-between">
          <Text>USDC:</Text>
          <Text color="green">0.00</Text>
        </Box>
      </Box>

      <Box height={1} />
      <Text dimColor>--- RECENT TRANSACTIONS ---</Text>
      
      {transactions.length > 0 ? (
          <Box flexDirection="column" marginTop={1}>
             <Box flexDirection="row" borderBottom={false} borderStyle="single" paddingX={1}>
                <Box width="45%"><Text bold>Signature</Text></Box>
                <Box width="30%"><Text bold>Amount</Text></Box>
                <Box width="25%"><Text bold>Status</Text></Box>
             </Box>
             {transactions.map((t, idx) => (
                <Box key={idx} flexDirection="row" borderStyle="single" borderTop={false} borderBottom={false} paddingX={1}>
                   <Box width="45%"><Text color="gray">{t.signature}</Text></Box>
                   <Box width="30%"><Text color="yellow">{t.amount}</Text></Box>
                   <Box width="25%"><Text color={t.status === 'confirmed' ? 'green' : 'orange'}>{t.status}</Text></Box>
                </Box>
             ))}
             <Box flexDirection="row" borderStyle="single" borderTop={false} height={1}></Box>
          </Box>
      ) : (
          <Box marginTop={1}>
             <Text dimColor>No transactions found.</Text>
          </Box>
      )}
    </Box>
  );
}
