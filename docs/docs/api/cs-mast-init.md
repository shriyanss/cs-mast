---
id: cs-mast-init
title: cs_mast_init
sidebar_position: 2
---

# `cs_mast_init`

```typescript
function cs_mast_init(
  source: string,
  config: CsMastConfig,
  adapter?: IParserAdapter,
): CsMastTree
```

The primary entry point. Parses `source` code, traverses the AST post-order, computes a
CS-MAST-S hash for every node, and builds an O(1) signature hashmap.

---

## Parameters

### `source`

**Type:** `string`

Raw source code text (UTF-8). Passed verbatim to the adapter's `parse()` method.

---

### `config`

**Type:** [`CsMastConfig`](./types#csmastconfig)

Configuration object specifying the hash algorithm, language, parser, and node inclusion
settings. See the [Configuration](../configuration) page for full details.

At minimum:
```typescript
{
  hash: 'sha256',
  lang: 'js',
  prsr: '@babel/parser',
  scat: ['lit'],   // or non-empty sinc
  sinc: [],
}
```

---

### `adapter`

**Type:** [`IParserAdapter`](./types#iparseradapter) | `undefined`

**Default:** `new BabelAdapter()`

The parser adapter to use. Defaults to the built-in `BabelAdapter` (using `@babel/parser`).
Pass a custom adapter to support other languages — see [Writing an Adapter](../extending).

---

## Return Value

### `CsMastTree`

```typescript
interface CsMastTree {
  root: AdapterNode;
  rootHash: string;
  rootSignature: string;
  config: CsMastConfig;
  adapter: IParserAdapter;
  readonly _signatureMap: ReadonlyMap<string, string>;
}
```

#### `root`

The `File` node (`AdapterNode`) at the root of the mapped AST. Every descendant has
`computedHash` set. Actively-hashed nodes also have `isActivelyHashed = true` and their
Babel `_raw` node has the `cs-mast-s-hash` property attached.

#### `rootHash`

64-character lowercase SHA-256 hex hash of the root `File` node.

#### `rootSignature`

Full CS-MAST-S PHC string for the root node. Empty string if the root node is not in any
active scat/sinc category (the `File` node type is not in Table I).

#### `config`

The validated config passed to this call.

#### `adapter`

The adapter instance that was used.

#### `_signatureMap`

`ReadonlyMap<string, string>` — maps every actively-hashed node's **full CS-MAST-S signature
string** to its **dotted pathKey** (e.g. `"file.program.body.0"`). Used by `cs_mast_s_exists`.

---

## What `cs_mast_init` Does

1. Validates `config` — throws [`ConfigError`](./errors#configerror) if invalid
2. Calls `resolveConfig(config)` to compute the set of active node types
3. Calls `adapter.parse(source, config)` — throws [`ParseError`](./errors#parseerror) on syntax errors
4. Traverses the `AdapterNode` tree post-order (children before parents)
5. For each node:
   - Calls `computeNodeHash(node, resolved)` — sets `node.computedHash`
   - If `node.isActivelyHashed`: builds the full PHC signature, adds to `_signatureMap`, attaches to Babel node
6. Returns the `CsMastTree`

---

## Throws

| Error | When |
|-------|------|
| [`ConfigError`](./errors#configerror) | `hash` is unsupported, `lang`/`prsr` are missing, or both `scat` and `sinc` are empty |
| [`ParseError`](./errors#parseerror) | The adapter fails to parse `source` (syntax error) |

---

## Examples

### Basic usage

```typescript
import { cs_mast_init } from 'cs-mast';

const tree = cs_mast_init('const x = 42;', {
  hash: 'sha256', lang: 'js', prsr: '@babel/parser',
  scat: ['lit', 'val', 'decl'], sinc: [],
});

console.log(tree.rootHash); // 64-char hex
console.log(tree._signatureMap.size); // number of actively-hashed nodes
```

### Walking the signature map

```typescript
for (const [sig, pathKey] of tree._signatureMap) {
  const parsed = parseSignature(sig);
  console.log(pathKey, '→', parsed?.hashHex);
}
```

### With lver and sinc

```typescript
const tree = cs_mast_init(source, {
  hash: 'sha256', lang: 'js', lver: 'es2022',
  prsr: '@babel/parser',
  scat: ['decl', 'lit', 'val'],
  sinc: ['ReturnStatement'],
});
```

### Custom adapter

```typescript
import { cs_mast_init } from 'cs-mast';
import { BabelAdapter } from 'cs-mast';

const adapter = new BabelAdapter({ sourceType: 'script' });
const tree = cs_mast_init(commonJsSource, config, adapter);
```
