# Sigil Agent Layer

The core "brain" of Sigil is powered by **LangGraph**. This module defines the state machine dictating an agent's autonomous loop, bridging LLM reasoning with programmatic tool execution on Solana Devnet.

## The Autonomous Loop

Each agent runs on an isolated `setInterval` (configured via `sigil config set --loop-interval`). During every tick, the LangGraph state machine executes the following nodes:

1. **Context Gathering** (`gather_context`): The agent retrieves its current state. This includes its custom natural language scenarios from SQLite, current SOL/Token balances, and any pending tool instructions.
2. **LLM Reasoning** (`agent_reasoning`): Context is passed into the chosen LLM Provider (OpenAI, Anthropic, Ollama, etc.). The agent determines if it needs to act based on its rules.
3. **Intent Generation**: The LLM output is parsed. If action is required, it returns a precise `Tool Call` (e.g., `swap_tokens(amount=10, tokenIn=USDC, tokenOut=SOL)`).
4. **Guardrails Validation** (`guardrail_validation`): Tool calls are intercepted. The Guardrails layer evaluates the intent against safety limits (daily volume, slippage, cool-downs). 
    - If `Failed`: The loop records the rejection and cycles back to reasoning.
5. **Execution** (`execute_tool`): If `Passed`, the intent is sent to the isolated **Wallet Layer** for Keytar-backed signing. The transaction is submitted to Devnet.

## Tool Registry

The Agent layer does *not* know how to sign transactions. It simply possesses a registry of capabilities mapping to custom on-chain handlers. The agent possesses exactly **19 tools** restricted to **Devnet only**. Tool categories include:

- **Wallet & Balance** (7 tools): `get_balance`, `request_airdrop`, `transfer_sol`, `get_transaction_history`, `get_token_accounts`, `get_portfolio_snapshot`, `get_account_info`
- **SPL Tokens** (5 tools): `create_token`, `mint_tokens`, `burn_tokens`, `transfer_token`, `close_empty_token_accounts`
- **Staking** (4 tools): `stake_sol`, `deactivate_stake`, `list_validators`, `get_stake_positions`
- **DeFi** (2 tools): `swap_tokens`, `fetch_price`
- **Utilities** (1 tool): `send_memo`

All tools run exclusively on **Solana Devnet**.
