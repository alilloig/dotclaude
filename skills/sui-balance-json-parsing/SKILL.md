# Sui Balance JSON Parsing

## Overview

When parsing Sui Move objects from the JSON RPC API, `Balance<T>` fields serialize as **plain strings**, not as objects with a `value` subfield.

This skill documents the correct JSON structure for Sui Balance fields and provides TypeScript patterns for safe parsing.

## Problem

Developers often expect `Balance<SUI>` to serialize like other Sui types that wrap a value, e.g.:

```typescript
// WRONG ASSUMPTION
const prizePool = fields.prize_pool as Record<string, unknown>;
const prizePoolValue = prizePool.value as string || "0";
```

This fails because the actual JSON structure is:

```json
{
  "prize_pool": "10000000000"
}
```

Not:

```json
{
  "prize_pool": {
    "value": "10000000000"
  }
}
```

## Solution

### Correct TypeScript Pattern

```typescript
// CORRECT: Treat Balance<T> as a direct string value
const prizePoolValue = (fields.prize_pool as string) || "0";
```

### Full Example with Safe Casting

```typescript
interface PoolFields {
  id: string;
  prize_pool: string; // Balance<SUI> serializes as string
  entry_fee: string;  // Another Balance field
}

function parsePoolObject(objectData: any): PoolFields {
  const fields = objectData.content.fields as Record<string, unknown>;

  return {
    id: fields.id as string,
    prize_pool: (fields.prize_pool as string) || "0",
    entry_fee: (fields.entry_fee as string) || "0",
  };
}
```

### Using the sui Client SDK

When using `@mysten/sui/client` `getObject()`:

```typescript
import { SuiClient } from "@mysten/sui/client";

const client = new SuiClient({ url: "https://fullnode.testnet.sui.io" });

const objectData = await client.getObject({
  id: "0x...",
  options: { showContent: true },
});

const content = objectData.data?.content;
if (content?.dataType === "moveObject") {
  const fields = content.fields as Record<string, unknown>;

  // Balance<SUI> is a direct string
  const balance = (fields.prize_pool as string) || "0";
  console.log(`Balance: ${balance}`);
}
```

### With CLI

Using `sui client object --json`:

```bash
sui client object --json 0x... | jq '.data.content.fields.prize_pool'
```

Returns a plain string:
```
"10000000000"
```

## Why This Happens

In Sui Move, `Balance<T>` is a wrapper struct:

```move
public struct Balance<phantom T> {
    value: u64
}
```

However, the JSON serialization of `Balance<T>` fields in objects **flattens** the structure and emits just the inner `u64` value as a string. This is an optimization in the JSON representation.

## Key Points

1. **Balance<T> fields are strings, not objects** - Always cast to `string`, not `Record<string, unknown>`
2. **No `.value` subfield** - Don't try to access `fields.balance.value`
3. **Still a u64 internally** - The value is a big integer (u64 range: 0 to 18,446,744,073,709,551,615)
4. **Safe to use with BigInt** - When handling large Sui amounts, cast to BigInt:

```typescript
const balanceBigInt = BigInt(fields.prize_pool as string);
```

## Common Patterns

### Extracting Multiple Balance Fields

```typescript
interface ContractState {
  totalPool: string;
  userBalance: string;
  feesCollected: string;
}

function extractBalances(fields: Record<string, unknown>): ContractState {
  return {
    totalPool: (fields.total_pool as string) || "0",
    userBalance: (fields.user_balance as string) || "0",
    feesCollected: (fields.fees_collected as string) || "0",
  };
}
```

### Defensive Parsing with Validation

```typescript
function safeParseBalance(value: unknown): string {
  if (typeof value === "string") {
    // Validate it's a valid number
    if (/^\d+$/.test(value)) {
      return value;
    }
  }
  return "0";
}

const prizePool = safeParseBalance(fields.prize_pool);
```

### Converting to Human-Readable Format

```typescript
// Assuming 9 decimal places for SUI
const SUI_DECIMALS = 9;

function formatBalance(balanceStr: string): string {
  const balance = BigInt(balanceStr);
  const divisor = BigInt(10 ** SUI_DECIMALS);
  const wholePart = balance / divisor;
  const fractionalPart = balance % divisor;

  return `${wholePart}.${String(fractionalPart).padStart(SUI_DECIMALS, "0")}`;
}

const displayBalance = formatBalance(prizePoolValue);
console.log(`Prize pool: ${displayBalance} SUI`);
```

## Testing

When writing tests that mock Sui objects with Balance fields, ensure your mock JSON matches this structure:

```typescript
// CORRECT mock
const mockObject = {
  data: {
    content: {
      dataType: "moveObject",
      fields: {
        id: "0x123...",
        prize_pool: "10000000000", // String, not object
      },
    },
  },
};

// WRONG mock
const badMock = {
  data: {
    content: {
      dataType: "moveObject",
      fields: {
        id: "0x123...",
        prize_pool: {
          value: "10000000000", // WRONG: should be just a string
        },
      },
    },
  },
};
```

## References

- [Sui JSON RPC Spec](https://docs.sui.io/references/sui-api)
- [Sui Move Balance Type](https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/balance.move)
- [Sui TypeScript SDK](https://sdk.mysten.labs/typescript)

## Related Skills

- `sui-vector-u8-base64-parsing` - Similar JSON serialization gotcha for `vector<u8>` (base64, not hex/array)
- `/move-code-quality` - Sui Move code best practices
- `/sui-marp-theme` - Styling Sui documentation slides
