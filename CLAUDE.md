# CS-MAST — Developer Guide

## Spec Reference

See the specification paper for the authoritative algorithm description.

---

## Commands

```bash
npm install          # install deps
npm run build        # compile TypeScript → dist/
npm test             # run all tests (Jest)
npm test -- --watch  # watch mode
npm run test:coverage
```

---

## Codebase Map

```
src/
  index.ts                     public re-export barrel
  errors.ts                    ParseError, ConfigError, MutationError
  types/
    config.ts                  CsMastConfig, ScatCategory, HashAlgorithm
    signature.ts               CsMastSignature (parsed PHC struct)
    node-descriptor.ts         AdapterNode, AdapterNodePath
    parser-adapter.ts          IParserAdapter interface, TraversalState
  hash/
    sha256.ts                  thin Node.js crypto wrapper → 64-char hex
    hash-input-builder.ts      constructs UTF-8 strings fed into SHA-256
    hash-formulas.ts           all 21 equations; computeNodeHash() entry point
  signature/
    prsr-sanitizer.ts          enforces [a-zA-Z0-9/+.-] charset for prsr field
    signature-builder.ts       buildSignature(), buildSignatureFromConfig()
    signature-parser.ts        parseSignature() → CsMastSignature | null
  scat/
    category-map.ts            Table I: Babel node type → scat category code
    category-resolver.ts       resolveConfig() → ResolvedConfig with boolean flags
    node-classifier.ts         classifyNode() → NodeClassification
  guard/
    path-guard.ts              guardPath() Proxy, makeGuard(), RESTRICTED_METHODS
  core/
    validate-config.ts         throws ConfigError on bad config
    cs-mast-init.ts            cs_mast_init() — main entry point
    cs-mast-lookup.ts          cs_mast_s_exists() — O(1) Map lookup
    codebase-hash.ts           cs_mast_init_codebase() — multi-file
  adapters/
    babel/
      babel-node-mapper.ts     Babel AST → AdapterNode tree (upfront, recursive)
      babel-adapter.ts         BabelAdapter: IParserAdapter implementation
```

---

## Architecture

**Traversal flow:**

1. `cs_mast_init(source, config)` validates config, calls `resolveConfig()`.
2. `BabelAdapter.parse()` produces an `AdapterNode` tree (upfront full mapping).
3. Post-order DFS visits every node. For each: `computeNodeHash(node, resolved)` is called.
4. Nodes in active scat/sinc get `isActivelyHashed=true`, a full PHC signature built, added to `state.signatureMap`, and `cs-mast-s-hash` attached to the Babel node.
5. All nodes (including uncategorized) get `computedHash` set for parent formula propagation.

**Parser abstraction:** All Babel-specific logic lives in `src/adapters/babel/`. Adding a new language means implementing `IParserAdapter` in a new adapter directory — zero changes to core.

---

## Documented Assumptions (A1–A12)

These decisions are encoded in `src/hash/hash-input-builder.ts` and `src/hash/hash-formulas.ts`.

| ID  | Decision                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **No separator** between hash-input components (raw UTF-8 concatenation). The spec uses `+` without specifying a delimiter. Fixed-length child hashes (64 hex chars) eliminate ambiguity.                                                                                                                              |
| A2  | NodeType = exact Babel `node.type` string (e.g. `"StringLiteral"`). Never lowercased.                                                                                                                                                                                                                                  |
| A3  | LiteralValue encoding — NullLiteral→`"null"`, BooleanLiteral→`"true"`/`"false"`, NumericLiteral→`String(value)`, BigIntLiteral→`node.value` (already a string), RegExpLiteral→`"/pattern/sortedFlags"` (flags sorted alphabetically to normalize `gi`==`ig`), StringLiteral→`node.value` (parsed Unicode, not quoted). |
| A4  | Unary/Update operators (spec only describes binary). Prefix with op_name: `Hash(OpName+ArgHash)`. Postfix with op_name: `Hash(ArgHash+OpName)`. No op_name: `Hash(ArgHash)`.                                                                                                                                           |
| A5  | Node path format: dotted bracket notation from file root, e.g. `"file.program.body.0"`.                                                                                                                                                                                                                                |
| A6  | `VariableDeclarator` always includes `"VariableDeclarator"` as first component (spec eq10/11 have no `decl` condition).                                                                                                                                                                                                |
| A7  | Conditional double-hash (eq20/21): implemented literally — inner `sha256(NodeType)`, `sha256(Test.computedHash)` etc., then outer sha256 of concatenated inner hexes.                                                                                                                                                  |
| A8  | Codebase hash: sort root hashes ASCII-ascending, concatenate, SHA-256 the result → 64-char output. Raw concatenation would yield N×64 chars (not a valid "hash portion"); one final SHA-256 produces a proper fixed-length value.                                                                                      |
| A9  | Loop child sort: sort the 64-char hex hash strings ASCII-ascending (not by node type).                                                                                                                                                                                                                                 |
| A10 | sinc deduplication: scat-covered types win. `resolveConfig()` computes scat-covered types first; sinc entries overlapping with scat are silently dropped.                                                                                                                                                              |
| A11 | Uncategorized nodes (not in any scat/sinc): default formula `sha256(nodeType + concat(children.computedHash))`. This ensures every node has a valid hash for parent formulas (Merkle propagation). Uncategorized nodes are NOT added to the signatureMap.                                                              |
| A12 | **sinc node hash formula:** `sha256(nodeType + concat(activeChild.computedHash in source order))` — only children with `isActivelyHashed===true` are included. Source order preserved (unlike loops which sort). Collapses to `sha256(nodeType)` when no children are active. Inactive child types do not leak into the hash. |

**Special rule for declaration nodes:** `VariableDeclaration`, `FunctionDeclaration`, `ClassDeclaration`, `ImportDeclaration` always use their specific formulas (eq8–18). The `decl` scat flag is a _variant selector_ (controls whether NodeType is included), not a gate. This differs from loops/conditionals where the category flag is a gate.

**Spec truncation (§IV-B-2b):** The sentence "The format of the node path depends on the parser being used. For example, in @babel/parser" is truncated in the PDF. We use dotted bracket notation (A5).

---

## Adding a New Parser Adapter

See `src/adapters/README.md`.

---

## Mutation Guard

`src/guard/path-guard.ts` wraps any object in a Proxy that throws `MutationError` for these methods:
`replaceWith`, `replaceWithMultiple`, `replaceWithSourceString`, `replaceInline`, `insertBefore`, `insertAfter`, `remove`, `pushContainer`, `unshiftContainer`.

**Limitation:** Direct property assignment `path.node.x = y` cannot be intercepted at runtime in JavaScript. TypeScript-level protection only via `Readonly<>`.

---

## Release Process

Branch strategy: `main` (locked, only `dev` merges in) → `dev` → feature branches.

### Steps

1. **Switch to `dev`** and pull latest:

    ```bash
    git checkout dev && git pull origin dev
    ```

2. **Make changes**, bump version in all three places:
    - `package.json` → `"version": "X.Y.Z"`
    - `src/version.ts` → `export const version = "X.Y.Z";`
    - `CHANGELOG.md` → add `## X.Y.Z - YYYY-MM-DD` section at the top

3. **Commit and push** to `dev`:

    ```bash
    git push origin dev
    ```

    This triggers `build-and-prettify` CI (version_check → audit → prettier → build → test).

4. **Create PR** `dev → main`:

    ```bash
    gh pr create --base main --head dev --title "chore: release vX.Y.Z" --body "..."
    ```

    The `pr-checker` workflow verifies source is `dev`; it passes immediately for `dev` PRs.

5. **Wait for all checks to pass**, then **merge**:

    Required checks on every PR:
    - `check-branch` (PR Branch Checker workflow) — verifies source branch is `dev`
    - `Build & Prettify Code` (build-and-prettify workflow) — version_check → audit → prettier → build → test
    - **Vercel** deployment preview — docs site must build successfully on Vercel

    ```bash
    gh pr merge <PR_NUMBER> --merge
    ```

6. **Create GitHub release** (triggers npm publish):
    ```bash
    gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."
    ```
    This triggers `publish-npm` CI: version_check → audit → build+test → npm publish → merge main→dev.

### Version naming

| Suffix   | npm dist-tag |
| -------- | ------------ |
| none     | `latest`     |
| `-beta`  | `beta`       |
| `-alpha` | `alpha`      |

### Required secrets

| Secret         | Purpose                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| `NPM_TOKEN`    | npm publish (referenced as `secrets.npm_token` — GitHub is case-insensitive)  |
| `GITHUB_TOKEN` | prettier auto-commit push, post-release dev merge (built-in, no setup needed) |
