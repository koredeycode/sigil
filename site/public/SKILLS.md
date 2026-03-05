# Sigil Capability Manifest (SKILLS.md)

This manifest provides a machine-readable description of Sigil's capabilities for external AI agents and swarms.

## Core Capabilities

- **DeFi Operations**: Token swaps (SPL Token Swap), liquidity provision, and portfolio rebalancing.
- **On-Chain Identity**: Programmatic wallet generation, isolated key management via Keychain.
- **Directive Engine**: Natural language rule translation into executable on-chain actions.
- **Safety Guardrails**: Hard-coded per-trade limits, slippage caps, and emergency kill switches.

## Tool Registry (Solana Devnet)

| Category | Tool | Description |
|----------|------|-------------|
| **Wallet** | `get_balance` | Check SOL and SPL holdings |
| | `request_airdrop` | Get devnet SOL (max 2) |
| | `transfer_sol` | Send SOL to address |
| **SPL Tokens** | `create_token` | Initialize new SPL mint |
| | `mint_tokens` | Mint to recipient |
| | `burn_tokens` | Remove tokens from supply |
| | `close_account`| Reclaim rent from empty accounts |
| **DeFi** | `create_pool` | Initialize SPL Token Swap pool |
| | `swap_tokens` | Execute on-chain trade |
| | `snapshot` | Portfolio allocation breakdown |

## CLI Interface

- `sigil init`: Guided onboarding wizard.
- `sigil agent create`: Spawn new isolated agent.
- `sigil agent start`: Launch agent reasoning loop.
- `sigil logs --follow`: Stream real-time thoughts.

## API Integration

- **API**: `http://localhost:7445`
- **WebSocket**: `ws://localhost:7445`
- **Documentation**: `https://sigil.ai/docs`
