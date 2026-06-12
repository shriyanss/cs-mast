# CS-MAST

**Context-Stratified Merkelized Abstract Syntax Tree** — reference TypeScript implementation.

CS-MAST extends an AST with Merkle-style cryptographic signatures (CS-MAST-S) on every node,
enabling constant-time fingerprint lookup and deterministic subtree matching in SAST scanners.
See the specification paper for the full algorithm description.

---

## Install

```bash
npm install @shriyanss/cs-mast
```

---

## Quick Start

```typescript
import { cs_mast_init, cs_mast_s_exists } from "@shriyanss/cs-mast";

const tree = cs_mast_init(`const greet = (name) => "hello " + name;`, {
    hash: "sha256",
    lang: "js",
    lver: "es2022",
    prsr: "@babel/parser",
    scat: ["lit", "val", "id", "name", "decl"],
    sinc: [],
});

console.log(tree.rootSignature);
// $v=1$hash=sha256,lang=js,lver=es2022,prsr=-babel/parser,scat=lit_val_id_name_decl$<hex>

console.log(cs_mast_s_exists(tree, tree.rootSignature)); // true
console.log(cs_mast_s_exists(tree, "$v=1$...$fake")); // false
```

---

## API

### `cs_mast_init(source, config, adapter?)`

Parses `source`, traverses post-order, attaches `cs-mast-s-hash` to every actively-hashed
Babel node, and builds the O(1) signature hashmap.

```typescript
interface CsMastTree {
    root: AdapterNode; // File node — every descendant has computedHash set
    rootHash: string; // 64-char hex of the File node
    rootSignature: string; // full PHC signature of root (empty if root not actively hashed)
    config: CsMastConfig;
    adapter: IParserAdapter;
    readonly _signatureMap: ReadonlyMap<string, string>; // full-sig → pathKey
}
```

### `cs_mast_s_exists(tree, signature)`

O(1) boolean lookup backed by the hashmap built during init. Accepts the full PHC signature string.

### `cs_mast_init_codebase(files, config, adapter?)`

Process multiple files with the same config, derive a codebase-level hash:

```typescript
const result = cs_mast_init_codebase(
    [
        { filename: "a.js", source: "..." },
        { filename: "b.js", source: "..." },
    ],
    config
);
result.codebaseHash; // sha256(sorted([h1,h2,...]).join('')) — order-independent
result.codebaseSignature; // full PHC string with codebaseHash
```

### `parseSignature(sig)` / `buildSignature(parts)`

Encode and decode CS-MAST-S PHC strings. `parseSignature` returns `null` for invalid input.

---

## Config (`CsMastConfig`)

| Field  | Required | Description                                                            |
| ------ | -------- | ---------------------------------------------------------------------- |
| `hash` | yes      | Hash algorithm. Only `'sha256'` supported.                             |
| `lang` | yes      | Shortest file extension, e.g. `'js'`.                                  |
| `lver` | no       | Language version, e.g. `'es6'`, `'es2022'`.                            |
| `prsr` | yes      | Parser name. Characters outside `[a-zA-Z0-9/+.-]` are replaced by `-`. |
| `scat` | yes\*    | Active scat category codes (see Table I below).                        |
| `sinc` | yes\*    | Exact Babel node type names to include verbatim.                       |

\*At least one of `scat` or `sinc` must be non-empty.

### `scat` Categories (Table I from spec)

| Code      | Babel Node Types                                                                         | Behaviour                                                                |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `lit`     | StringLiteral, NumericLiteral, BooleanLiteral, RegExpLiteral, NullLiteral, BigIntLiteral | Hash literal type; add value if `val` also active                        |
| `id`      | Identifier, PrivateName, JSXIdentifier                                                   | Hash node type; add name if `name` also active                           |
| `op`      | Binary/Unary/Update/AssignmentExpression                                                 | Hash child hashes; add operator symbol if `op_name` active               |
| `decl`    | VariableDeclaration, FunctionDeclaration, ClassDeclaration, ImportDeclaration            | Include node type/kind in hash                                           |
| `loop`    | For/While/DoWhile/ForIn/ForOfStatement                                                   | `sha256(NodeType + sortedActiveChildHashes)`                             |
| `cond`    | IfStatement, SwitchStatement, ConditionalExpression                                      | Double-hash: `sha256(sha256(NodeType)+sha256(Test?)+sha256(Consequent))` |
| `name`    | Modifier — adds `.name` to identifier hashes                                             | —                                                                        |
| `val`     | Modifier — adds `.value` to literal and conditional hashes                               | —                                                                        |
| `op_name` | Modifier — adds `.operator` to operator hashes                                           | —                                                                        |

---

## CS-MAST-S Signature Format

```
$v=1$hash=sha256,lang=js,lver=es6,prsr=-babel/parser,scat=lit_val_id,sinc=IfStatement$<64hex>
```

- No salt — salting would break the determinism required for subtree matching.
- Multiple `scat` / `sinc` values joined by `_`.
- Hash portion: always 64-char lowercase SHA-256 hex.

---

## Mutation Guard

Calling any of the following on a CS-MAST tree node path throws `MutationError`:
`replaceWith`, `replaceWithMultiple`, `replaceWithSourceString`, `replaceInline`,
`insertBefore`, `insertAfter`, `remove`, `pushContainer`, `unshiftContainer`.

To modify source code, call `cs_mast_init` again on the updated source.

---

## Extending to New Languages

Implement `IParserAdapter` from `src/types/parser-adapter.ts`. See `src/adapters/README.md`.

---

## Spec Ambiguities

See `CLAUDE.md` sections A1–A11 for all documented assumptions where the spec leaves details
unspecified (separator policy, unary operator handling, codebase hash construction, etc.).
