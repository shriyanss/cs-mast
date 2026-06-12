---
id: cs-mast-init-codebase
title: cs_mast_init_codebase
sidebar_position: 4
---

# `cs_mast_init_codebase`

```typescript
function cs_mast_init_codebase(
  files: Array<{ filename: string; source: string }>,
  config: CsMastConfig,
  adapter?: IParserAdapter,
): CodebaseResult
```

Process multiple source files with the **same config** and derive a single codebase-level hash.
The codebase hash is **order-independent** with respect to the input file array.

---

## Parameters

### `files`

**Type:** `Array<{ filename: string; source: string }>`

Array of source files. Each entry must have a `filename` (used for labelling only — not included
in hash computation) and `source` (raw source text).

All files must be in the same language; use the same `config` for all.

---

### `config`

**Type:** [`CsMastConfig`](./types#csmastconfig)

Configuration used for all files. The spec requires identical configuration across all files
in a codebase to ensure signatures are comparable.

---

### `adapter`

**Type:** [`IParserAdapter`](./types#iparseradapter) | `undefined`

**Default:** `new BabelAdapter()`

---

## Return Value

### `CodebaseResult`

```typescript
interface CodebaseResult {
  trees: CsMastTree[];
  codebaseHash: string;
  codebaseSignature: string;
}
```

#### `trees`

Array of [`CsMastTree`](./cs-mast-init#return-value) objects, one per input file, in the same
order as the input `files` array. Each tree is independently initialized.

#### `codebaseHash`

64-character lowercase SHA-256 hex. Computed as:

```
codebaseHash = sha256(sorted([tree.rootHash, ...]).join(''))
```

The list of root hashes is sorted ASCII-ascending before joining, so the result is identical
regardless of input file order.

#### `codebaseSignature`

Full CS-MAST-S PHC string using the shared config and `codebaseHash` as the hash portion.
Config params are identical to the per-file signatures.

---

## Throws

Same as [`cs_mast_init`](./cs-mast-init#throws) — `ConfigError` or `ParseError` if any file fails.

---

## Examples

### Basic codebase hashing

```typescript
import { cs_mast_init_codebase } from '@shriyanss/cs-mast';
import { readFileSync, readdirSync } from 'fs';

const jsFiles = readdirSync('./src')
  .filter(f => f.endsWith('.js'))
  .map(f => ({ filename: f, source: readFileSync(`./src/${f}`, 'utf8') }));

const result = cs_mast_init_codebase(jsFiles, {
  hash: 'sha256', lang: 'js', prsr: '@babel/parser',
  scat: ['decl', 'lit', 'val'], sinc: [],
});

console.log(result.codebaseHash);      // 64-char hex, stable across runs
console.log(result.codebaseSignature); // full CS-MAST-S string
```

### Cross-codebase comparison

```typescript
const configA = { hash: 'sha256', lang: 'js', prsr: '@babel/parser',
                  scat: ['lit', 'val', 'decl'], sinc: [] };

const v1 = cs_mast_init_codebase(filesV1, configA);
const v2 = cs_mast_init_codebase(filesV2, configA);

if (v1.codebaseHash === v2.codebaseHash) {
  console.log('No changes detected (under this config)');
} else {
  console.log('Codebase changed');
}
```

### Per-file lookup after codebase init

```typescript
const result = cs_mast_init_codebase(files, config);

for (const tree of result.trees) {
  for (const [sig, pathKey] of tree._signatureMap) {
    if (cs_mast_s_exists(tree, sig)) {
      // process match
    }
  }
}
```

---

## File Order Independence

```typescript
const r1 = cs_mast_init_codebase([
  { filename: 'a.js', source: sourceA },
  { filename: 'b.js', source: sourceB },
], config);

const r2 = cs_mast_init_codebase([
  { filename: 'b.js', source: sourceB },
  { filename: 'a.js', source: sourceA },
], config);

console.log(r1.codebaseHash === r2.codebaseHash); // true
```
