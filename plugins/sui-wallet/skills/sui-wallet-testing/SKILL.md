---
name: sui-wallet-testing
description: |
  Domain knowledge for testing Sui dApps with a mock wallet via MCP tools. Use when:
  (1) the user says "sui wallet", "mock wallet", "test wallet", "dapp testing",
  (2) the user wants to interact with a Sui dApp in a browser,
  (3) the user asks about wallet standard testing or wallet injection,
  (4) the user is debugging wallet connection or transaction signing issues,
  (5) the user wants to compose wallet tools into their own MCP server.
allowed-tools:
  - "mcp__sui-wallet__*"
author: alilloig
version: 1.0.0
date: 2026-03-12
---

# Sui Wallet Testing — Domain Knowledge

## Architecture: The Bridge Pattern

The mock wallet uses a **bridge pattern** where the private key never leaves Node.js:

```
Node.js (Playwright)              Browser (Chromium)
┌──────────────────┐              ┌──────────────────────┐
│ WalletManager    │              │ Mock Wallet (Wallet   │
│ ├─ Ed25519Keypair│◄─────────────│ Standard compliant)  │
│ ├─ SuiClient     │ exposeFunction│ ├─ sui:signTx       │
│ └─ sign/execute  │              │ ├─ sui:signAndExec   │
└──────────────────┘              │ └─ sui:signMsg       │
                                  │                      │
                                  │ dApp Kit discovers   │
                                  │ wallet via standard  │
                                  │ registration events  │
                                  └──────────────────────┘
```

**Key constraint**: `page.exposeFunction()` binds signing bridges to a specific Playwright `Page`. The wallet injection script runs in that page's context. This means the MCP server that controls the browser MUST be the same process that owns the wallet.

## MCP Tool Usage

### Standalone Server (19 tools)

The `sui-wallet` MCP server provides 15 browser tools + 4 wallet tools in one process. Use the `/sui-wallet` command for guided setup, or call tools directly:

**Required sequence:**
1. `wallet_setup` — creates keypair, launches browser, injects wallet, navigates to dApp
2. `wallet_connect` — clicks Connect, selects mock wallet, verifies connection
3. Use `browser_*` tools to interact with the dApp
4. `wallet_disconnect` — cleanup when done

**Important:** Do NOT use this server alongside `@playwright/mcp` or any other browser MCP plugin. They would create separate browser instances and break the wallet bridge.

### Composable API (4 wallet tools)

For adding wallet tools to an existing MCP server:

```typescript
import { registerWalletTools } from 'sui-playwright-wallet/mcp';

// Simple: just pass a getPage callback
registerWalletTools(server, () => myPage);

// With options: auto-navigate + default network
registerWalletTools(server, {
  getPage: () => myPage,
  dappUrl: 'http://localhost:5173',
  defaultNetwork: 'localnet',
});
```

The host MCP server must provide the `Page` — this is how you share a browser between your browser tools and the wallet tools.

## Network Guidance

| Network | Requirements | Notes |
|---------|-------------|-------|
| `localnet` | `sui start` running | Auto-funds wallet via faucet |
| `devnet` | Internet access | May need manual funding |
| `testnet` | Internet access | May need manual funding |
| `mainnet` | Internet access + real SUI | **Use with caution** |

## Wallet Standard Registration

The injection script uses a two-phase registration protocol:
- **Phase 1**: Listens for `wallet-standard:app-ready` (handles case where dApp Kit loads after wallet)
- **Phase 2**: Dispatches `wallet-standard:register-wallet` (handles case where dApp Kit already loaded)

This ensures the wallet is discovered regardless of script load order.

## Common Issues

### dApp Kit not detecting the wallet
- Wallet must be injected BEFORE `page.goto()` (standalone server handles this automatically)
- The wallet name is hardcoded to `"Playwright Test Wallet"` — `walletName` parameter in `wallet_connect` must match

### Connection timing
- Some dApps don't show a wallet selection modal (auto-connect to single wallet)
- The `wallet_connect` tool handles this gracefully — modal click failure is non-fatal

### Transaction signing fails
- Ensure the dApp and wallet are on the same network
- Check that the dApp uses `@mysten/dapp-kit-react` v2 (Wallet Standard v2 protocol)
- The wallet handles both JSON (from `.toJSON()`) and base64 BCS transaction formats

### Custom dApp UI selectors
If the dApp doesn't use standard `data-testid` attributes, pass custom selectors to `wallet_connect`:
```json
{
  "connectSelector": "#my-connect-btn",
  "walletSelector": "text=Playwright Test Wallet",
  "connectedSelector": ".wallet-connected"
}
```

## Playwright Test Fixtures

For writing Playwright tests (not MCP), the npm package provides fixtures:

```typescript
import { test, expect } from 'sui-playwright-wallet/fixtures';

test('sign transaction', async ({ connectedPage, wallet }) => {
  // connectedPage has wallet injected + connected
  // wallet is the WalletManager instance
  await connectedPage.click('[data-testid="sign-tx-button"]');
});
```
