import { Buffer } from "buffer"
import bs58 from "bs58"
import { EventEmitter } from "eventemitter3"

interface SigilProvider extends EventEmitter {
  isSigil: boolean
  publicKey: { toBase58: () => string; toBytes: () => Uint8Array } | null
  isConnected: boolean
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{
    publicKey: { toBase58: () => string; toBytes: () => Uint8Array }
  }>
  disconnect(): Promise<void>
  signTransaction(transaction: any): Promise<any>
  signAllTransactions(transactions: any[]): Promise<any[]>
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>
}

class SigilWalletProvider extends EventEmitter implements SigilProvider {
  isSigil = true
  publicKey: { toBase58: () => string; toBytes: () => Uint8Array } | null = null
  isConnected = false

  constructor() {
    super()
    window.addEventListener("message", this._handleMessage.bind(this))
  }

  private _handleMessage(event: MessageEvent) {
    if (event.source !== window || event.data.target !== "sigil-inpage") return

    if (event.data.method === "connected") {
      this._setPublicKey(event.data.publicKey)
      this.emit("connect", this.publicKey)
    } else if (event.data.method === "disconnected") {
      this.publicKey = null
      this.isConnected = false
      this.emit("disconnect")
    } else if (event.data.method === "accountChanged") {
      // Agent was switched in the extension
      const newPubkey = event.data.data?.publicKey
      console.log(
        "[Sigil Provider] Account changed received:",
        newPubkey,
        "current:",
        this.publicKey?.toBase58()
      )
      if (newPubkey && newPubkey !== this.publicKey?.toBase58()) {
        this._setPublicKey(newPubkey)
        console.log(
          "[Sigil Provider] Emitting accountChanged event with new pubkey:",
          this.publicKey?.toBase58()
        )
        this.emit("accountChanged", this.publicKey)
      }
    }
  }

  private _setPublicKey(pubkeyBase58: string) {
    const bytes = bs58.decode(pubkeyBase58)
    this.publicKey = {
      toBase58: () => pubkeyBase58,
      toBytes: () => Uint8Array.from(bytes) // Ensure it is a Uint8Array, not Buffer
    }
    this.isConnected = true
  }

  private _request(method: string, params?: any): Promise<any> {
    console.log(`[Sigil Provider] Preparing request: ${method}`, params)
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID()

      const handler = (event: MessageEvent) => {
        if (
          event.source !== window ||
          event.data.target !== "sigil-inpage" ||
          event.data.id !== id
        )
          return
        window.removeEventListener("message", handler)

        console.log(
          `[Sigil Provider] Received response for ${method} (${id}):`,
          event.data
        )

        if (event.data.error) {
          reject(new Error(event.data.error))
        } else {
          resolve(event.data.result)
        }
      }

      window.addEventListener("message", handler)

      console.log(`[Sigil Provider] Posting message to window:`, {
        target: "sigil-content",
        id,
        method,
        params
      })
      window.postMessage(
        {
          target: "sigil-content",
          id,
          method,
          params
        },
        window.location.origin
      )
    })
  }

  async connect(options?: { onlyIfTrusted?: boolean }): Promise<{
    publicKey: { toBase58: () => string; toBytes: () => Uint8Array }
  }> {
    console.log(`[Sigil Provider] connect called with options:`, options)
    try {
      const res = await this._request("connect", options)
      console.log(`[Sigil Provider] _request('connect') resolved with:`, res)

      if (!res || !res.publicKey) {
        throw new Error(
          "Invalid response from 'connect'. Missing publicKey. " +
            JSON.stringify(res)
        )
      }

      this._setPublicKey(res.publicKey)
      this.emit("connect", this.publicKey)
      return { publicKey: this.publicKey! }
    } catch (e) {
      console.error(`[Sigil Provider] connect failed:`, e)
      throw e
    }
  }
  async disconnect(): Promise<void> {
    await this._request("disconnect")
    this.publicKey = null
    this.isConnected = false
    this.emit("disconnect")
  }

  async signTransaction(transaction: any): Promise<any> {
    console.log(
      `[Sigil Provider] signTransaction called. TX type: ${transaction.constructor?.name}, has version: ${"version" in transaction}`
    )

    // Serialize the transaction to send to the background script
    let serializedTx: Uint8Array
    try {
      serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      })
      console.log(
        `[Sigil Provider] Serialized as legacy Transaction (${serializedTx.length} bytes).`
      )
    } catch (e) {
      // VersionedTransaction.serialize() accepts no args
      console.log(
        `[Sigil Provider] Legacy serialize failed, trying VersionedTransaction serialize...`
      )
      serializedTx = transaction.serialize()
      console.log(
        `[Sigil Provider] Serialized as VersionedTransaction (${serializedTx.length} bytes).`
      )
    }

    const base64Tx = Buffer.from(serializedTx).toString("base64")
    console.log(
      `[Sigil Provider] Sending base64 TX (${base64Tx.length} chars) to background...`
    )

    const res = await this._request("signTransaction", {
      transactionMessage: base64Tx
    })

    console.log(
      `[Sigil Provider] Received response from background:`,
      JSON.stringify(res).substring(0, 200)
    )

    if (!res || !res.signedTransaction) {
      console.error(`[Sigil Provider] No signedTransaction in response:`, res)
      throw new Error(
        "Signing failed: No signed transaction returned from Sigil."
      )
    }

    // Return the raw signed bytes as a Uint8Array — the calling dApp will
    // deserialize using its own @solana/web3.js (we can't import it here
    // because this script runs in the page's MAIN world, not the extension).
    const signedBytes = Uint8Array.from(
      Buffer.from(res.signedTransaction, "base64")
    )
    console.log(
      `[Sigil Provider] Returning signed TX buffer (${signedBytes.length} bytes) to dApp.`
    )

    // Mutate the original transaction object with the signed data.
    // This works because Transaction.from() / VersionedTransaction.deserialize()
    // are on the dApp's @solana/web3.js, and the constructor is known.
    const txConstructor = transaction.constructor
    if (txConstructor && typeof txConstructor.from === "function") {
      // Legacy Transaction
      const signed = txConstructor.from(signedBytes)
      console.log(
        `[Sigil Provider] Deserialized signed legacy Transaction via constructor.from().`
      )
      return signed
    } else if (
      txConstructor &&
      typeof txConstructor.deserialize === "function"
    ) {
      // VersionedTransaction
      const signed = txConstructor.deserialize(signedBytes)
      console.log(
        `[Sigil Provider] Deserialized signed VersionedTransaction via constructor.deserialize().`
      )
      return signed
    }

    // Fallback: return a plain object with the signed bytes for the dApp to handle
    console.log(
      `[Sigil Provider] Could not find constructor methods, returning raw signedTransaction.`
    )
    return { signedTransaction: res.signedTransaction, signedBytes }
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    throw new Error("signAllTransactions not implemented yet by Sigil")
  }

  async signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }> {
    throw new Error("signMessage not implemented yet by Sigil")
  }
}

// Ensure web3.js is available or not strictly required for injection
try {
  console.log("[Sigil Extension] Injecting window.sigil provider...")
  const provider = new SigilWalletProvider()
  Object.defineProperty(window, "sigil", {
    value: provider,
    writable: false
  })
  window.dispatchEvent(new Event("sigil#initialized"))
  console.log("[Sigil Extension] Successfully injected window.sigil provider.")
} catch (e) {
  console.error("[Sigil Extension] Failed to inject window.sigil provider:", e)
}
