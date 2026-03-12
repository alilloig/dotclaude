---
name: wallet-standard-late-registration
description: |
  Register a custom Sui wallet (mock wallet, test wallet, Playwright wallet) with the
  wallet-standard protocol so dApp Kit discovers it in the Connect Wallet modal. Use when:
  (1) custom wallet injects window functions but doesn't appear in dApp Kit's connect modal,
  (2) dApp Kit only shows "Sui Wallet" (a recommended static entry) not your injected wallet,
  (3) wallet_connect reports success but dApp Kit UI doesn't update,
  (4) building a test/mock wallet that needs to work with @mysten/dapp-kit v0.14 or
  @mysten/dapp-kit-react v2. Covers the wallet-standard event callback pattern,
  wallet object structure, and late registration after dApp Kit has already initialized.
author: Claude Code
version: 1.0.0
date: 2026-03-10
---

# Wallet-Standard Late Registration for Custom Sui Wallets

## Problem

Custom Sui wallets (test wallets, Playwright wallets, mock wallets) that inject
functions into the browser page are invisible to dApp Kit's Connect Wallet modal.
dApp Kit only discovers wallets registered through the `@wallet-standard/app` protocol.
Without proper registration, the wallet appears to "connect" at the low level but
dApp Kit never reflects the connection in its React state.

## Context / Trigger Conditions

- **Symptom**: Connect Wallet modal shows only "Sui Wallet" (a static recommended entry)
  but not your custom/test wallet
- **Symptom**: Programmatic connection reports `connected: true` but dApp Kit UI still
  shows "Connect Wallet"
- **Symptom**: Wallet info exists on window but dApp Kit can't see the wallet
- **Symptom**: No wallet-standard symbols on `window`
- **Context**: Using sui-playwright-wallet MCP, or any custom wallet that injects functions
  without wallet-standard registration
- **Context**: `@mysten/dapp-kit` v0.14+ or `@mysten/dapp-kit-react` v2

## Root Cause

`@wallet-standard/app` (v1.1.0) uses an **event-based registration protocol**:

1. dApp Kit calls `getWallets()` which adds a listener for `wallet-standard:register-wallet`
2. dApp Kit dispatches `wallet-standard:app-ready` to notify pre-existing wallets
3. Late-arriving wallets must dispatch `wallet-standard:register-wallet` with a **callback**

The critical detail: the event's `detail` must be a **callback function** that receives
an `{ register }` API object. It is NOT the wallet object itself.

```javascript
// WRONG: detail is the wallet object (silently ignored)
window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {
  detail: wallet
}));

// CORRECT: detail is a callback that calls register()
window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {
  detail: (api) => api.register(wallet)
}));
```

This callback pattern exists because `getWallets()` wraps the `register` function
in its listener:

```javascript
// Inside @wallet-standard/app getWallets():
window.addEventListener('wallet-standard:register-wallet',
  ({ detail: callback }) => callback(api)
);
```

The registry is a **module-scoped singleton** inside `@wallet-standard/app` --
it is NOT stored on `window` via a Symbol or global. You cannot access it from
outside; you must use the event protocol.

## Solution

### Step 1: Create a wallet-standard compliant wallet object

```javascript
const account = {
  address: walletAddress,        // "0x..." Sui address
  publicKey: new Uint8Array(32), // Can be placeholder for connect
  chains: ['sui:localnet'],      // Match your target network
  features: [
    'sui:signTransaction',
    'sui:signAndExecuteTransaction',
  ],
};

const wallet = {
  name: 'My Test Wallet',
  icon: 'data:image/svg+xml;base64,...',  // Required: data URL
  version: '1.0.0',
  chains: ['sui:localnet'],
  accounts: [account],
  features: {
    'standard:connect': {
      version: '1.0.0',
      connect: async () => ({ accounts: [account] }),
    },
    'standard:disconnect': {
      version: '1.0.0',
      disconnect: async () => {},
    },
    'standard:events': {
      version: '1.0.0',
      on: (event, listener) => {
        return () => {}; // Return unsubscribe function
      },
    },
    'sui:signTransaction': {
      version: '2.0.0',
      signTransaction: async (input) => {
        // Bridge to your actual signing implementation
        return yourSigningFunction(input.transaction);
      },
    },
    'sui:signAndExecuteTransaction': {
      version: '2.0.0',
      signAndExecuteTransaction: async (input) => {
        return yourSignAndExecFunction(input.transaction);
      },
    },
  },
};
```

### Step 2: Register using the callback event pattern

```javascript
window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {
  detail: (api) => {
    api.register(wallet);
  },
}));
```

### Step 3: Trigger after page navigation

The wallet must be registered after each page navigation because the dApp Kit
listener is set up during app initialization. For Playwright/MCP test wallets,
register after `wallet_setup` and `browser_navigate`.

dApp Kit's `autoConnect` prop will automatically connect a previously-used
wallet on page load, so you only need to click Connect once per session.

## Verification

1. Open the Connect Wallet modal -- your wallet name appears in the list
2. Click your wallet -- the modal closes and the address appears in the header
3. dApp Kit's `useCurrentAccount()` returns the wallet's account

## Notes

- If you register the wallet twice, dApp Kit shows duplicate entries in the
  modal. Use a unique `name` to avoid confusion.
- The `icon` field is required and must be a data URL (not a regular URL).
- The `version` in features like `sui:signTransaction` should be `'2.0.0'`
  for both dApp Kit v1 and v2 compatibility.
- This pattern works with `@wallet-standard/app` v1.1.0+ (the version used
  by `@mysten/dapp-kit` v0.14 and `@mysten/dapp-kit-react` v2).

## See Also

- `sui-wallet-standard-v2-protocol` -- Fixes empty transaction bytes when the
  wallet IS registered but can't handle dApp Kit v2's toJSON() wrapper protocol
