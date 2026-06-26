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

## A6 — VariableDeclarator NodeType Inclusion (decl-gated)

Equations 10 and 11 always include `"VariableDeclarator"` as the first hash-input component
when the formula applies. Unlike `VariableDeclaration` (equations 8/9), there is no
conditional on `decl` being in scat within the formula itself.

**Assumption:** `VariableDeclarator` uses eq10/11 **only when `decl` is in scat**. When
`decl` is absent and `VariableDeclarator` is not explicitly listed in `sinc`, it is
treated as an uncategorized node and follows the transparent passthrough rule (A11).

**Rationale:** The spec text for equations 10/11 has no `decl`-active condition, but the
equations are only reachable when the `decl` category is configured. `VariableDeclarator`
is a structural binding node subordinate to `VariableDeclaration`; without `decl` active,
the entire declaration subtree should be transparent so that sibling unconfigured constructs
are treated consistently.

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

## A11 — Transparent Passthrough for Uncategorized Nodes

The spec only defines formulas for nodes in active scat/sinc categories. Nodes not covered
by either scat or sinc — including declaration types when `decl` is absent — use a
**transparent passthrough** rather than a default Merkle formula.

**Assumption:** An uncategorized node (not in any active scat category and not in sinc)
collects its direct children's non-undefined `computedHash` values in source order and
returns:

```
sha256(concat(child.computedHash for child in children if child.computedHash is not undefined))
```

If **no** direct children have a hash, `computedHash` remains `undefined`. This propagates
upward: a subtree where no configured node types exist produces no hash at all.

**Key properties:**
- The node's own type does **not** contribute to the hash — the node is transparent.
- Only children that already have a hash (from their own category formula or their own
  transparent passthrough) are included.
- Source order is preserved (not sorted).
- If the configured scat/sinc categories match zero nodes in the file, `rootHash` is `""`
  (the empty fallback in `CsMastTree`).

Uncategorized nodes are **not added to the signature hashmap** — `cs_mast_s_exists` will
not find them.

**Distinguishing from A12:** A12 (sinc formula) includes only directly-active children
(`isActivelyHashed === true`). A11 includes any children with a non-undefined `computedHash`,
which may itself be a transparent hash from lower descendants. A12 nodes are active
fingerprinting targets; A11 nodes are transparent relays.

---

## A12 — sinc Node Hash Formula

The spec (§IV-B3 "Visiting a node in sinc") states only that "a similar methodology as
the above method can be applied." It does not provide an explicit formula.

**Assumption:** A sinc-only node's hash includes only the hashes of its **directly active
children** (`isActivelyHashed === true`), in **source order**. If no children are active,
the hash collapses to `sha256(nodeType)`.

```
sha256(nodeType + concat(child.computedHash for child in children if child.isActivelyHashed))
```

**Rationale:**

- The loop formula (eq23) is the closest precedent: it filters children to only those
  present in the configuration before hashing. sinc nodes follow the same filter rule.
- Unlike loops (which sort child hashes ASCII-ascending because iteration order is
  semantically irrelevant), **source order is preserved** for sinc nodes because child
  position is semantically meaningful in most node types (e.g. `ObjectProperty`: key
  always precedes value).
- This means enabling `ObjectProperty` in sinc without any scat categories produces
  `sha256("ObjectProperty")` for every ObjectProperty node — the value type does not
  leak into the hash, matching the principle that only configured elements are considered.

**Distinguishing from A11:** A11 (default formula) includes ALL children's hashes to
ensure uncategorized nodes propagate Merkle state correctly to their parents. A12 (sinc
formula) intentionally excludes inactive children because a sinc node is an active
fingerprinting target, not a transparent relay.

---

## Declaration Nodes — Gated on `decl`

Declaration node types (`VariableDeclaration`, `FunctionDeclaration`, `ClassDeclaration`,
`ImportDeclaration`, `VariableDeclarator`) use their specific formulas (eq 8–18, eq 10/11)
**only when `decl` is in scat**. When `decl` is absent, they are treated as uncategorized
nodes and follow the transparent passthrough rule (A11).

This means:
- `decl` in scat → declaration formula runs; `isActivelyHashed = true`; node enters the signatureMap
- `decl` not in scat, node in sinc → sinc formula (A12) runs
- `decl` not in scat, node not in sinc → transparent passthrough (A11); `isActivelyHashed = false`

This is consistent with how `loop` and `cond` work (category flag IS a gate). The previous
"always apply formula" behavior was removed to ensure that a file with no `decl` in scat
treats all declaration subtrees as transparent, enabling structural equivalence comparisons
across files that differ only in their declaration scaffolding.
