---
name: sui-move-toml-migration
description: |
  Migrate Sui Move.toml files from pre-v1.63 format to the new package manager format.
  Use when: (1) Move.toml has [addresses] or [dev-addresses] sections, (2) Move.toml has
  explicit Sui framework git dependency, (3) Move.toml uses [dev-dependencies] instead of
  modes = ["test"], (4) edition is "2024.beta" instead of "2024", (5) migrating a Sui Move
  project to the latest CLI format. Covers the non-obvious gotcha of custom named addresses
  needing source code changes.
author: Claude Code
version: 1.1.0
date: 2026-03-16
---

# Sui Move.toml Migration (pre-v1.63 → v1.63+)

## Problem

Sui CLI v1.63 introduced a new Move.toml package manager format. Old Move.toml files with
`[addresses]`, `[dev-addresses]`, explicit Sui git dependencies, and `[dev-dependencies]`
need migration. The migration is mostly mechanical but has a critical gotcha with custom
named addresses.

## Context / Trigger Conditions

- Move.toml contains `[addresses]` section with `package_name = "0x0"`
- Move.toml has explicit Sui framework dependency: `Sui = { git = "https://github.com/MystenLabs/sui.git", ... }`
- Move.toml uses `[dev-dependencies]` or `[dev-addresses]` sections
- Edition is `"2024.beta"` (should be `"2024"`)
- `renamed = "..."` used in dependencies (now `rename-from = "..."`)

## Solution

### Standard Migration (90% of cases)

**Before:**
```toml
[package]
name = "my_package"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
my_package = "0x0"

[dev-dependencies]
[dev-addresses]
```

**After:**
```toml
[package]
name = "my_package"
edition = "2024"

[dependencies]
```

Key changes:
1. Remove `[addresses]` — package name is now the implicit named address
2. Remove `[dev-addresses]` — no longer exists
3. Remove explicit Sui dependency — `std` (0x1) and `sui` (0x2) are implicit
4. Remove empty `[dev-dependencies]` — use `modes = ["test"]` on individual deps instead
5. Update edition from `"2024.beta"` to `"2024"`
6. Strip template boilerplate comments

### Gotcha: Custom Named Addresses

**This is the non-obvious part.** If `[addresses]` contained custom entries beyond the
package name (e.g., `USER = "0x1"`), those addresses were available as `@USER` in Move code.

After removing `[addresses]`, you must add equivalent constants in the source:

```move
// Was: [addresses] USER = "0x1" in Move.toml
const USER: address = @0x1;
```

And update references from `@USER` to `USER` (drop the `@` prefix since it's now a const,
not a named address).

**Detection:** Search for address entries that don't match the package name:
```bash
grep -A5 '\[addresses\]' Move.toml | grep -v "package_name = "
```

### Gotcha: Package Name ≠ Address Name

If the package `name` differs from the `[addresses]` entry, the module declarations use
the address name, not the package name. In this case, change the package `name` to match
the address used in `module` declarations.

**Example:** `name = "hot_potato"` but `[addresses]` has `publisher = "0x0"` and source
has `module publisher::hot_potato;` → change `name` to `"publisher"`.

### Test-Only Dependencies

**Before:**
```toml
[dev-dependencies]
TestHelper = { local = "../test_helper" }
```

**After:**
```toml
[dependencies]
TestHelper = { local = "../test_helper", modes = ["test"] }
```

### Dependency Renaming

**Before:** `renamed = "original_name"`
**After:** `rename-from = "original_name"`

## Verification

```bash
# Build to check compilation
sui move build

# Run tests (especially for packages with custom address changes)
sui move test
```

Build failures from scaffold TODO code (empty function bodies) are expected on educational
repos — these are pre-existing and unrelated to the migration.

### Gotcha: System Environments (v1.67+)

In Sui CLI v1.67+, `testnet` and `mainnet` are **system environments** that cannot be
overridden in `[environments]`. Adding `[environments] testnet = "..."` will fail with:

```
Error: Cannot override default environments. Environment `testnet` is a system environment
and cannot be overridden. System environments: testnet, mainnet
```

**Fix:** Remove `[environments]` entries for `testnet` and `mainnet` entirely. The CLI
resolves them automatically. Only add `[environments]` for custom environments (e.g.,
`localnet`, `devnet`).

If your active environment's chain ID doesn't match the system one (e.g., testnet was
wiped), use `sui move build -e testnet` to override without changing Move.toml.

## Notes

- `C4/move/Move.toml` style (just `[package]` with name+edition) is the ideal minimal format
- Local dependencies with `override = true` remain valid in the new format
- `Move.lock` files regenerate automatically on build — stale ones are harmless
- The `Published.toml` file (not `Move.lock`) now tracks on-chain addresses

## References

- [Package Manager Migration Guide](https://docs.sui.io/references/package-managers/package-manager-migration)
- [Move.toml Reference](https://docs.sui.io/references/move/move-toml)
