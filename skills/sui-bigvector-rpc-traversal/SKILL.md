---
name: sui-bigvector-rpc-traversal
description: |
  Read DeepBook V3 BigVector B+ tree data from Sui RPC (getDynamicFieldObject).
  Use when: (1) reading orderbook data from a CLOB that uses BigVector storage,
  (2) only depth=0 (single leaf) reads are working but depth>0 trees show empty,
  (3) need to traverse all leaf nodes of a BigVector to collect orders or other data,
  (4) working with any Sui Move module that adapts DeepBook's big_vector.move.
  Covers sentinel values, internal vs leaf nodes, and linked-list leaf traversal.
author: Claude Code
version: 1.0.0
date: 2026-03-10
---

# Sui BigVector B+ Tree RPC Traversal

## Problem
BigVector (from DeepBook V3) stores sorted data in a B+ tree using Sui dynamic fields.
When the tree has depth > 0 (more than ~64 entries), the root is an internal node, not
a leaf. Naive code that only reads the root slice will either crash or return empty results
for larger datasets.

## Context / Trigger Conditions
- Orderbook appears empty in frontend but has orders on-chain
- Code checks `depth === 0` before reading — silently skips depth>0 trees
- Using `getDynamicFieldObject` to read BigVector slices
- Working with any Sui Move module that uses `big_vector.move` from DeepBook V3
- BigVector struct fields: `{ id, depth, length, max_slice_size, max_fan_out, root_id, last_id }`

## Solution

### Key Data Structure Facts

1. **Sentinel**: `NO_SLICE = 0` means "no slice" (empty tree or end of linked list)
2. **ID allocation**: `alloc()` increments `last_id` BEFORE using it, so real slice IDs start at 1. The check `root_id !== 0` correctly detects a non-empty tree.
3. **Leaf nodes** (depth=0): `Slice<E>` where `keys.length === vals.length`. Keys are the sorted lookup keys, vals are the stored elements.
4. **Internal nodes** (depth>0): `Slice<u64>` where `vals.length === keys.length + 1`. Keys are separator values, vals are child slice IDs.
5. **Leaf linking**: Leaf slices are doubly-linked via `prev`/`next` fields. Internal nodes also have these but they're less useful for traversal.

### Traversal Algorithm

Find leftmost leaf by following `vals[0]` down from root, then walk the leaf linked list:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */

async function readSlice(
  client: any,
  parentId: string,   // BigVector's UID (id.id)
  sliceId: string,     // Slice ID as string
): Promise<any | null> {
  const result = await client.getDynamicFieldObject({
    parentId,
    name: { type: "u64", value: sliceId },
  });
  const dfFields = result.data?.content?.fields;
  return dfFields?.value?.fields ?? dfFields ?? null;
}

async function traverseAllLeaves(
  client: any,
  bigVectorUID: string,
  rootId: number,
  depth: number,
): Promise<any[]> {
  const allLeafData: any[] = [];

  if (rootId === 0) return allLeafData; // Empty tree

  // Phase 1: Walk down to leftmost leaf
  let currentId = String(rootId);
  let currentDepth = depth;
  while (currentDepth > 0) {
    const node = await readSlice(client, bigVectorUID, currentId);
    if (!node?.vals?.length) return allLeafData;
    currentId = String(node.vals[0]); // Follow leftmost child
    currentDepth--;
  }

  // Phase 2: Walk leaf linked list via `next` pointers
  while (currentId !== "0") { // 0 = NO_SLICE sentinel
    const leaf = await readSlice(client, bigVectorUID, currentId);
    if (!leaf) break;

    const keys: string[] = leaf.keys || [];
    const vals: any[] = leaf.vals || [];

    for (let i = 0; i < vals.length; i++) {
      allLeafData.push({ key: keys[i], value: vals[i] });
    }

    currentId = String(leaf.next); // Follow linked list
  }

  return allLeafData;
}
```

### Reading from a Market Object

BigVector fields are nested inside the market object content:

```typescript
const marketResult = await client.getObject({
  id: marketId,
  options: { showContent: true },
});
const fields = marketResult.data?.content?.fields;

// For a dual-book market:
const yesBidsFields = fields.yes_book.fields.bids.fields;
// yesBidsFields has: id.id, root_id, length, depth, max_slice_size, max_fan_out, last_id

const orders = await traverseAllLeaves(
  client,
  yesBidsFields.id.id,      // BigVector UID
  Number(yesBidsFields.root_id),
  Number(yesBidsFields.depth),
);
```

### Order ID Decoding (CLOB-specific)

For DeepBook-style CLOBs, order IDs are encoded u128:
- Bit 127: `is_ask` flag (0 = bid, 1 = ask)
- Bits 64-126: price (63 bits)
- Bits 0-63: sequence number

```typescript
function decodeOrderId(encoded: string): { isBid: boolean; price: number } {
  const n = BigInt(encoded);
  const isBid = (n >> BigInt(127)) === BigInt(0);
  const price = Number(
    (n >> BigInt(64)) & ((BigInt(1) << BigInt(63)) - BigInt(1))
  );
  return { isBid, price };
}
```

### Best Price Shortcut

To get just the best (lowest) ask price without reading all leaves:
1. Read root. If depth=0, first key is the answer.
2. If depth>0, follow `vals[0]` down to leftmost leaf, read first key.

This is O(depth) RPC calls instead of O(leaves).

## Verification
- For depth=0 trees (< ~64 orders), the root IS the leaf — verify by checking `keys.length === vals.length`
- For depth>0, verify internal nodes have `vals.length === keys.length + 1`
- `next === "0"` means end of linked list (last leaf)
- Total entries across all leaves should equal `BigVector.length`

## Notes
- **ES2017 compatibility**: Use `BigInt(0)`, `BigInt(64)`, `BigInt(127)` — NOT `0n`, `64n`, `127n` literals (they require ES2020+)
- **MAX_SLICE_SIZE** defaults to 64 in DeepBook/Mako, so depth>0 triggers at ~65 orders
- **RPC cost**: Each `getDynamicFieldObject` is one RPC call. For a tree with N leaves, traversal costs N + depth calls.
- **Dynamic field key type**: Always `{ type: "u64", value: sliceIdAsString }` for BigVector slices
- The `prev`/`next` fields on internal nodes exist but are typically only used during tree rebalancing, not for traversal

## References
- DeepBook V3 source: `big_vector.move` in the DeepBook repository
- Sui Dynamic Fields: https://docs.sui.io/concepts/dynamic-fields
