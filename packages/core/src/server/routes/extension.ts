import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Router } from 'express';
import { agentManager } from '../../agent/AgentManager.js';
import { getRpcUrl } from '../../lib/Config.js';
import { getKeypair } from '../../wallet/Wallet.js';

export const extensionRouter: Router = Router();

function getConnection(): Connection {
  return new Connection(getRpcUrl(), 'confirmed');
}

// POST /api/extension/connect
extensionRouter.post('/connect', (req, res) => {
  try {
    const mainAgent = agentManager.getMainAgent();
    if (!mainAgent || !mainAgent.pubkey) {
      res.status(404).json({ message: 'No active agent found', data: null });
      return;
    }
    
    // Return pubkey and name to the extension
    res.json({ message: 'Success', data: { publicKey: mainAgent.pubkey, name: mainAgent.name } });
  } catch (err: any) {
    res.status(500).json({ message: err.message, data: null });
  }
});

// GET /api/extension/portfolio
extensionRouter.get('/portfolio', async (req, res) => {
  try {
    const mainAgent = agentManager.getMainAgent();
    if (!mainAgent || !mainAgent.pubkey) {
      res.status(404).json({ message: 'No active agent found', data: null });
      return;
    }

    const connection = getConnection();
    const pubkey = new PublicKey(mainAgent.pubkey);

    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / 1e9;

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );

    const tokens = tokenAccounts.value.map((ta) => {
      const info = ta.account.data.parsed.info;
      return {
        address: ta.pubkey.toBase58(),
        mint: info.mint,
        balance: info.tokenAmount.uiAmount ?? 0,
        decimals: info.tokenAmount.decimals,
        symbol: info.tokenAmount.uiAmountString,
      };
    });

    res.json({
      message: 'Success',
      data: {
        sol: solBalance,
        solLamports: balance,
        tokens,
        pubkey: mainAgent.pubkey,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message, data: null });
  }
});

// GET /api/extension/transactions
extensionRouter.get('/transactions', async (req, res) => {
  try {
    const mainAgent = agentManager.getMainAgent();
    if (!mainAgent || !mainAgent.pubkey) {
      res.status(404).json({ message: 'No active agent found', data: null });
      return;
    }

    const connection = getConnection();
    const pubkey = new PublicKey(mainAgent.pubkey);
    const limit = 20;

    const signatures = await connection.getSignaturesForAddress(pubkey, { limit });

    const transactions = signatures.map((s) => ({
      signature: s.signature,
      blockTime: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
      slot: s.slot,
      status: s.confirmationStatus,
      err: s.err,
      memo: s.memo,
    }));

    res.json({ message: 'Success', data: transactions });
  } catch (error: any) {
    res.status(500).json({ message: error.message, data: null });
  }
});

// POST /api/extension/simulate
extensionRouter.post('/simulate', async (req, res) => {
  try {
    const { transactionMessage, origin } = req.body;
    const mainAgent = agentManager.getMainAgent();
    
    if (!mainAgent) {
      res.status(404).json({ message: 'No active agent found', data: null });
      return;
    }

    if (!transactionMessage) {
       res.status(400).json({ message: 'Transaction message required', data: null });
       return;
    }

    // Decode the base64 transaction string
    const txBuffer = Buffer.from(transactionMessage, 'base64');
    let decodedTx: Transaction | VersionedTransaction;
    let instructionsSummary = '';

    try {
      // Try parsing as a VersionedTransaction first, fallback to standard Transaction
      try {
         decodedTx = VersionedTransaction.deserialize(txBuffer);
         instructionsSummary = `Versioned Transaction containing ${decodedTx.message.compiledInstructions.length} instructions.`;
      } catch (e) {
         decodedTx = Transaction.from(txBuffer);
         instructionsSummary = decodedTx.instructions.map((ix, i) => 
            `Instruction ${i + 1}: Program=${ix.programId.toBase58()} Keys=${ix.keys.map(k=>k.pubkey.toBase58()).join(', ')}`
         ).join('\n');
      }
    } catch (e: any) {
      console.error(`[Extension API] Failed to decode transaction for simulation:`, e);
      return res.status(400).json({ message: 'Failed to decode transaction buffer: ' + e.message, data: null });
    }

    console.log(`[Extension API] Passing transaction to Agent '${mainAgent.name}' for risk analysis...`);
    // Ask the agent to analyze the transaction
    const prompt = `A dApp at ${origin} is requesting the user to sign a Solana transaction.
Here is the raw breakdown of the transaction instructions:

${instructionsSummary}

Please analyze this transaction. Is it safe to sign? If it looks like a standard SOL or Token transfer, a swap, or a standard program interaction without malicious intent, approve it. 
Explain your reasoning clearly and concisely to the user.
End your response with exactly "DECISION: APPROVED" or "DECISION: REJECTED".`;

    let agentAnalysis = "Analysis failed.";
    let status = 'rejected';

    try {
        const agentResponse = await agentManager.invoke(mainAgent.id, prompt);
        const text = agentResponse.response;
        
        // Extract the decision
        if (text.includes('DECISION: APPROVED')) {
            status = 'approved';
            agentAnalysis = text.replace('DECISION: APPROVED', '').trim();
        } else if (text.includes('DECISION: REJECTED')) {
            status = 'rejected';
            agentAnalysis = text.replace('DECISION: REJECTED', '').trim();
        } else {
            status = 'rejected';
            agentAnalysis = text + "\n\n(Agent failed to provide a conclusive DECISION indicator. Defaulting to rejected for safety.)";
        }
    } catch (e: any) {
        console.error(`[Extension API] Agent evaluation failed:`, e);
        agentAnalysis = `Agent failed to analyze transaction: ${e.message}`;
    }

    console.log(`[Extension API] Evaluation complete. Status: ${status}, Risk: ${status === 'approved' ? 'LOW' : 'HIGH'}`);
    const riskLevel = status === 'approved' ? 'LOW' : 'HIGH';

    res.json({
        status, 
        analysis: agentAnalysis,
        riskLevel
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message, data: null });
  }
});

// POST /api/extension/sign
extensionRouter.post('/sign', async (req, res) => {
  try {
    const { transactionMessage } = req.body;
    const mainAgent = agentManager.getMainAgent();
    
    if (!mainAgent) {
      res.status(404).json({ message: 'No active agent found', data: null });
      return;
    }

    if (!transactionMessage) {
       res.status(400).json({ message: 'Transaction message required', data: null });
       return;
    }

    console.log(`[Extension API] Received request to physically sign transaction by Agent '${mainAgent.name}'...`);
    
    const txBuffer = Buffer.from(transactionMessage, 'base64');
    let decodedTx: Transaction | VersionedTransaction;
    let finalTransactionBase64 = transactionMessage;

    try {
        const keypair = await getKeypair(mainAgent.name);
        console.log(`[Extension API] Successfully retrieved private key for agent '${mainAgent.name}' from keytar.`);
        
        try {
           decodedTx = VersionedTransaction.deserialize(txBuffer);
           decodedTx.sign([keypair]);
           finalTransactionBase64 = Buffer.from(decodedTx.serialize()).toString('base64');
        } catch (e) {
           decodedTx = Transaction.from(txBuffer);
           decodedTx.partialSign(keypair);
           finalTransactionBase64 = Buffer.from(decodedTx.serialize({ requireAllSignatures: false })).toString('base64');
        }
        console.log(`[Extension API] Transaction successfully signed by '${mainAgent.name}'. Returning payload to dApp.`);
    } catch (e: any) {
        console.error(`[Extension API] Signing failed:`, e);
        return res.status(500).json({ message: "Failed to sign transaction physically: " + e.message, data: null });
    }

    res.json({
        message: 'Success',
        data: {
          signedTransaction: finalTransactionBase64
        }
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message, data: null });
  }
});
