---
name: sui-cli-keystore-format
description: |
  Sui CLI keystore entry format and Ed25519Keypair.getSecretKey() bech32 encoding
  in @mysten/sui v2. Use when: (1) constructing or parsing sui.keystore entries
  programmatically, (2) getSecretKey() returns a string instead of Uint8Array,
  (3) "offset is out of bounds" error when calling Uint8Array.set() with a secret
  key, (4) matching keystore entries to Sui addresses. Covers the scheme-byte
  prefix format and decodeSuiPrivateKey() workaround.
author: Claude Code
version: 1.0.0
date: 2026-03-12
---

# Sui CLI Keystore Entry Format & SDK v2 Secret Key Encoding

## Problem

In `@mysten/sui` v2, `Ed25519Keypair.getSecretKey()` returns a **bech32-encoded
string** (e.g., `suiprivkey1q...`), not raw `Uint8Array` bytes. Code that assumes
raw bytes will fail with `RangeError: offset is out of bounds` when trying to
construct keystore entries or perform byte operations on the result.

## Context / Trigger Conditions

- Using `@mysten/sui` v2 (not v1)
- Calling `keypair.getSecretKey()` and treating the result as `Uint8Array`
- Constructing Sui CLI keystore entries (`sui.keystore` format)
- Error: `RangeError: offset is out of bounds` on `Uint8Array.set(secretKey, 1)`
- The return value is a string of ~70 characters starting with `suiprivkey1q`

## Solution

### 1. Decode the bech32 secret key

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const keypair = new Ed25519Keypair();

// WRONG in v2 — returns bech32 string, not bytes
// const rawBytes = keypair.getSecretKey();

// CORRECT — decode to get raw 32-byte Uint8Array
const { secretKey } = decodeSuiPrivateKey(keypair.getSecretKey());
// secretKey is Uint8Array(32)
```

### 2. Sui CLI keystore entry format

The `~/.sui/sui_config/sui.keystore` file is a JSON array of base64 strings.
Each entry is 33 bytes: `[scheme_byte | 32-byte_secret_key]`

| Scheme byte | Algorithm |
|-------------|-----------|
| `0x00` | Ed25519 |
| `0x01` | Secp256k1 |
| `0x02` | Secp256r1 |

### 3. Constructing a keystore entry from a keypair

```typescript
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { toBase64 } from '@mysten/sui/utils';

function createKeystoreEntry(keypair: Ed25519Keypair): string {
  const { secretKey } = decodeSuiPrivateKey(keypair.getSecretKey());
  const withScheme = new Uint8Array(33);
  withScheme[0] = 0x00; // Ed25519 scheme flag
  withScheme.set(secretKey, 1);
  return toBase64(withScheme);
}
```

### 4. Matching a keystore entry to a Sui address

```typescript
import { fromBase64 } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

function findKeyForAddress(entries: string[], targetAddress: string): string | null {
  for (const entry of entries) {
    try {
      const keyBytes = fromBase64(entry);
      if (keyBytes.length !== 33 || keyBytes[0] !== 0x00) continue; // Ed25519 only
      const secretKey = keyBytes.slice(1);
      const keypair = Ed25519Keypair.fromSecretKey(secretKey);
      const address = keypair.getPublicKey().toSuiAddress();
      if (address === targetAddress) return entry;
    } catch {
      continue;
    }
  }
  return null;
}
```

## Verification

```typescript
// Round-trip test: keypair → keystore entry → keypair → same address
const kp1 = new Ed25519Keypair();
const entry = createKeystoreEntry(kp1);
const bytes = fromBase64(entry);
const kp2 = Ed25519Keypair.fromSecretKey(bytes.slice(1));
assert(kp1.getPublicKey().toSuiAddress() === kp2.getPublicKey().toSuiAddress());
```

## Notes

- `Ed25519Keypair.fromSecretKey()` accepts raw 32-byte `Uint8Array` (NOT bech32)
- The keystore file path can be found in `client.yaml` under `keystore.File`
- Default keystore path: `~/.sui/sui_config/sui.keystore`
- Non-Ed25519 entries (scheme byte != 0x00) should be skipped if you only support Ed25519
- `client.yaml` uses the `yaml` npm package for parsing (YAML format, not JSON)
