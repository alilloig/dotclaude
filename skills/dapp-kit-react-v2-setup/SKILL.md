---
name: dapp-kit-react-v2-setup
description: |
  Set up a React frontend with @mysten/dapp-kit-react v2 and @mysten/sui v2. Use when:
  (1) starting a new Sui dApp with dapp-kit-react v2, (2) "Module has no exported member
  SuiClientProvider" or "WalletProvider", (3) "Module has no exported member ConnectButton"
  from @mysten/dapp-kit-react, (4) "Property 'getOwnedObjects' does not exist on type
  ClientWithCoreApi", (5) Transaction #private type mismatch between @mysten/sui copies,
  (6) "Module '@mysten/sui/client' has no exported member 'SuiClient'" in v2. Covers the
  complete provider setup, correct import paths, and type workarounds for the v2 API.
author: Claude Code
version: 1.0.0
date: 2026-03-16
---

# dApp Kit React v2 Setup

## Problem

The `@mysten/dapp-kit-react` v2 (2.0.x) has a completely different API from v1 and from
the old `@mysten/dapp-kit`. Most tutorials and AI training data reference the v1 API
(SuiClientProvider, WalletProvider, useSuiClientQuery, etc.), which no longer exists.
Additionally, `@mysten/sui` v2 moved the JSON-RPC client from `@mysten/sui/client` to
`@mysten/sui/jsonRpc`.

## Context / Trigger Conditions

- Error: `Module '"@mysten/dapp-kit-react"' has no exported member 'SuiClientProvider'`
- Error: `Module '"@mysten/dapp-kit-react"' has no exported member 'ConnectButton'`
- Error: `Module '"@mysten/sui/client"' has no exported member 'SuiClient'`
- Error: `Property 'getOwnedObjects' does not exist on type 'ClientWithCoreApi'`
- Error: `Property '#private' in type 'Transaction' refers to a different member`
- Starting a new Sui dApp frontend with `@mysten/dapp-kit-react@^2.0.0`
- Migrating from `@mysten/dapp-kit` v1 to `@mysten/dapp-kit-react` v2

## Solution

### Package Dependencies

```json
{
  "@mysten/dapp-kit-react": "^2.0.1",
  "@mysten/sui": "^2.8.0",
  "@tanstack/react-query": "^5.62.16"
}
```

### Provider Setup (replaces SuiClientProvider + WalletProvider)

```tsx
import { type ReactNode } from 'react';
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const queryClient = new QueryClient();

const dAppKit = createDAppKit({
  networks: ['testnet', 'mainnet', 'devnet', 'localnet'],
  defaultNetwork: 'testnet',
  createClient(network) {
    // Cast needed: SuiJsonRpcClient satisfies ClientWithCoreApi at runtime
    // but TypeScript can't verify due to nested node_modules type paths
    return new SuiJsonRpcClient({
      url: getJsonRpcFullnodeUrl(network as 'testnet' | 'mainnet' | 'devnet' | 'localnet'),
      network,
    }) as any;
  },
});

// Required: register types for full TypeScript inference
declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}

export function SuiProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        {children}
      </DAppKitProvider>
    </QueryClientProvider>
  );
}
```

### Key Import Changes

| v1 (old) | v2 (new) |
|----------|----------|
| `import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'` | `import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react'` |
| `import { ConnectButton } from '@mysten/dapp-kit'` | `import { ConnectButton } from '@mysten/dapp-kit-react/ui'` |
| `import { useSuiClientQuery } from '@mysten/dapp-kit'` | `import { useCurrentClient } from '@mysten/dapp-kit-react'` + `import { useQuery } from '@tanstack/react-query'` |
| `import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'` | `import { useDAppKit } from '@mysten/dapp-kit-react'` then `dAppKit.signAndExecuteTransaction()` |
| `import { useCurrentAccount } from '@mysten/dapp-kit'` | `import { useCurrentAccount } from '@mysten/dapp-kit-react'` (same name) |
| `import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'` | `import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc'` |

### Querying Objects (replaces useSuiClientQuery)

```tsx
import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';

function MyComponent() {
  const client = useCurrentClient();

  const { data } = useQuery({
    queryKey: ['ownedCards', address],
    queryFn: () =>
      // Cast needed: useCurrentClient() returns ClientWithCoreApi,
      // which doesn't expose JSON-RPC methods directly
      (client as any).getOwnedObjects({
        owner: address,
        filter: { StructType: `${PACKAGE_ID}::card::Card` },
        options: { showContent: true },
      }),
    enabled: !!address,
  });
}
```

### Signing Transactions (replaces useSignAndExecuteTransaction)

```tsx
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useMutation } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';

function MyComponent() {
  const dAppKit = useDAppKit();

  const { mutateAsync } = useMutation({
    mutationFn: async () => {
      const tx = new Transaction();
      tx.moveCall({ target: '...', arguments: [...] });
      // Cast needed: Transaction type mismatch between @mysten/sui copies
      return dAppKit.signAndExecuteTransaction({ transaction: tx as any });
    },
  });
}
```

### Type Workaround: The `#private` Problem

The `as any` casts above are needed because `@mysten/dapp-kit-core` (nested inside
`@mysten/dapp-kit-react/node_modules`) declares its own types that reference `@mysten/sui`.
Even though there's only one physical copy of `@mysten/sui`, TypeScript resolves types from
two different `node_modules` paths and treats them as incompatible due to `#private` fields.

This is a known TypeScript/npm issue with no clean fix. The `as any` casts are safe because
the runtime types are identical. `skipLibCheck: true` in tsconfig does NOT help since the
errors are in your source files, not declaration files.

## Verification

```bash
# Zero TypeScript errors
npx tsc --noEmit

# Vite build succeeds
npx vite build
```

## Notes

- The `@tanstack/react-query` is still useful for data fetching even though dApp Kit v2
  doesn't require it — use `useQuery`/`useMutation` for your own RPC calls
- `ConnectButton` is in the `/ui` subpath, NOT the main export
- The `declare module` type registration is required for TypeScript to infer the correct
  types from hooks like `useDAppKit()`
- See also: `sui-2-migration-audit` for a comprehensive migration checklist

## References

- `@mysten/dapp-kit-react` v2 package exports (checked 2026-03-16)
- `@mysten/sui` v2 subpath exports: `/jsonRpc`, `/client`, `/transactions`
