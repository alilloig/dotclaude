---
allowed-tools:
  - "mcp__sui-wallet__*"
description: "Set up and connect a mock Sui wallet for dApp testing"
argument-hint: "<dapp-url> [localnet|devnet|testnet|mainnet]"
---

# /sui-wallet Command

Set up a mock Sui wallet and connect it to a dApp for testing.

## Arguments

$ARGUMENTS contains the dApp URL and optional network. Parse as: `<dapp-url> [network]`

- If no URL is provided, ask the user for their dApp URL.
- If no network is provided, default to `localnet`.
- Valid networks: `localnet`, `devnet`, `testnet`, `mainnet`.

## Critical Constraint

**This MCP server owns the browser.** It creates and manages its own Playwright browser instance. Do NOT use alongside `@playwright/mcp` or any other browser-controlling MCP plugin — they would create separate browser instances and the wallet bridge would not work.

If the `playwright@claude-plugins-official` plugin is active, warn the user to disable it before proceeding.

## Execution Sequence

Follow this exact sequence:

### Step 1: Set up the wallet

Call `mcp__sui-wallet__wallet_setup` with:
```json
{
  "network": "<network from args, default 'localnet'>",
  "dappUrl": "<url from args>"
}
```

This will:
- Generate a random Ed25519 keypair (private key stays in Node.js)
- Launch a headless Chromium browser
- Inject a Wallet Standard-compliant mock wallet into the page
- Navigate to the dApp URL
- On localnet, auto-fund the wallet via faucet

Report the wallet address and network to the user.

### Step 2: Verify the page loaded

Call `mcp__sui-wallet__browser_snapshot` to confirm the dApp loaded correctly.

If the page shows an error or didn't load, suggest the user check:
- Is the dApp dev server running?
- Is the URL correct?
- For localnet: is `sui start` running?

### Step 3: Connect the wallet

Call `mcp__sui-wallet__wallet_connect` with default parameters (no arguments needed for standard dApp Kit apps).

If connection fails, suggest custom selectors:
```json
{
  "connectSelector": "button:has-text('Connect')",
  "walletName": "Playwright Test Wallet"
}
```

### Step 4: Confirm

Call `mcp__sui-wallet__wallet_state` to show the final state (address, network, balance, connected status).

Report success to the user with the wallet details. The browser is now ready for interaction via `browser_*` tools.

## After Setup

Once connected, the user can:
- Use `browser_*` tools to interact with the dApp (click, type, navigate, screenshot)
- The wallet will automatically sign any transactions the dApp requests
- Use `wallet_state` to check balance/status at any time
- Use `wallet_disconnect` when done

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Playwright Test Wallet" not in Connect modal | Injection timing issue | The wallet should be auto-detected; try `browser_navigate` to reload |
| Connect button click fails | Custom UI selectors | Pass `connectSelector` to `wallet_connect` |
| Faucet error on localnet | `sui start` not running | Start local Sui node first |
| Transaction signing fails | Network mismatch | Ensure dApp and wallet use same network |
