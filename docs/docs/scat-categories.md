---
id: scat-categories
title: scat Categories
sidebar_position: 5
---

# `scat` Categories

The `scat` field selects which AST node categories are actively hashed. This is **Table I** from the CS-MAST spec, reproduced in full.

---

## Structural Categories

These categories select specific Babel node types.

### `lit` — Literals

**Babel AST node types:** `StringLiteral`, `NumericLiteral`, `BooleanLiteral`, `RegExpLiteral`, `NullLiteral`, `BigIntLiteral`

Includes all static scalar values.

**With `val` modifier:** `Hash(LiteralType + LiteralValue)` — distinct hash per value  
**Without `val`:** `Hash(LiteralType)` — all literals of the same type share a hash

```typescript
// val active: "hello" ≠ "world"
scat: ['lit', 'val']

// val absent: "hello" == "world" (same type StringLiteral)
scat: ['lit']
```

:::note RegExpLiteral normalization
Regex flags are **sorted alphabetically** before hashing: `/foo/gi` and `/foo/ig` produce the same hash.
:::

---

### `id` — Identifiers

**Babel AST node types:** `Identifier`, `PrivateName`, `JSXIdentifier`

Includes variable names, function names, and property access names.

**With `name` modifier:** `Hash(NodeType + NodeName)` — distinct hash per identifier name  
**Without `name`:** `Hash(NodeType)` — all identifiers share one hash

```typescript
// name active: 'x' ≠ 'y'
scat: ['id', 'name']

// name absent: 'x' == 'y'
scat: ['id']
```

:::warning Minification
`id` with `name` is **highly volatile** under minification — minifiers rename identifiers,
producing completely different signatures. Use without `name` for structure-only matching.
:::

---

### `op` — Operators

**Babel AST node types:** `BinaryExpression`, `UnaryExpression`, `UpdateExpression`, `AssignmentExpression`

Captures the specific behavior of operations.

**With `op_name` modifier:** operator symbol is included in the hash  
**Without `op_name`:** only child structure matters

```typescript
// op_name active: a+b ≠ a-b
scat: ['op', 'op_name']

// op_name absent: a+b == a-b (same structure)
scat: ['op']
```

**Unary/Update operators (prefix vs postfix):**
- Prefix `++x`: `Hash("++" + argumentHash)`
- Postfix `x++`: `Hash(argumentHash + "++")`

---

### `decl` — Declarations

**Babel AST node types:** `VariableDeclaration`, `FunctionDeclaration`, `ClassDeclaration`, `ImportDeclaration`

Retains structural context modifiers.

When **active**: node type (and for `VariableDeclaration`, the `kind` field) is included in the hash. This distinguishes `let x = 1` from `const x = 1`.

When **absent**: node type is excluded from the hash (reduced form equations 9, 13, 16, 18).

:::info URR Collision Fix
The `decl` category directly fixes the collision observed in the URR system:
`let x = 1` and `const x = 1` now produce **different** signatures when `decl` is active.
:::

---

### `loop` — Control Flow / Loops

**Babel AST node types:** `ForStatement`, `WhileStatement`, `DoWhileStatement`, `ForInStatement`, `ForOfStatement`

Isolates block looping patterns.

**Formula:** `Hash(NodeType + sortedActiveChildHashes)`

Child hashes are sorted **ASCII-ascending** by their hex value before concatenation, then only children that are **actively hashed** (in the configured scat/sinc) are included.

---

### `cond` — Conditionals

**Babel AST node types:** `IfStatement`, `SwitchStatement`, `ConditionalExpression`

Groups branching and decision-making patterns.

**With `val` modifier:** `Hash(Hash(NodeType) + Hash(test) + Hash(consequent))`  
**Without `val`:** `Hash(Hash(NodeType) + Hash(consequent))`

Note the **double-hashing** — each component is SHA-256'd individually, then the outer hash is computed over the concatenation of those inner hashes. This is literal per the spec equations 20/21.

For `SwitchStatement`, `test` maps to `discriminant` and `consequent` to the `cases` array.

---

## Cross-Cutting Modifiers

These codes do **not** select node types — they modify how other categories hash their data.

### `name` — Node Name

Adds the `name` property to identifier hashes (affects the `id` category).

### `val` — Node Value

Adds the `value` property to:
- Literal hashes (affects the `lit` category)
- Conditional test hashes (affects the `cond` category)

### `op_name` — Operator Name

Adds the `operator` property to operator expression hashes (affects the `op` category).

---

## sinc — Exact Node Inclusion

`sinc` lists specific Babel node type names to hash verbatim. The formula used is the same
default Merkle propagation: `sha256(nodeType + concat(childHashes))`.

```typescript
sinc: ['ReturnStatement', 'ThrowStatement']
```

**Deduplication rule:** If a node type named in `sinc` is already covered by an active `scat`
category, the `sinc` entry is silently dropped (scat takes precedence).

---

## Summary Table

| Code | Formal Name | Babel Node Types | Modifier |
|------|-------------|-----------------|---------|
| `lit` | Literals | String/Numeric/Boolean/RegExp/Null/BigIntLiteral | `val` |
| `id` | Identifiers | Identifier, PrivateName, JSXIdentifier | `name` |
| `op` | Operators | Binary/Unary/Update/AssignmentExpression | `op_name` |
| `decl` | Declarations | VariableDeclaration, FunctionDeclaration, ClassDeclaration, ImportDeclaration | — |
| `loop` | Control Flow | For/While/DoWhile/ForIn/ForOfStatement | — |
| `cond` | Conditionals | If/SwitchStatement, ConditionalExpression | `val` |
| `name` | Node Name | *(modifier)* | — |
| `val` | Node Value | *(modifier)* | — |
| `op_name` | Operator Name | *(modifier)* | — |
