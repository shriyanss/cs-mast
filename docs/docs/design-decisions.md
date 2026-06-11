---
id: design-decisions
title: Design Decisions (A1–A11)
sidebar_position: 9
---

# Design Decisions

The CS-MAST spec uses `+` for concatenation throughout but leaves several implementation
details unspecified. Every ambiguity is resolved below with a concrete, documented assumption.
These decisions are encoded in `src/hash/hash-input-builder.ts` and `src/hash/hash-formulas.ts`.

---

## A1 — Separator Between Components

**Assumption:** No separator between concatenated hash-input components (raw UTF-8 concatenation).

**Rationale:** The spec uses `+` without specifying a delimiter. A separator would require
escaping rules for any component whose value might contain the separator character. Each
component is either:
- A fixed-length SHA-256 hex (64 chars, only `[0-9a-f]`)
- A well-typed string token (node type names, `"true"`/`"false"`, numeric strings)

No separator is needed for disambiguation, and adding one would diverge from the spec text.

---

## A2 — NodeType Stringification

**Assumption:** `NodeType` = exact Babel `node.type` string, e.g. `"StringLiteral"`,
`"FunctionDeclaration"`. Never lowercased or abbreviated.

**Why:** Babel's `node.type` is the canonical identifier in the Babel AST ecosystem.

---

## A3 — Literal Value Encoding

| Literal type | `value` string |
|-------------|---------------|
| `NullLiteral` | `"null"` (Babel carries no `.value` property on NullLiteral) |
| `BooleanLiteral` | `"true"` or `"false"` |
| `NumericLiteral` | `String(node.value)` — JS default number→string |
| `BigIntLiteral` | `node.value` (already a decimal string in Babel, e.g. `"9007199254740993"`) |
| `RegExpLiteral` | `"/" + pattern + "/" + sortedFlags` (flags sorted alphabetically: `gi` and `ig` → same hash) |
| `StringLiteral` | `node.value` (parsed Unicode, **not** the quoted JS form) |

---

## A4 — Unary and Update Operators

The spec describes operator formulas only for binary nodes (left + operator + right).
`UnaryExpression` and `UpdateExpression` have a single `argument`, not left/right.

**Assumption:**

| Case | Formula (with `op_name`) | Formula (without `op_name`) |
|------|--------------------------|------------------------------|
| Prefix unary/update (`!x`, `++i`) | `sha256(OpName + ArgHash)` | `sha256(ArgHash)` |
| Postfix update (`i++`, `i--`) | `sha256(ArgHash + OpName)` | `sha256(ArgHash)` |

**Rationale:** The operator position in the source string (prefix vs postfix) is semantically
meaningful and should be reflected in the hash order.

---

## A5 — Node Path Format

**Truncation in spec:** Section IV-B-2b says "The format of the node path depends on the
parser being used. For example, in @babel/parser" — and the sentence is cut off.

**Assumption:** Dotted bracket notation from the file root:
```
file.program.body.0.declarations.0
```

Built by concatenating the parent's `pathKey`, a `.`, and the key or index.

---

## A6 — VariableDeclarator Always Includes NodeType

Equations 10 and 11 always include `"VariableDeclarator"` as the first hash-input component.
Unlike `VariableDeclaration` (equations 8/9), there is no conditional on `decl` being in scat.

**Assumption:** `VariableDeclarator` always uses eq10/11 regardless of configuration.

**Rationale:** The spec text for equations 10/11 has no `decl`-active condition. This is
intentional — `VariableDeclarator` is a structural binding node, not a declaration in the
`decl` category. Its node type is always included.

---

## A7 — Conditional Double-Hash (eq 20/21)

The spec writes: `Hash(Hash(NodeType) + Hash(Test) + Hash(Consequent))`.

**Assumption:** Implemented literally. Each inner component is SHA-256'd first (producing a
64-char hex), then those hex strings are concatenated and the outer SHA-256 is applied.

```
inner1 = sha256(nodeType)            # 64-char hex
inner2 = sha256(testNode.computedHash) # 64-char hex
inner3 = sha256(consequentNode.computedHash) # 64-char hex
outer  = sha256(inner1 + inner2 + inner3)
```

This is domain separation: the outer hash inputs are always fixed-length.

---

## A8 — Codebase Hash: Concatenation vs. Hash-of-Concatenation

The spec says: "hash portions … sorted … concatenated together to generate a single hash portion."

The word **"hash portion"** normally implies a fixed-length SHA-256 value (64 chars). But
naively concatenating N×64 chars produces a 128–N×64 char string, not a proper hash.

**Assumption:** Sort all root hash hex strings ASCII-ascending, concatenate them, then apply
one final SHA-256 to produce a proper 64-char codebase hash:

```
codebaseHash = sha256(sorted([h1, h2, ...]).join(''))
```

**Flag:** If the spec intended raw concatenation (resulting in a non-fixed-length output),
this assumption would be wrong. This is documented in `src/core/codebase-hash.ts`.

---

## A9 — Loop Child Sort Order

**Assumption:** Sort the 64-char hex **hash strings** themselves ASCII-ascending. The sort
is over hash values, not node type names.

---

## A10 — sinc Deduplication

**Assumption:** scat-covered node types win over sinc.

`resolveConfig()` computes the set of scat-covered types first. Any `sinc` entry whose type
is already covered by scat is silently dropped. This prevents the same node from being hashed
twice with conflicting formulas.

---

## A11 — Default Formula for Uncategorized Nodes

The spec only defines formulas for nodes in active categories. Nodes not in any active
scat/sinc still need a `computedHash` so parent formulas (e.g. `FunctionDeclaration` needing
`BodyHash` from its `BlockStatement` body) have valid inputs.

**Assumption:** Uncategorized nodes use the default Merkle propagation:

```
sha256(nodeType + concat(child.computedHash for child in children))
```

Uncategorized nodes are **not added to the signature hashmap** — `cs_mast_s_exists` will
not find them. Their hashes propagate upward silently.

---

## Declaration Nodes — Always Apply Formula

**Additional decision (not explicitly numbered in the plan):** Declaration node types
(`VariableDeclaration`, `FunctionDeclaration`, `ClassDeclaration`, `ImportDeclaration`)
always use their specific formulas (eq 8–18). The `decl` scat flag is a **variant selector**
(controls whether `NodeType` appears in the hash input), not a gate that decides whether the
formula runs.

This differs from loop and conditional categories, where the category flag IS a gate:
- `loop` not in scat → loop node uses the default formula
- `decl` not in scat → declaration node still uses its specific formula, but in the "without decl" variant

This ensures that `VariableDeclaration` always hashes its `VariableDeclarator` children
consistently, and `FunctionDeclaration` always incorporates its `id`, params, and body.
