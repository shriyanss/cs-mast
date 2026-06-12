---
id: signature-format
title: Signature Format (CS-MAST-S)
sidebar_position: 4
---

# CS-MAST-S Signature Format

CS-MAST-S is a **PHC-style string** (inspired by the [PHC String Format](https://github.com/P-H-C/phc-string-format/blob/master/phc-sf-spec.md)) that encodes both the configuration parameters and the cryptographic hash of the node.

---

## Structure

```
$v=<version>$<params>$<hashHex>
```

| Section | Example | Description |
|---------|---------|-------------|
| `$v=<version>` | `$v=1` | Spec version — always `1` for this implementation |
| `$<params>` | `$hash=sha256,lang=js,...` | Comma-separated `key=value` pairs |
| `$<hashHex>` | `$a3f2b1...` | 64-character lowercase SHA-256 hex digest |

### Full example

```
$v=1$hash=sha256,lang=js,lver=es6,prsr=-babel/parser,scat=lit_val_decl,sinc=IfStatement$a3f2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

---

## Parameters

Parameters appear in the second `$`-delimited section, comma-separated in this order:

| Key | Required | Value | Example |
|-----|----------|-------|---------|
| `hash` | yes | Hash algorithm | `hash=sha256` |
| `lang` | yes | Language extension | `lang=js` |
| `lver` | no | Language version | `lver=es6` |
| `prsr` | yes | Sanitized parser name | `prsr=-babel/parser` |
| `scat` | * | `_`-joined category codes | `scat=lit_val_decl` |
| `sinc` | * | `_`-joined node type names | `sinc=IfStatement_ForStatement` |

*At least one of `scat` or `sinc` must be present.

### `prsr` Sanitization

Characters outside `[a-zA-Z0-9/+.-]` are replaced with `-`:

| Input | Stored as |
|-------|-----------|
| `@babel/parser` | `-babel/parser` |
| `tree-sitter/python` | `tree-sitter/python` |
| `my parser v2` | `my-parser-v2` |

### Multi-value separator

Both `scat` and `sinc` use **underscore** (`_`) to join multiple values:

```
scat=lit_val_id_name_decl
sinc=IfStatement_ForStatement_WhileStatement
```

---

## No Salt

The PHC string format specifies a salt field; CS-MAST **intentionally omits it**.
CS-MAST is designed for deterministic subtree matching — a salt would break the property
that the same source code always produces the same signature. Password security is not
a goal here.

---

## Hashmap Key

The **full PHC string** (all three sections) is the hashmap key used by `cs_mast_s_exists`.
This means signatures from different configurations (different `scat`, `lang`, `lver`, etc.)
never collide in the lookup table.

---

## Codebase-Level Signature

When using `cs_mast_init_codebase`, a codebase-level signature is produced. It uses the same
config params but a different `hashHex`:

```
codebaseHash = sha256(sorted([h1, h2, ...]).join(''))
```

File order is irrelevant — the sort ensures a deterministic result regardless of the order
files are passed to `cs_mast_init_codebase`.

---

## Codec

```typescript
import { parseSignature, buildSignature } from '@shriyanss/cs-mast';

// Parse
const sig = '$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=lit$' + 'a'.repeat(64);
const parsed = parseSignature(sig);
// → { version: 1, hash: 'sha256', lang: 'js', prsr: '-babel/parser',
//     scat: ['lit'], sinc: [], hashHex: 'aaa...' }

// Build
const rebuilt = buildSignature({
  version: 1, hash: 'sha256', lang: 'js', prsr: '-babel/parser',
  scat: ['lit'], sinc: [], hashHex: 'a'.repeat(64),
});
// → '$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=lit$aaa...'
```

`parseSignature` returns `null` for any of these invalid inputs:
- Missing required fields (`hash`, `lang`, `prsr`)
- Both `scat` and `sinc` absent
- `hashHex` not exactly 64 lowercase hex characters
- Wrong version (not `v=1`)
- Malformed PHC structure (wrong number of `$` sections)
