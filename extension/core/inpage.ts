import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { EventEmitter } from 'eventemitter3';


interface SigilProvider extends EventEmitter {
  isSigil: boolean;
  publicKey: { toBase58: () => string; toBytes: () => Uint8Array } | null;
  isConnected: boolean;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58: () => string; toBytes: () => Uint8Array } }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
}

class SigilWalletProvider extends EventEmitter implements SigilProvider {
  isSigil = true;
  publicKey: { toBase58: () => string; toBytes: () => Uint8Array } | null = null;
  isConnected = false;

  constructor() {
    super();
    window.addEventListener('message', this._handleMessage.bind(this));
  }

  private _handleMessage(event: MessageEvent) {
    if (event.source !== window || event.data.target !== 'sigil-inpage') return;

    if (event.data.method === 'connected') {
      this._setPublicKey(event.data.publicKey);
      this.emit('connect', this.publicKey);
    } else if (event.data.method === 'disconnected') {
      this.publicKey = null;
      this.isConnected = false;
      this.emit('disconnect');
    }
  }

  private _setPublicKey(pubkeyBase58: string) {
    const bytes = bs58.decode(pubkeyBase58);
    this.publicKey = {
      toBase58: () => pubkeyBase58,
      toBytes: () => Uint8Array.from(bytes) // Ensure it is a Uint8Array, not Buffer
    };
    this.isConnected = true;
  }

  private _request(method: string, params?: any): Promise<any> {
    console.log(`[Sigil Provider] Preparing request: ${method}`, params);
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();

      const handler = (event: MessageEvent) => {
        if (event.source !== window || event.data.target !== 'sigil-inpage' || event.data.id !== id) return;
        window.removeEventListener('message', handler);

        console.log(`[Sigil Provider] Received response for ${method} (${id}):`, event.data);

        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      window.addEventListener('message', handler);

      console.log(`[Sigil Provider] Posting message to window:`, { target: 'sigil-content', id, method, params });
      window.postMessage({
        target: 'sigil-content',
        id,
        method,
        params,
      }, window.location.origin);
    });
  }

  async connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58: () => string; toBytes: () => Uint8Array } }> {
    console.log(`[Sigil Provider] connect called with options:`, options);
    try {
      const res = await this._request('connect', options);
      console.log(`[Sigil Provider] _request('connect') resolved with:`, res);
      
      if (!res || !res.publicKey) {
          throw new Error("Invalid response from 'connect'. Missing publicKey. " + JSON.stringify(res));
      }

      this._setPublicKey(res.publicKey);
      this.emit('connect', this.publicKey);
      return { publicKey: this.publicKey! };
    } catch (e) {
      console.error(`[Sigil Provider] connect failed:`, e);
      throw e;
    }
  }
  async disconnect(): Promise<void> {
    await this._request('disconnect');
    this.publicKey = null;
    this.isConnected = false;
    this.emit('disconnect');
  }

  async signTransaction(transaction: any): Promise<any> {
    // We send base64 encoded transaction to the background script
    const serializedTx = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
    const res = await this._request('signTransaction', { 
        transactionMessage: Buffer.from(serializedTx).toString('base64') 
    });
    
    // The background script will return a base64 encoded signed transaction or signature.
    // For simplicity, assuming the background returns the full signed transaction in base64.
    const decodedTx = Buffer.from(res.signedTransaction, 'base64');
    
    // We modify the original transaction object if it's an old VersionedTransaction or Transaction
    if ('version' in transaction) {
       // @ts-ignore - this is a crude way to restore it, depending on web3.js version we might need `VersionedTransaction.deserialize`
       const tx = window.solanaWeb3.VersionedTransaction.deserialize(decodedTx);
       return tx;
    } else {
       // @ts-ignore
       const tx = window.solanaWeb3.Transaction.from(decodedTx);
       return tx;
    }
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
      throw new Error("signAllTransactions not implemented yet by Sigil");
  }

  async signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }> {
    throw new Error("signMessage not implemented yet by Sigil");
  }
}

// Ensure web3.js is available or not strictly required for injection
try {
  console.log("[Sigil Extension] Injecting window.sigil provider...");
  const provider = new SigilWalletProvider();
  Object.defineProperty(window, 'sigil', {
    value: provider,
    writable: false,
  });
  window.dispatchEvent(new Event('sigil#initialized'));
  console.log("[Sigil Extension] Successfully injected window.sigil provider.");
} catch (e) {
  console.error("[Sigil Extension] Failed to inject window.sigil provider:", e);
}
