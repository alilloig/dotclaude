---
name: sui-cross-player-ownercap-constraint
description: |
  Cross-player OwnerCap access is impossible in EVE Frontier world-contracts due to
  borrow_owner_cap enforcing ctx.sender() == character.character_address. Use when:
  (1) designing cross-player interactions in Sui Move capability systems,
  (2) encountering "sender mismatch" when one player tries to act on another's objects,
  (3) building dApps where admin/relay must link or modify objects owned by different players,
  (4) working with hot-potato borrow/return patterns where the receipt forces same-tx return.
  Covers the general pattern of sender-checked capability borrowing and workaround via
  admin authority functions.
author: Claude Code
version: 1.0.0
date: 2026-03-09
---

# Sui Move: Cross-Player OwnerCap Borrowing Is Blocked by Sender Checks

## Problem

In capability-based Sui Move systems (like EVE Frontier world-contracts), OwnerCap objects
are stored inside a parent object (e.g., Character) and accessed via a borrow pattern.
The borrow function typically enforces `ctx.sender() == owner_address`, making it impossible
for a different wallet to access the capability — even through a relay or admin.

Combined with a hot-potato receipt that forces same-transaction return, there is no way
to split borrow and return across transactions or have a third party return the cap.

## Context / Trigger Conditions

- A Move module uses `borrow_owner_cap()` that checks `ctx.sender()` against an owner address
- OwnerCaps are stored inside a container object (not freely transferable)
- A hot-potato `ReturnOwnerCapReceipt` forces same-tx return of the borrowed cap
- You need Player A's action to affect Player B's objects (cross-player linking, trading, etc.)
- The function you need to call (e.g., `link_gates`) requires OwnerCap from both parties

## Root Cause

```move
// character.move — the blocker
public fun borrow_owner_cap<T>(character: &mut Character, ctx: &TxContext): (OwnerCap<T>, ReturnOwnerCapReceipt) {
    assert!(ctx.sender() == character.character_address, ENotAuthorized);
    // ... borrows and returns hot-potato receipt
}
```

Key constraints:
1. **Sender check**: Only the wallet that owns the character can borrow its OwnerCap
2. **Hot-potato receipt**: The receipt must be consumed in the same transaction via `return_owner_cap`
3. **No delegation**: There's no mechanism to delegate borrowing to another address
4. **Combined effect**: A single transaction can only borrow OwnerCaps for characters owned by the tx sender

## Solution

### Pattern: Admin Authority Bypass Function

Create a new function that performs the same operation using admin authority (AdminACL)
instead of OwnerCaps:

```move
public fun admin_do_thing(
    object_a: &mut ObjectA,
    object_b: &mut ObjectB,
    admin_acl: &AdminACL,
    ctx: &mut TxContext,
) {
    admin_acl.verify_sponsor(ctx);  // Admin check instead of OwnerCap
    // ... perform the cross-player operation
    // All other validation (type checks, state checks) remains
}
```

### Architecture Pattern

1. **On-chain authorization**: Create an invitation/escrow contract where both players
   sign separate transactions to express consent
2. **Event-driven relay**: Watch for the "both parties agreed" event
3. **Admin execution**: Relay calls the admin function to complete the cross-player action

```
Player A: create_invitation(my_gate, target_gate) → InvitationCreated event
Player B: accept_invitation(invitation_id)        → InvitationAccepted event
Relay:    watches InvitationAccepted → calls admin_do_thing(gate_a, gate_b, admin_acl)
```

## Verification

- The admin function should maintain all non-ownership validations (type checks, distance checks, etc.)
- The invitation system ensures both players explicitly consent
- Only the relay/admin can execute the cross-player operation
- Each player only signs transactions affecting their own objects

## Example

EVE Frontier gate linking — `link_gates()` requires two OwnerCaps (one per gate), but
a single sender can only borrow caps for their own character's gates.

**Fork addition** (`gate.move`):
```move
public fun admin_link_gates(
    source_gate: &mut Gate,
    destination_gate: &mut Gate,
    gate_config: &GateConfig,
    server_registry: &ServerAddressRegistry,
    admin_acl: &AdminACL,
    distance_proof: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    admin_acl.verify_sponsor(ctx);
    // Same validations as link_gates minus OwnerCap checks
    assert!(option::is_none(&source_gate.linked_gate_id) && option::is_none(&destination_gate.linked_gate_id), EGatesAlreadyLinked);
    assert!(source_gate.type_id == destination_gate.type_id, EGateTypeMismatch);
    verify_gates_within_range(source_gate, server_registry, gate_config, distance_proof, clock, ctx);
    // Link them
    source_gate.linked_gate_id = option::some(object::id(destination_gate));
    destination_gate.linked_gate_id = option::some(object::id(source_gate));
}
```

## Notes

- **This is a general Sui Move pattern**: Any capability system with sender-checked borrowing
  will hit this wall when cross-player operations are needed
- **Security trade-off**: Admin functions bypass per-player authorization, so the invitation
  system must provide equivalent consent verification
- **Existing admin functions may help**: Check if the codebase already has admin variants
  (e.g., EVE Frontier has `unlink_gates_by_admin` but not `admin_link_gates`)
- **Alternative approaches** (not viable in this case):
  - Multi-sig transactions: Don't help because sender check is per-OwnerCap, not per-tx
  - Transferring OwnerCap: Usually not supported (stored in container, not freely held)
  - Shared OwnerCap: Would break the ownership model entirely

## See Also

- `seal-owned-object-setsender` — related Sui owned-object constraint in Seal decryption context
