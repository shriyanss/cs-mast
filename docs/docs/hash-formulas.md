---
id: hash-formulas
title: Hash Formulas
sidebar_position: 6
---

# Hash Formulas

Every node in the CS-MAST traversal receives a `computedHash` — a 64-character lowercase
SHA-256 hexadecimal string. This page documents all 21 equations from the spec and the
default propagation formula for uncategorized nodes.

All inputs are UTF-8 strings fed to SHA-256. The `+` operator means **direct concatenation
with no separator** (spec assumption A1).

---

## Traversal Order

Hashes are computed **post-order** (children before parents). By the time a parent node is
visited, all of its children already have `computedHash` set. This is the Merkle invariant.

---

## Leaf Formulas

### Literals (eq 2 & 3)

Applies to: `StringLiteral`, `NumericLiteral`, `BooleanLiteral`, `RegExpLiteral`, `NullLiteral`, `BigIntLiteral`

**Equation 2** — `lit` **and** `val` active:
```
sha256(LiteralType + LiteralValue)
```

**Equation 3** — only `lit` active (no `val`):
```
sha256(LiteralType)
```

`LiteralType` is the exact Babel `node.type` string (e.g. `"StringLiteral"`).
`LiteralValue` is normalized — see [Design Decisions A3](./design-decisions#a3--literal-value-encoding).

---

### Identifiers (eq 4 & 5)

Applies to: `Identifier`, `PrivateName`, `JSXIdentifier`

**Equation 4** — `id` **and** `name` active:
```
sha256(NodeType + NodeName)
```

**Equation 5** — only `id` active:
```
sha256(NodeType)
```

`NodeName` for `PrivateName` is prefixed with `#` (e.g. `"#count"`).

---

## Operator Formulas (eq 6 & 7)

Applies to: `BinaryExpression`, `AssignmentExpression`, `UnaryExpression`, `UpdateExpression`

**Equation 6** — `op` **and** `op_name` active (binary):
```
sha256(LeftChildHash + OperatorName + RightChildHash)
```

**Equation 7** — only `op` active (binary):
```
sha256(LeftChildHash + RightChildHash)
```

**Unary/Update** (single operand — spec assumption A4):
```
# prefix (++x, !x, -x):
sha256(OperatorName + ArgumentHash)    # with op_name
sha256(ArgumentHash)                   # without op_name

# postfix (x++, x--):
sha256(ArgumentHash + OperatorName)    # with op_name
sha256(ArgumentHash)                   # without op_name
```

---

## Declaration Formulas

:::info Always Applied
Declaration node types always use their specific formulas regardless of whether `decl` is in
`scat`. The `decl` flag controls the **variant** (with or without `NodeType`), not whether
the formula runs.
:::

### VariableDeclarator (eq 10 & 11)

`NodeType` is **always included** (no `decl` condition — spec assumption A6):

**Equation 10** — with initializer:
```
sha256("VariableDeclarator" + IdHash + InitHash)
```

**Equation 11** — without initializer (`let x;`):
```
sha256("VariableDeclarator" + IdHash)
```

---

### VariableDeclaration (eq 8 & 9)

**Equation 8** — `decl` active:
```
sha256("VariableDeclaration" + Kind + ChildHashes)
```
`Kind` is `"var"`, `"let"`, or `"const"`. `ChildHashes` = concat of all `VariableDeclarator` child hashes in source order.

**Equation 9** — `decl` absent:
```
sha256(ChildHashes)
```

---

### FunctionDeclaration (eq 12 & 13)

**Equation 12** — `decl` active:
```
sha256("FunctionDeclaration" + IdHash + ParamHashes + BodyHash)
```

**Equation 13** — `decl` absent:
```
sha256(IdHash + ParamHashes + BodyHash)
```

`ParamHashes` = concat of all parameter node hashes in source order.

---

### ClassDeclaration (eq 14, 15 & 16)

**Equation 14** — `decl` active, superClass present:
```
sha256("ClassDeclaration" + IdHash + SuperHash + BodyHash)
```

**Equation 15** — `decl` active, no superClass:
```
sha256("ClassDeclaration" + IdHash + BodyHash)
```

**Equation 16** — `decl` absent:
```
sha256(IdHash + BodyHash)
```

---

### ImportDeclaration (eq 17 & 18)

**Equation 17** — `decl` active:
```
sha256("ImportDeclaration" + SpecifierHashes + SourceHash)
```

**Equation 18** — `decl` absent:
```
sha256(SpecifierHashes + SourceHash)
```

`SpecifierHashes` = concat of all specifier node hashes in source order.
`SourceHash` = hash of the `StringLiteral` module path.

---

## Loop Formula (eq 19)

Applies to: `ForStatement`, `WhileStatement`, `DoWhileStatement`, `ForInStatement`, `ForOfStatement`

```
sha256(NodeType + SortedActiveChildHashes)
```

Two rules:
1. **Sort**: child hash hex strings are sorted **ASCII-ascending** before concatenation.
2. **Filter**: only direct children with `isActivelyHashed === true` are included.

---

## Conditional Formulas (eq 20 & 21)

Applies to: `IfStatement`, `SwitchStatement`, `ConditionalExpression`

These formulas use **double-hashing** — each component is SHA-256'd individually before being concatenated for the outer hash (spec assumption A7).

**Equation 20** — `cond` **and** `val` active:
```
sha256(
  sha256(NodeType) +
  sha256(TestNodeHash) +
  sha256(ConsequentHash)
)
```

**Equation 21** — only `cond` active:
```
sha256(
  sha256(NodeType) +
  sha256(ConsequentHash)
)
```

| Node type | `Test` field | `Consequent` field |
|-----------|-------------|-------------------|
| `IfStatement` | `test` | `consequent` |
| `ConditionalExpression` | `test` | `consequent` |
| `SwitchStatement` | `discriminant` | concat of `cases` hashes |

The `alternate` branch (else/default) is **not included** in the hash per the spec.

---

## Default Formula (Uncategorized Nodes)

For any node type not in any active category and not in `sinc`:

```
sha256(NodeType + concat(child.computedHash for child in children))
```

This is the standard Merkle propagation. It ensures every node can provide a valid hash to
its parent's formula — for example, a `BlockStatement` (not in any scat category) still
propagates its children's hashes upward so a `FunctionDeclaration` can use `BodyHash`.

Uncategorized nodes are **not added to the signature hashmap** — `cs_mast_s_exists` will
not find them.
