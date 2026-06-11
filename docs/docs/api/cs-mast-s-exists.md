---
id: cs-mast-s-exists
title: cs_mast_s_exists
sidebar_position: 3
---

# `cs_mast_s_exists`

```typescript
function cs_mast_s_exists(tree: CsMastTree, signature: string): boolean
```

O(1) lookup — returns `true` if the given CS-MAST-S signature string exists in the tree.

---

## Parameters

### `tree`

**Type:** [`CsMastTree`](./cs-mast-init#return-value)

A tree returned by [`cs_mast_init`](./cs-mast-init). The internal `_signatureMap` is used for
the lookup.

---

### `signature`

**Type:** `string`

A full CS-MAST-S PHC signature string, e.g.:

```
$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=lit_val$a3f2b1...
```

Must include the complete config section and the 64-char hash portion. Partial strings or
hash-only strings return `false`.

---

## Return Value

`true` if `signature` exactly matches any key in `tree._signatureMap`, `false` otherwise.

Returns `false` immediately for empty string.

---

## Complexity

**O(1) amortized** — backed by a JavaScript `Map` (hash table). The spec mandates constant-time
implementation.

---

## No Side Effects

The call does not modify `tree._signatureMap` or any node in the tree.

---

## Examples

### Typical SAST use case

```typescript
import { cs_mast_init, cs_mast_s_exists } from 'cs-mast';

// Known signature of a dangerous pattern (fingerprinted offline)
const TRACKING_SIG =
  '$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=lit_val_decl$<known-hex>';

const tree = cs_mast_init(targetSource, config);

if (cs_mast_s_exists(tree, TRACKING_SIG)) {
  console.warn('Known tracking pattern detected');
}
```

### Self-lookup (always true)

```typescript
const tree = cs_mast_init('const x = 1;', config);
// Any signature built from this tree will be found
for (const sig of tree._signatureMap.keys()) {
  console.assert(cs_mast_s_exists(tree, sig) === true);
}
```

### Cross-tree lookup

```typescript
const configA = { hash: 'sha256', lang: 'js', prsr: '@babel/parser', scat: ['lit', 'val'], sinc: [] };
const treeA = cs_mast_init('const x = 1;', configA);
const treeB = cs_mast_init('const y = 1;', configA);

// Same config + same NumericLiteral value (1) → same signature
// Both trees share the NumericLiteral signature
const litSig = [...treeA._signatureMap.keys()].find(s => s.includes('sha256'));
console.log(cs_mast_s_exists(treeB, litSig!)); // likely true for the literal
```
