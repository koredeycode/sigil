# Sigil Capability Manifest (SKILLS.md)

This manifest provides a machine-readable description of Sigil's capabilities for external AI agents and swarms.

## Core Capabilities

- **DeFi Operations**: Token swaps via Jupiter aggregator, portfolio rebalancing, and price monitoring.
- **On-Chain Identity**: Programmatic wallet generation, isolated key management via OS Keychain.
- **Directive Engine**: Natural language rule translation into executable on-chain actions.
- **Safety Guardrails**: Hard-coded per-trade limits, slippage caps, and emergency kill switches.

## Tool Registry (Solana Devnet)

19 built-in tools available to all agents:

| Category | Tool | Description |
|----------|------|-------------|
| **Wallet** | `get_balance` | Check SOL and SPL token holdings |
| | `request_airdrop` | Get devnet SOL (max 2) |
| | `transfer_sol` | Send SOL to address |
| | `get_transaction_history` | Fetch recent on-chain transactions |
| | `get_token_accounts` | List all SPL token accounts |
| | `get_portfolio_snapshot` | Portfolio breakdown with percentages |
| | `get_account_info` | Fetch account metadata for any address |
| **SPL Tokens** | `create_token` | Create new SPL mint with optional metadata |
| | `mint_tokens` | Mint tokens (requires mint authority) |
| | `burn_tokens` | Burn tokens from wallet |
| | `transfer_token` | Send SPL tokens to another wallet |
| | `close_empty_token_accounts` | Close zero-balance accounts, reclaim rent |
| **Staking** | `stake_sol` | Delegate SOL to a validator |
| | `deactivate_stake` | Begin stake withdrawal cool-down |
| | `list_validators` | View active validators with stats |
| | `get_stake_positions` | View all stake accounts and status |
| **DeFi** | `swap_tokens` | Execute token swap via Jupiter aggregator |
| | `fetch_price` | Get real-time USD price for any token |
| **Utilities** | `send_memo` | Write on-chain memo message (max 566 bytes) |

## CLI Interface

- `sigil init`: Guided onboarding wizard.
- `sigil agent create`: Spawn new isolated agent.
- `sigil agent start`: Launch agent reasoning loop.
- `sigil logs --follow`: Stream daemon process logs in real-time.

## API Integration

- **API**: `http://localhost:7445`
- **WebSocket**: `ws://localhost:7445`
- **Documentation**: `https://sigil.ai/docs`
