---
id: signature-utils
title: Signature Utilities
sidebar_position: 5
---

# Signature Utilities

---

## `parseSignature`

```typescript
function parseSignature(sig: string): CsMastSignature | null
```

Parses a CS-MAST-S PHC string into its constituent parts.

Returns `null` for any invalid input (see validation rules below).

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sig` | `string` | A CS-MAST-S PHC string to parse |

### Returns

[`CsMastSignature`](./types) on success, `null` on failure.

### Validation Rules

Returns `null` when:
- Input does not start with `$`
- Structure is not exactly `$v=N$params$hashHex`
- `v` is not a positive integer
- `hash`, `lang`, or `prsr` are missing from params
- Both `scat` and `sinc` are absent
- `hashHex` is not exactly 64 lowercase hex characters

### Example

```typescript
import { parseSignature } from 'cs-mast';

const parsed = parseSignature(
  '$v=1$hash=sha256,lang=js,lver=es6,prsr=-babel/parser,scat=lit_val$' + 'a'.repeat(64)
);

// {
//   version: 1,
//   hash: 'sha256',
//   lang: 'js',
//   lver: 'es6',
//   prsr: '-babel/parser',
//   scat: ['lit', 'val'],
//   sinc: [],
//   hashHex: 'aaa...'
// }

console.log(parseSignature('invalid')); // null
console.log(parseSignature(''));        // null
```

---

## `buildSignature`

```typescript
function buildSignature(parts: CsMastSignature): string
```

Assembles a CS-MAST-S PHC string from its parts. Does **not** perform any hashing — accepts
a pre-computed `hashHex`.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `parts` | [`CsMastSignature`](./types) | All fields of the signature |

### Returns

A valid CS-MAST-S PHC string.

### Example

```typescript
import { buildSignature } from 'cs-mast';

const sig = buildSignature({
  version: 1,
  hash: 'sha256',
  lang: 'js',
  lver: 'es6',
  prsr: '-babel/parser',
  scat: ['lit', 'val'],
  sinc: ['ReturnStatement'],
  hashHex: 'a3f2b1' + 'c'.repeat(58),
});

// $v=1$hash=sha256,lang=js,lver=es6,prsr=-babel/parser,scat=lit_val,sinc=ReturnStatement$a3f2b1cccc...
```

### Round-trip

`buildSignature(parseSignature(sig)!)` is lossless for any valid signature.

---

## `buildSignatureFromConfig`

```typescript
function buildSignatureFromConfig(config: CsMastConfig, hashHex: string): string
```

Convenience wrapper that builds a signature from a `CsMastConfig` and a pre-computed hash,
automatically sanitizing the `prsr` field.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | [`CsMastConfig`](./types#csmastconfig) | Configuration object |
| `hashHex` | `string` | 64-char lowercase SHA-256 hex |

### Example

```typescript
import { buildSignatureFromConfig } from 'cs-mast';

const sig = buildSignatureFromConfig(
  { hash: 'sha256', lang: 'js', prsr: '@babel/parser', scat: ['lit'], sinc: [] },
  'a3f2b1' + '0'.repeat(58),
);
// prsr is automatically sanitized: '@babel/parser' → '-babel/parser'
```

---

## `sanitizePrsr`

```typescript
function sanitizePrsr(name: string): string
```

Applies the CS-MAST-S character-set rule to a parser name: characters outside
`[a-zA-Z0-9/+.-]` are replaced with `-`.

### Example

```typescript
import { sanitizePrsr } from 'cs-mast';

sanitizePrsr('@babel/parser')    // '-babel/parser'
sanitizePrsr('tree-sitter/py')   // 'tree-sitter/py'
sanitizePrsr('my parser v2')     // 'my-parser-v2'
```
