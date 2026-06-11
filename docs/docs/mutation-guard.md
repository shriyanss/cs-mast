---
id: mutation-guard
title: Mutation Guard
sidebar_position: 7
---

# Mutation Guard

CS-MAST signatures are computed once at init time. **Modifying the AST after initialization
invalidates all computed signatures** — the hashmap will contain stale entries that no longer
correspond to the actual tree.

To prevent accidental mutations, CS-MAST provides a `guardPath()` proxy that throws a
`MutationError` when any of the restricted Babel methods are called.

---

## Restricted Methods

The following `@babel/traverse` `NodePath` methods are blocked (Table II from the spec):

| Method | Category | What it does |
|--------|----------|-------------|
| `replaceWith(node)` | Replacement | Substitutes the targeted node with a new AST node |
| `replaceWithMultiple(nodes)` | Replacement | Replaces with an array of nodes |
| `replaceWithSourceString(src)` | Replacement | Replaces with a parsed source string |
| `replaceInline(node)` | Replacement | Inline node substitution |
| `insertBefore(nodes)` | Insertion | Inserts sibling nodes before the current node |
| `insertAfter(nodes)` | Insertion | Inserts sibling nodes after the current node |
| `remove()` | Removal | Deletes the node and its subtree |
| `pushContainer(key, nodes)` | Array mutation | Appends children to a block |
| `unshiftContainer(key, nodes)` | Array mutation | Prepends children to a block |

---

## Usage

```typescript
import { guardPath, MutationError } from 'cs-mast';

// Wrap any object (typically a Babel NodePath) to block mutation
const safePath = guardPath(babelNodePath);

try {
  safePath.remove(); // ← throws MutationError
} catch (e) {
  if (e instanceof MutationError) {
    console.error(`Blocked mutation: ${e.method}`);
    // → "Blocked mutation: remove"
  }
}
```

---

## MutationError

```typescript
class MutationError extends Error {
  readonly method: string; // name of the blocked method
}
```

The error message explains what happened and how to fix it:

```
CS-MAST mutation guard: 'remove' is not allowed on a CS-MAST tree.
Modifying a node invalidates all computed signatures.
Re-run cs_mast_init after any structural change.
```

---

## Sanctioned Remediation Pattern

When you need to modify the AST after matching a signature, the correct approach is:

1. Record the `pathKey` from the signature hashmap (`tree._signatureMap.get(sig)`)
2. Perform your modifications on the **original Babel AST** (outside the guard) or on a copy
3. Call `cs_mast_init` again on the updated source to get a fresh tree

```typescript
const tree = cs_mast_init(source, config);

// Find a node via its signature
const pathKey = tree._signatureMap.get(knownSig);
if (pathKey) {
  // For destructive operations, work on the original Babel AST directly
  // and reinitialize after changes
  const babelAst = parse(source, { sourceType: 'module' });
  traverse(babelAst, {
    enter(path) {
      // ... your mutation here
    }
  });
  const newSource = generate(babelAst).code;
  const newTree = cs_mast_init(newSource, config);
}
```

---

## Runtime Limitation

Direct property assignment (`path.node.name = 'newName'`) **cannot be intercepted** at
runtime by a JavaScript Proxy targeting method calls. This is documented as a known
limitation. TypeScript-level protection is provided via `Readonly<>` types, but runtime
enforcement is not possible without wrapping every property access.
