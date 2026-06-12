# Writing a Parser Adapter

To add a new language/parser to CS-MAST, implement the `IParserAdapter` interface
from `src/types/parser-adapter.ts`.

## Quick Reference

```typescript
import type { IParserAdapter, PostOrderVisitor, TraversalState } from '../../types/parser-adapter';
import type { AdapterNode } from '../../types/node-descriptor';
import type { CsMastConfig } from '../../types/config';

export class MyAdapter implements IParserAdapter {
  readonly parserName = 'my-parser/lib';   // used verbatim in prsr field (then sanitized)
  readonly lang = 'py';                     // shortest file extension
  readonly langVersion = '3.12';            // optional

  parse(source: string, config: CsMastConfig): AdapterNode { ... }
  traversePostOrder(root, visitor, state) { ... }
  resolveByPath(root, pathKey) { ... }
}
```

## Required: `parse()`

Return an `AdapterNode` tree. Every node must have:

- `nodeType`: the parser's canonical node type name (string)
- `children`: ALL direct child `AdapterNode`s in source order
- `refs`: named children needed by hash formulas (see below)
- `pathKey`: dotted bracket notation from root, e.g. `"file.body.0"`
- `_raw`: opaque back-reference to the original parser node
  (the engine attaches `cs-mast-s-hash` to this object after hashing)

Named `refs` required for each formula:
| Node type | Required refs |
|-----------|--------------|
| BinaryExpression/AssignmentExpression | `left`, `right` |
| UnaryExpression/UpdateExpression | `argument` |
| VariableDeclaration | `declarations` (array) |
| VariableDeclarator | `id`, optionally `init` |
| FunctionDeclaration | `id`, `params` (array), `body` |
| ClassDeclaration | `id`, `body`, optionally `superClass` |
| ImportDeclaration | `specifiers` (array), `source` |
| IfStatement/ConditionalExpression | `test`, `consequent` |
| SwitchStatement | `discriminant`, `cases` (array) |

Literal nodes set `value` (normalized string per A3 in CLAUDE.md).
Operator nodes set `operator`. UpdateExpression sets `prefix` (boolean).
VariableDeclaration sets `kind`. Identifier-like nodes set `name`.

## Required: `traversePostOrder()`

Walk the `AdapterNode` tree post-order: children before parent. Call `visitor(path, state)` for every node. The visitor sets `node.computedHash` and `node.isActivelyHashed`.

## Required: `resolveByPath()`

Given a dotted pathKey, return the `AdapterNode` at that path, or `null`.

## Table I Mapping

Update `src/scat/category-map.ts` to add your language's node type names for each scat category. The existing Babel mappings serve as the reference.

## Tests

Integration tests in `tests/integration/` use `BabelAdapter` directly. Create a parallel
`tests/integration/my-adapter.test.ts` following the same pattern.
