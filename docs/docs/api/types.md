---
id: types
title: Types
sidebar_position: 6
---

# TypeScript Types

All types are exported from the `cs-mast` package root.

---

## `CsMastConfig`

Configuration object passed to `cs_mast_init` and `cs_mast_init_codebase`.

```typescript
interface CsMastConfig {
  hash: HashAlgorithm;
  lang: string;
  lver?: string;
  prsr: string;
  scat: ScatCategory[];
  sinc: string[];
  sourceType?: 'script' | 'module' | 'unambiguous';
  parserPlugins?: string[];
}
```

See [Configuration](../configuration) for full field descriptions.

---

## `HashAlgorithm`

```typescript
type HashAlgorithm = 'sha256';
```

Extensible union type. Only `'sha256'` is supported in this version.

---

## `ScatCategory`

```typescript
type ScatCategory =
  | 'lit' | 'id' | 'op' | 'decl' | 'loop' | 'cond'
  | 'name' | 'val' | 'op_name';
```

See [scat Categories](../scat-categories) for descriptions.

---

## `CsMastSignature`

The parsed representation of a CS-MAST-S PHC string, returned by `parseSignature`.

```typescript
interface CsMastSignature {
  version: number;      // always 1 for this spec
  hash: string;         // e.g. 'sha256'
  lang: string;         // e.g. 'js'
  lver?: string;        // optional, e.g. 'es6'
  prsr: string;         // sanitized parser name, e.g. '-babel/parser'
  scat: string[];       // active scat codes, e.g. ['lit', 'val']
  sinc: string[];       // active sinc node types, e.g. ['ReturnStatement']
  hashHex: string;      // 64-char lowercase hex SHA-256 digest
}
```

---

## `CsMastTree`

Return value of `cs_mast_init`.

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

See [`cs_mast_init`](./cs-mast-init#return-value) for field descriptions.

---

## `CodebaseResult`

Return value of `cs_mast_init_codebase`.

```typescript
interface CodebaseResult {
  trees: CsMastTree[];
  codebaseHash: string;
  codebaseSignature: string;
}
```

---

## `AdapterNode`

Language-neutral representation of a single AST node, produced by a parser adapter.

```typescript
interface AdapterNode {
  nodeType: string;
  name?: string;
  value?: string;
  operator?: string;
  kind?: string;
  prefix?: boolean;
  children: AdapterNode[];
  refs: Record<string, AdapterNode | AdapterNode[] | undefined>;
  pathKey: string;
  _raw?: unknown;
  computedHash?: string;
  isActivelyHashed?: boolean;
}
```

| Field | Description |
|-------|-------------|
| `nodeType` | Canonical node type, e.g. `'StringLiteral'` |
| `name` | For identifiers: `'myVar'`, `'#privateField'` |
| `value` | For literals: normalized value string |
| `operator` | For operators: `'+'`, `'==='`, `'&&'` |
| `kind` | For `VariableDeclaration`: `'var'` / `'let'` / `'const'` |
| `prefix` | For `UpdateExpression`: `true` = prefix (`++x`), `false` = postfix (`x++`) |
| `children` | All direct child nodes in source order |
| `refs` | Named access to specific children for formula computation |
| `pathKey` | Dotted path from root, e.g. `'file.program.body.0'` |
| `_raw` | Opaque back-reference to the original Babel node |
| `computedHash` | 64-char hex — set during post-order traversal |
| `isActivelyHashed` | `true` if this node is in an active scat/sinc category |

---

## `AdapterNodePath`

Path object passed to the post-order visitor.

```typescript
interface AdapterNodePath {
  node: AdapterNode;
  parent: AdapterNode | null;
  parentPath: AdapterNodePath | null;
  pathKey: string;
}
```

---

## `IParserAdapter`

Interface all parser adapters must implement. See [Writing an Adapter](../extending).

```typescript
interface IParserAdapter {
  readonly parserName: string;
  readonly lang: string;
  readonly langVersion?: string;
  parse(source: string, config: CsMastConfig): AdapterNode;
  traversePostOrder(root: AdapterNode, visitor: PostOrderVisitor, state: TraversalState): void;
  resolveByPath(root: AdapterNode, pathKey: string): AdapterNode | null;
}
```

---

## `TraversalState`

Mutable state threaded through post-order traversal.

```typescript
interface TraversalState {
  hashByPath: Map<string, string>;    // pathKey → 64-char hex
  signatureMap: Map<string, string>;  // full CS-MAST-S sig → pathKey
  config: CsMastConfig;
}
```

---

## `PostOrderVisitor`

Callback type for the post-order traversal.

```typescript
type PostOrderVisitor = (
  path: AdapterNodePath,
  state: TraversalState,
) => void;
```

---

## `BabelAdapterOptions`

Options for the `BabelAdapter` constructor.

```typescript
interface BabelAdapterOptions {
  sourceType?: 'script' | 'module' | 'unambiguous';
  extraPlugins?: string[];
}
```
