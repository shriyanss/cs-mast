---
id: extending
title: Writing an Adapter
sidebar_position: 8
---

# Writing a Parser Adapter

CS-MAST separates all parser-specific code behind the `IParserAdapter` interface. The Babel
adapter is the only built-in implementation, but you can add support for any other language
or parser by implementing this interface.

---

## The Interface

```typescript
interface IParserAdapter {
  readonly parserName: string;    // e.g. '@babel/parser', 'tree-sitter/python'
  readonly lang: string;          // shortest file extension, e.g. 'py', 'ts'
  readonly langVersion?: string;  // optional default, e.g. '3.12'

  parse(source: string, config: CsMastConfig): AdapterNode;
  traversePostOrder(root: AdapterNode, visitor: PostOrderVisitor, state: TraversalState): void;
  resolveByPath(root: AdapterNode, pathKey: string): AdapterNode | null;
}
```

---

## `AdapterNode` Shape

The adapter must map every parser node to this structure:

```typescript
interface AdapterNode {
  nodeType: string;           // canonical type name, e.g. 'FunctionDeclaration'
  name?: string;              // for identifiers: 'myVar', '#privateField'
  value?: string;             // for literals: normalized string (see below)
  operator?: string;          // for operators: '+', '===', '&&'
  kind?: string;              // for VariableDeclaration: 'var'|'let'|'const'
  prefix?: boolean;           // for UpdateExpression: true=prefix (++x), false=postfix (x++)
  children: AdapterNode[];    // ALL direct children in source order
  refs: Record<string, AdapterNode | AdapterNode[] | undefined>; // named access
  pathKey: string;            // dotted path from root, e.g. 'file.program.body.0'
  _raw?: unknown;             // opaque back-reference to original parser node
  // Set by the engine during traversal — do not pre-populate:
  computedHash?: string;
  isActivelyHashed?: boolean;
}
```

---

## Required `refs` by Formula

The hash engine accesses children via `refs`. Populate these for each node type:

| Node type | `refs` keys |
|-----------|------------|
| `BinaryExpression`, `AssignmentExpression` | `left`, `right` |
| `UnaryExpression`, `UpdateExpression` | `argument` |
| `VariableDeclaration` | `declarations` (array) |
| `VariableDeclarator` | `id`, optionally `init` |
| `FunctionDeclaration` | `id`, `params` (array), `body` |
| `ClassDeclaration` | `id`, `body`, optionally `superClass` |
| `ImportDeclaration` | `specifiers` (array), `source` |
| `IfStatement`, `ConditionalExpression` | `test`, `consequent` |
| `SwitchStatement` | `discriminant`, `cases` (array) |

---

## `value` Normalization

For literal nodes, normalize the `value` field as follows:

| Literal type | Value string |
|-------------|-------------|
| Null / `None` | `"null"` |
| Boolean | `"true"` or `"false"` |
| Numeric | `String(rawValue)` |
| BigInt | decimal string (no `n` suffix) |
| Regex | `"/pattern/sortedFlags"` (flags sorted alphabetically) |
| String | raw parsed Unicode (not quoted) |

---

## `parse()` Implementation

```typescript
parse(source: string, config: CsMastConfig): AdapterNode {
  try {
    const ast = myParser.parse(source, { version: config.lver });
    return this.mapNode(ast, 'root');
  } catch (err) {
    throw new ParseError(String(err), source, this.parserName);
  }
}

private mapNode(parserNode: any, pathKey: string): AdapterNode {
  const node: AdapterNode = {
    nodeType: parserNode.type,
    children: [],
    refs: {},
    pathKey,
    _raw: parserNode,
  };

  // Set node-specific fields
  if (parserNode.type === 'Identifier') node.name = parserNode.name;
  if (parserNode.type === 'StringLiteral') node.value = parserNode.value;
  // ... etc.

  // Recursively map children using your parser's visitor keys
  for (const key of getVisitorKeys(parserNode)) {
    const child = parserNode[key];
    if (Array.isArray(child)) {
      const mapped = child.map((c, i) => this.mapNode(c, `${pathKey}.${key}.${i}`));
      node.refs[key] = mapped;
      node.children.push(...mapped);
    } else if (child && typeof child === 'object' && 'type' in child) {
      const mapped = this.mapNode(child, `${pathKey}.${key}`);
      node.refs[key] = mapped;
      node.children.push(mapped);
    }
  }

  return node;
}
```

---

## `traversePostOrder()` Implementation

```typescript
traversePostOrder(root, visitor, state) {
  this.dfs(root, null, null, visitor, state);
}

private dfs(node, parent, parentPath, visitor, state) {
  const path = { node, parent, parentPath, pathKey: node.pathKey };

  // Children before parent (post-order)
  for (const child of node.children) {
    this.dfs(child, node, path, visitor, state);
  }

  visitor(path, state);
}
```

---

## `resolveByPath()` Implementation

`pathKey` is a dotted string like `"root.body.0.declarations.0"`. Navigate from the root:

```typescript
resolveByPath(root: AdapterNode, pathKey: string): AdapterNode | null {
  if (pathKey === root.pathKey) return root;

  const prefix = root.pathKey + '.';
  if (!pathKey.startsWith(prefix)) return null;

  const segments = pathKey.slice(prefix.length).split('.');
  let current: AdapterNode | null = root;

  for (const seg of segments) {
    if (!current) return null;
    const idx = parseInt(seg, 10);
    if (!isNaN(idx)) {
      current = current.children[idx] ?? null;
    } else {
      const ref = current.refs[seg];
      if (!ref) return null;
      current = Array.isArray(ref) ? (ref[0] ?? null) : ref;
    }
  }

  return current;
}
```

---

## Registering the Adapter

Pass your adapter instance to `cs_mast_init`:

```typescript
import { cs_mast_init } from 'cs-mast';
import { PythonAdapter } from './my-python-adapter';

const tree = cs_mast_init(pythonSource, config, new PythonAdapter());
```

---

## Table I Mapping

Update `src/scat/category-map.ts` to add your language's node type names for each scat
category. The existing Babel entries serve as the reference model.

---

## Tests

Follow the pattern in `tests/integration/babel-adapter.test.ts`. At minimum verify:
- `parse()` returns the correct `nodeType` for each major node class
- `traversePostOrder()` visits children before parents
- `parse()` throws `ParseError` on syntax errors
- `value` normalization is correct for all literal types
