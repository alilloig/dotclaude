---
name: sui-vector-u8-base64-parsing
description: |
  Fix for silent comparison failures when parsing Sui Move `vector<u8>` fields
  from gRPC/JSON-RPC object content. Use when: (1) comparing on-chain vector<u8>
  values (root hashes, checksums, byte arrays) against locally computed values
  always fails, (2) a parsed vector<u8> field arrives in an unexpected format
  (base64 string OR number array depending on client), (3) integrity verification
  or signature comparison silently returns false despite correct data. CRITICAL:
  Sui serializes vector<u8> differently depending on the client — gRPC returns
  base64 strings while JSON-RPC returns number arrays. Always use defensive
  parsing that handles both formats.
author: Claude Code
version: 2.0.0
date: 2026-03-07
---

# Sui `vector<u8>` Parsing — Client-Dependent Serialization

## Problem

Sui Move `vector<u8>` fields are serialized **differently** depending on which
client you use to read object content. This causes silent comparison failures
when your parsing assumes the wrong format.

## Context / Trigger Conditions

- You're parsing a Sui object that has a `vector<u8>` field (condition IDs,
  root hashes, checksums, signatures, arbitrary byte arrays)
- Comparison against a locally computed value always returns `false`
- The parsed value is unexpectedly a string (base64) when you expected an array,
  or vice versa
- You switched between `SuiGrpcClient` and `SuiJsonRpcClient` and parsing broke

## How Sui Serializes `vector<u8>` — By Client

| Client | Import | `vector<u8>` Format | Example |
|--------|--------|---------------------|---------|
| `SuiGrpcClient` | `@mysten/sui/grpc` | **base64 string** | `"qrvM"` |
| `SuiJsonRpcClient` | `@mysten/sui/jsonRpc` | **number array** | `[170, 187, 204]` |
| Event `parsedJson` | (both clients) | **number array** | `[170, 187, 204]` |

### Other types (consistent across clients)

| Move Type | JSON Format | Example |
|-----------|------------|---------|
| `u8`, `u16`, `u32` | number | `42` |
| `u64`, `u128`, `u256` | string (decimal) | `"1000000000"` |
| `bool` | boolean | `true` |
| `address` | string (hex, 0x-prefixed) | `"0xabc..."` |
| `String` | string | `"hello"` |
| `vector<T>` (T != u8) | JSON array | `["a", "b"]` |
| `Option<T>` | T \| null | `null` |
| `Balance<T>` | string (decimal u64) | `"10000000000"` |

## Solution

### Defensive Parsing (Handles Both Formats)

**Always use this pattern** — it works regardless of which client is in use:

```typescript
/**
 * Parse a vector<u8> field that may arrive as base64 string (gRPC)
 * or number array (JSON-RPC / event parsedJson).
 */
function parseVectorU8(value: unknown): number[] {
  if (Array.isArray(value)) {
    // JSON-RPC / event parsedJson format: already a number[]
    return value as number[];
  }
  if (typeof value === "string" && value.length > 0) {
    // gRPC format: base64-encoded string
    const binary = atob(value);
    return Array.from(binary, (c) => c.charCodeAt(0));
  }
  return [];
}

// Usage:
const conditionId = parseVectorU8(fields.condition_id);
// Works with both: [156, 110, ...] and "nG4lJdQK3S7Q6..."
```

### As Hex String

```typescript
function parseVectorU8AsHex(value: unknown): string {
  return parseVectorU8(value)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

### As Uint8Array

```typescript
function parseVectorU8AsBytes(value: unknown): Uint8Array {
  return new Uint8Array(parseVectorU8(value));
}
```

### Comparison

```typescript
function vectorU8Equal(a: unknown, b: unknown): boolean {
  const bytesA = parseVectorU8(a);
  const bytesB = parseVectorU8(b);
  return (
    bytesA.length === bytesB.length &&
    bytesA.every((v, i) => v === bytesB[i])
  );
}

// Works across formats:
vectorU8Equal([156, 110, 37], "nG4l"); // true
vectorU8Equal([156, 110, 37], [156, 110, 37]); // true
```

## Verification

1. Log `typeof fields.condition_id` — if `"object"` (array), you're on JSON-RPC;
   if `"string"`, you're on gRPC
2. Apply `parseVectorU8()` and verify it produces the expected byte array
3. Compare against a known value — should now match regardless of client

## Example

Real-world scenario from a Sui prediction market frontend:

```typescript
// Fetching position tokens to filter by market condition_id
const result = await client.getOwnedObjects({
  owner: address,
  filter: { StructType: POSITION_TOKEN_TYPE },
  options: { showContent: true },
});

// Market's condition_id from event data (always number[])
const marketCid: number[] = eventData.condition_id;

for (const obj of result.data) {
  const fields = obj.data.content.fields;

  // ❌ WRONG: assumes base64 (breaks on JSON-RPC)
  // const cidBytes = Array.from(atob(fields.condition_id), c => c.charCodeAt(0));

  // ❌ WRONG: assumes number[] (breaks on gRPC)
  // const cidBytes = fields.condition_id;

  // ✅ CORRECT: handles both formats
  const cidBytes = parseVectorU8(fields.condition_id);

  if (JSON.stringify(cidBytes) === JSON.stringify(marketCid)) {
    // Match found
  }
}
```

## Notes

- Event `parsedJson` **always** returns `vector<u8>` as number arrays regardless
  of client — only object content varies
- `@mysten/dapp-kit-react` with `SuiJsonRpcClient` returns number arrays
- If you only use one client type consistently, you could use the specific format,
  but defensive parsing is safer for shared code and library code
- Empty `vector<u8>` may serialize as `""` (gRPC) or `[]` (JSON-RPC)
- The `@mysten/sui/utils` exports `fromBase64`/`toBase64` for the gRPC case,
  but the defensive approach above avoids the import entirely

## References

- [Sui JSON-RPC Object Content](https://docs.sui.io/references/sui-api)
- [@mysten/sui/utils — fromBase64, toBase64](https://sdk.mysten.sui.io/typescript)
- Related skill: `sui-balance-json-parsing` — similar JSON serialization gotcha for `Balance<T>`
- Verified on Sui testnet 2026-03-07 with `@mysten/sui` v2.6.0 and `@mysten/dapp-kit-react` v2.0.0
