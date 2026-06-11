---
id: configuration
title: Configuration
sidebar_position: 3
---

# Configuration (`CsMastConfig`)

Every call to [`cs_mast_init`](./api/cs-mast-init) and [`cs_mast_init_codebase`](./api/cs-mast-init-codebase) requires a `CsMastConfig` object.

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

---

## Required Fields

### `hash`

**Type:** `'sha256'`

The hash algorithm used to compute node signatures. Only `sha256` is supported in this version.

```typescript
hash: 'sha256'
```

---

### `lang`

**Type:** `string`

The shortest valid file extension for the language. This is used verbatim in the `lang=` field of every CS-MAST-S signature.

| Language | Value |
|----------|-------|
| JavaScript | `'js'` |
| TypeScript | `'ts'` |
| Python | `'py'` |
| HTML | `'htm'` |

```typescript
lang: 'js'
```

---

### `prsr`

**Type:** `string`

The parser name. Characters outside `[a-zA-Z0-9/+.-]` are **automatically replaced with `-`** before being written into the signature. This sanitization happens in `sanitizePrsr()`.

```typescript
prsr: '@babel/parser'
// stored in signature as: prsr=-babel/parser
```

---

### `scat`

**Type:** `ScatCategory[]`

Array of active [scat category](./scat-categories) codes. At least one of `scat` or `sinc` must be non-empty.

```typescript
scat: ['lit', 'val', 'id', 'name', 'decl']
```

The `scat` and `sinc` values jointly determine:

1. **Which node types are actively hashed** (added to the signature hashmap)
2. **Which formula variant to use** for each node type

:::info Category vs Modifier
`name`, `val`, and `op_name` are **modifier flags**, not structural categories. They control whether a node's name/value/operator is included in the hash input for other categories — they don't select additional node types on their own.
:::

---

### `sinc`

**Type:** `string[]`

Exact Babel node type names to include verbatim. These are deduplicated against `scat`-covered types at init time (scat wins when there is overlap).

```typescript
sinc: ['ReturnStatement', 'ThrowStatement']
```

Multiple values are joined with `_` in the signature string: `sinc=ReturnStatement_ThrowStatement`.

---

## Optional Fields

### `lver`

**Type:** `string | undefined`

Optional language version string, written into the `lver=` param of the signature.

```typescript
lver: 'es6'      // ECMAScript 6
lver: 'es2022'   // ECMAScript 2022
lver: '3.12'     // Python 3.12
```

When omitted, the `lver` field is absent from the signature string entirely.

---

### `sourceType`

**Type:** `'script' | 'module' | 'unambiguous'`  
**Default:** `'module'`

Passed to `@babel/parser` as the `sourceType` option. Use `'script'` for CommonJS files that use `require()` at the top level.

---

### `parserPlugins`

**Type:** `string[]`  
**Default:** `[]`

Additional `@babel/parser` plugins beyond the defaults (`jsx`, `typescript`). Useful for experimental syntax:

```typescript
parserPlugins: ['decorators', 'classProperties']
```

---

## Considered Elements

When both `scat` and `sinc` are specified, the set of node types that receive active hashes is:

```
Considered Elements = (node types covered by scat) ∪ (sinc types not already in scat)
```

This is Equation (1) from the spec. Nodes outside this set still receive a `computedHash` (via the default Merkle propagation formula) so their parent formulas can reference them, but they are **not added to the signature hashmap** and `cs_mast_s_exists` will not find them.

---

## Example Configurations

### Minimal — literals only

```typescript
{ hash: 'sha256', lang: 'js', prsr: '@babel/parser', scat: ['lit'], sinc: [] }
```

Hashes literal types (`StringLiteral`, `NumericLiteral`, etc.) but not their values.
Identical literal types produce identical signatures regardless of value.

### Full literal fingerprinting

```typescript
{ hash: 'sha256', lang: 'js', prsr: '@babel/parser', scat: ['lit', 'val'], sinc: [] }
```

Includes literal values — `"hello"` and `"world"` produce different signatures.

### Declaration structure analysis

```typescript
{
  hash: 'sha256', lang: 'js', lver: 'es6', prsr: '@babel/parser',
  scat: ['decl', 'lit', 'val', 'id', 'name'],
  sinc: [],
}
```

Captures full declaration structure including kinds (`let` vs `const`), identifier names, and literal values.

### Loop and conditional pattern detection

```typescript
{
  hash: 'sha256', lang: 'js', prsr: '@babel/parser',
  scat: ['loop', 'cond', 'decl', 'op', 'op_name'],
  sinc: [],
}
```

Captures control flow structure, operator behavior, and declaration structure.
