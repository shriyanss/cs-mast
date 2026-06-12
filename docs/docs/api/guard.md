---
id: guard
title: Guard
sidebar_position: 8
---

# Guard

The guard module provides runtime protection against accidental AST mutation.

---

## `guardPath`

```typescript
function guardPath<T extends object>(path: T): T
```

Wraps `path` in a JavaScript `Proxy` that throws [`MutationError`](./errors#mutationerror)
when any method in `RESTRICTED_METHODS` is accessed and called.

All other property accesses pass through transparently.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `T extends object` | Any object to wrap — typically a Babel `NodePath` |

### Returns

A `Proxy<T>` with identical interface, guarded against mutation.

### Example

```typescript
import { guardPath, MutationError } from '@shriyanss/cs-mast';
import traverse from '@babel/traverse';
import { parse } from '@babel/parser';

const ast = parse('const x = 1;');

traverse(ast, {
  NumericLiteral(babelPath) {
    const safePath = guardPath(babelPath);

    // Safe: read operations pass through
    console.log(safePath.node.value);    // 1
    console.log(safePath.parentPath);    // parent path

    // Blocked: mutation throws
    try {
      safePath.remove(); // ← MutationError
    } catch (e) {
      if (e instanceof MutationError) {
        console.log('Blocked:', e.method); // 'remove'
      }
    }
  }
});
```

---

## `RESTRICTED_METHODS`

```typescript
const RESTRICTED_METHODS: readonly string[]
```

The list of `@babel/traverse` `NodePath` method names that the guard blocks:

```typescript
[
  'replaceWith',
  'replaceWithMultiple',
  'replaceWithSourceString',
  'replaceInline',
  'insertBefore',
  'insertAfter',
  'remove',
  'pushContainer',
  'unshiftContainer',
]
```

---

## `makeGuard`

```typescript
function makeGuard(methodName: string): () => never
```

Returns a function that always throws `MutationError` for the given method name.
Used internally by `guardPath` for each restricted method.

### Example

```typescript
import { makeGuard, MutationError } from '@shriyanss/cs-mast';

const guard = makeGuard('remove');
guard(); // throws MutationError: "CS-MAST mutation guard: 'remove' is not allowed..."
```
