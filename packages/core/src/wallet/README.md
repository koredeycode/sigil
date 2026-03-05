# Sigil Wallet Layer

This is the **ONLY** layer in the entire platform permitted to import `keytar`, retrieve private keys, and perform transaction signing using `@solana/web3.js`.

By strictly isolating this layer, we ensure that the AI Agent layer cannot accidentally or maliciously expose the private key to external networks or prompts. If the Kill Switch is triggered, this module immediately purges active `Keypair` instances from application memory.
