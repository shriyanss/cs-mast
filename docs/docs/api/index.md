---
id: index
title: API Overview
sidebar_position: 1
---

# API Reference

All exports are available from the `cs-mast` package root:

```typescript
import { cs_mast_init, cs_mast_s_exists, /* ... */ } from '@shriyanss/cs-mast';
```

---

## Core Functions

| Function | Description |
|----------|-------------|
| [`cs_mast_init`](./cs-mast-init) | Parse source, compute all hashes, build the lookup hashmap |
| [`cs_mast_s_exists`](./cs-mast-s-exists) | O(1) boolean signature lookup |
| [`cs_mast_init_codebase`](./cs-mast-init-codebase) | Multi-file codebase-level hash |

## Signature Utilities

| Function | Description |
|----------|-------------|
| [`parseSignature`](./signature-utils#parsesignature) | PHC string → `CsMastSignature \| null` |
| [`buildSignature`](./signature-utils#buildsignature) | `CsMastSignature` → PHC string |
| [`buildSignatureFromConfig`](./signature-utils#buildsignaturefromconfig) | Config + hashHex → PHC string |
| [`sanitizePrsr`](./signature-utils#sanitizeprsr) | Apply `[a-zA-Z0-9/+.-]` charset rule to parser name |

## Types

See the [Types reference](./types) for all exported TypeScript interfaces and type aliases.

## Errors

See the [Errors reference](./errors) for `ParseError`, `ConfigError`, `MutationError`.

## Guard

See the [Guard reference](./guard) for `guardPath`, `RESTRICTED_METHODS`, `makeGuard`.

## Adapter

| Export | Description |
|--------|-------------|
| `BabelAdapter` | Default adapter using `@babel/parser` + `@babel/traverse` |
| `CS_MAST_SIGNATURE_KEY` | The string `'cs-mast-s-hash'` — property key attached to Babel nodes |
| `sha256` | SHA-256 wrapper: `(input: string) => string` (64-char hex) |
| `computeNodeHash` | Low-level: compute hash for one `AdapterNode` given `ResolvedConfig` |
| `computeDefaultHash` | Low-level: default Merkle formula for uncategorized nodes |
