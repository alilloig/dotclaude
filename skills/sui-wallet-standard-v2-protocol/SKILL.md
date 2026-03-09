---
name: sui-wallet-standard-v2-protocol
description: |
  Fix for custom Sui wallets (mock wallets, test wallets, Playwright wallets) that
  send empty transaction bytes or fail silently when used with dApp Kit v2
  (@mysten/dapp-kit-react, @mysten/dapp-kit-core). Use when: (1) signAndExecuteTransaction
  receives empty Uint8Array or empty string for transaction bytes, (2) wallet bridge
  gets "invalid transaction: error converting from protobuf: field: bcs reason: FIELD_INVALID
  description: unexpected end of input", (3) custom wallet worked with dApp Kit v1 but
  breaks with v2, (4) building a mock/test wallet for Sui dApp testing. Covers the
  toJSON() wrapper protocol, Transaction building from JSON, TransactionResult discriminated
  union unwrapping, and Wallet Standard v2 response format.
author: Claude Code
version: 1.0.0
date: 2026-03-09
---

# Sui Wallet Standard v2 Protocol for Custom Wallets

## Problem

Custom Sui wallets (test wallets, mock wallets for Playwright/E2E testing) that were built
for dApp Kit v1 break silently when used with dApp Kit v2. The wallet's
`signAndExecuteTransaction` feature receives what appears to be empty transaction bytes,
causing transaction execution to fail with a cryptic protobuf error.

## Context / Trigger Conditions

- **Error message**: `invalid transaction: error converting from protobuf: field: bcs reason: FIELD_INVALID description: unexpected end of input`
- **Symptom**: Wallet bridge function receives `txBase64` as an empty string (length 0)
- **Symptom**: Transaction bytes are `Uint8Array(0)` when they should contain BCS data
- **Symptom**: Custom wallet worked with `@mysten/dapp-kit` v1 but fails with `@mysten/dapp-kit-react` v2
- **Context**: Building or maintaining a mock Sui wallet for E2E testing (e.g., with Playwright)

## Root Cause

dApp Kit v2 changed how it passes transactions to wallet features. Instead of pre-built
BCS bytes, it now passes a **wrapper object** with a `toJSON()` method:

```javascript
// What dApp Kit v2 actually passes to the wallet feature:
const transactionWrapper = {
  toJSON: async () => {
    transaction.setSenderIfNotSet(account.address);
    return await transaction.toJSON({ client: suiClient, supportedIntents });
  }
};

// Passes this wrapper, NOT raw bytes:
walletFeature.signAndExecuteTransaction({
  transaction: transactionWrapper,  // Object, not Uint8Array
  account, chain
});
```

Old wallet code that does `typeof transaction === 'string'` or `transaction instanceof Uint8Array`
falls to the else branch: `new Uint8Array(wrapperObject)` produces an empty Uint8Array,
which becomes an empty base64 string.

## Solution

### Step 1: Handle the toJSON() wrapper in the browser-side wallet

The wallet's `signAndExecuteTransaction` feature must detect and call `toJSON()`:

```javascript
// Add this helper to the wallet inject script
function resolveTransactionToBase64(transaction) {
  if (typeof transaction === 'string') {
    return Promise.resolve(transaction);
  }
  if (transaction instanceof Uint8Array) {
    return Promise.resolve(uint8ArrayToBase64(transaction));
  }
  // dApp Kit v2: wrapper object with toJSON() method
  if (transaction && typeof transaction.toJSON === 'function') {
    return Promise.resolve(transaction.toJSON()).then(function(result) {
      if (typeof result === 'string') return result;
      if (result instanceof Uint8Array) return uint8ArrayToBase64(result);
      return uint8ArrayToBase64(new Uint8Array(result));
    });
  }
  // Fallback
  return Promise.resolve(uint8ArrayToBase64(new Uint8Array(transaction)));
}

// Use in wallet features:
// 'sui:signAndExecuteTransaction': {
//   version: '2.0.0',
//   signAndExecuteTransaction: function(input) {
//     return resolveTransactionToBase64(input.transaction).then(function(txData) {
//       return bridge.signAndExec(txData).then(function(resultJson) {
//         return JSON.parse(resultJson);
//       });
//     });
//   },
// },
```

### Step 2: Handle JSON transaction input on the signing side

`toJSON()` returns a **JSON string** (not base64 BCS bytes). The signing side must detect
JSON and build the transaction:

```typescript
import { Transaction } from '@mysten/sui/transactions';

async function buildTransaction(
  input: string,
  client: SuiGrpcClient,
): Promise<Uint8Array> {
  const isJson = input.trimStart().startsWith('{');
  if (isJson) {
    const tx = Transaction.from(input);
    return await tx.build({ client });
  }
  // Legacy: already base64 BCS bytes
  return fromBase64(input);
}
```

### Step 3: Return Wallet Standard v2 response format

dApp Kit v2 expects this exact response shape from `signAndExecuteTransaction`:

```typescript
// { digest, bytes, signature, effects } - all strings (base64 where applicable)
```

dApp Kit accesses these with `fromBase64()`:
```javascript
const transactionBytes = fromBase64(result.bytes);
const effectsBytes = fromBase64(result.effects);
```

### Step 4: Unwrap the gRPC TransactionResult

`SuiGrpcClient.executeTransaction()` returns a **discriminated union**, not a flat object:

```typescript
// Must unwrap:
const result = await client.executeTransaction({
  transaction: bytes,
  signatures: [signature],
  include: { effects: true },  // Required to get effects.bcs
});

const tx = result.$kind === 'Transaction'
  ? result.Transaction
  : result.FailedTransaction;

// Build wallet standard response:
const response = {
  digest: tx.digest,
  bytes: toBase64(builtBcsBytes),
  signature: signature,
  effects: tx.effects?.bcs ? toBase64(tx.effects.bcs) : '',
};
```

### Step 5: Update signTransaction similarly

The `sui:signTransaction` feature also receives the `toJSON()` wrapper. Update it to
resolve the wrapper and return built BCS bytes (not the JSON string) in the `bytes` field.

## Verification

1. The wallet bridge receives non-empty transaction data (JSON string, ~1000+ chars)
2. Transaction builds successfully (`Transaction.from(json).build({ client })`)
3. Transaction executes on testnet without protobuf errors
4. dApp Kit receives `{ digest, bytes, signature, effects }` and processes it correctly
5. React Query mutations complete without errors

## Example

Complete flow for a Playwright test wallet:

```
Browser (inject.ts)           Node.js (manager.ts)

1. dApp Kit calls wallet
   signAndExecuteTransaction
   with { transaction: wrapper }

2. resolveTransactionToBase64()
   calls wrapper.toJSON()
   gets JSON string

3. Sends JSON via bridge         4. Detects JSON input
                                    Transaction.from(json)
                                    tx.build({ client })
                                    produces BCS bytes

                                 5. Signs BCS bytes
                                    keypair.signTransaction(bytes)

                                 6. Executes on chain
                                    client.executeTransaction(...)

                                 7. Unwraps discriminated union
                                    result.Transaction.digest
                                    result.Transaction.effects.bcs

8. Receives JSON response        8. Returns wallet standard v2:
   { digest, bytes,                 { digest, bytes, signature,
     signature, effects }             effects }

9. Returns to dApp Kit
   which calls fromBase64()
   on bytes and effects
```

## Notes

- The `toJSON()` change is NOT documented in the dApp Kit migration guide as of 2026-03
- This affects ALL custom wallets, not just test wallets
- The `signTransaction` feature has the same wrapper protocol
- Request `include: { effects: true }` from `executeTransaction` to get `effects.bcs`
- Without `effects: true`, `tx.effects` is `undefined` and dApp Kit fails on `fromBase64(result.effects)`
- The `Transaction.from()` method accepts JSON strings and reconstructs unresolved transactions
- `tx.build({ client })` resolves object references and produces BCS bytes

## See Also

- `sui-2-migration-audit` — Audits codebase for Sui SDK 2.0 migration completeness
- `sui-balance-json-parsing` — Parsing balance responses from gRPC vs JSON-RPC
- `sui-vector-u8-base64-parsing` — Format differences between gRPC and JSON-RPC clients
