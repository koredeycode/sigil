import { Router } from 'express';
import { agentManager } from '../../agent/AgentManager.js';

export const extensionRouter: Router = Router();

// POST /api/extension/connect
extensionRouter.post('/connect', (req, res) => {
  try {
    const mainAgent = agentManager.getMainAgent();
    if (!mainAgent || !mainAgent.pubkey) {
      res.status(404).json({ message: 'No active agent found', data: null });
      return;
    }
    
    // Return pubkey to the extension
    res.json({ message: 'Success', data: { publicKey: mainAgent.pubkey } });
  } catch (err: any) {
    res.status(500).json({ message: err.message, data: null });
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

    // Decode the transaction (For now, we just mock the analysis step until we implement the full LLM decoding)
    // In a full implementation, we would deserialize `transactionMessage` using @solana/web3.js, extract instructions, 
    // and pass them to the LangGraph node or a direct LLM call.
    
    // Mock simulation response
    const agentAnalysis = `I have reviewed the transaction requested by ${origin || 'an unknown dApp'}. It appears to be a standard Solana interaction. However, please verify the exact amounts in your dApp before approving.`;
    const riskLevel = 'LOW';

    // We send back the "analysis" and we pretend it's "approved" (i.e. we don't block it automatically)
    // To actually SIGN it, we would need to pass it to the Signer. For now, since signTransaction 
    // expects a signed payload back immediately, we will mock the return or instruct the user to use the UI.

    // *DUMMY IMPLEMENTATION FOR TESTING THE PIPELINE*
    res.json({
        status: 'approved', // Or 'rejected' if guardrails fail
        analysis: agentAnalysis,
        riskLevel,
        // We'll just return the original payload back for now as a mock "signed" payload
        signedTransaction: transactionMessage 
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message, data: null });
  }
});
