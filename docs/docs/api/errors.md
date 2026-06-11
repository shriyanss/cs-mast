---
id: errors
title: Errors
sidebar_position: 7
---

# Errors

CS-MAST exports three error classes, all extending `Error`.

---

## `ParseError`

Thrown by `cs_mast_init` (via the adapter's `parse()` method) when the source code cannot
be parsed — for example, due to a syntax error.

```typescript
class ParseError extends Error {
  readonly source: string;     // the raw source string that failed
  readonly parserName: string; // e.g. '@babel/parser'
}
```

### Example

```typescript
import { cs_mast_init, ParseError } from 'cs-mast';

try {
  cs_mast_init('const = =;', config);
} catch (e) {
  if (e instanceof ParseError) {
    console.error('Parse failed:', e.message);
    console.error('Parser:', e.parserName);
  }
}
```

---

## `ConfigError`

Thrown by `cs_mast_init` when the `CsMastConfig` is invalid.

```typescript
class ConfigError extends Error {
  readonly field: string; // which field is invalid, e.g. 'hash', 'scat/sinc'
}
```

### Causes

| Condition | `field` |
|-----------|---------|
| `hash` is missing or unsupported | `'hash'` |
| `lang` is missing | `'lang'` |
| `prsr` is missing | `'prsr'` |
| Both `scat` and `sinc` are empty | `'scat/sinc'` |

### Example

```typescript
import { cs_mast_init, ConfigError } from 'cs-mast';

try {
  cs_mast_init('let x = 1;', {
    hash: 'sha256', lang: 'js', prsr: '@babel/parser',
    scat: [],  // ← empty
    sinc: [],  // ← empty
  });
} catch (e) {
  if (e instanceof ConfigError) {
    console.error(`Invalid config field: ${e.field}`);
    // → "Invalid config field: scat/sinc"
  }
}
```

---

## `MutationError`

Thrown by the `guardPath()` proxy when a restricted mutation method is called on a CS-MAST
tree path. See [Mutation Guard](../mutation-guard).

```typescript
class MutationError extends Error {
  readonly method: string; // name of the blocked method, e.g. 'remove'
}
```

### Example

```typescript
import { guardPath, MutationError } from 'cs-mast';

const safePath = guardPath(babelNodePath);

try {
  safePath.remove();
} catch (e) {
  if (e instanceof MutationError) {
    console.error(`Blocked: ${e.method}`);
    // → "Blocked: remove"
    console.error(e.message);
    // → "CS-MAST mutation guard: 'remove' is not allowed..."
  }
}
```
