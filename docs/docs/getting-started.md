---
id: getting-started
title: Getting Started
sidebar_position: 2
---

# Getting Started

## Installation

```bash
npm install cs-mast
```

CS-MAST requires Node.js 18+. It ships CommonJS + TypeScript declaration files.

---

## Minimal Example

```typescript
import { cs_mast_init, cs_mast_s_exists } from 'cs-mast';

const tree = cs_mast_init(
  `const greet = (name) => "hello " + name;`,
  {
    hash: 'sha256',
    lang: 'js',
    lver: 'es2022',
    prsr: '@babel/parser',
    scat: ['lit', 'val', 'id', 'name', 'decl'],
    sinc: [],
  }
);

// Root hash covers the entire file
console.log(tree.rootHash);
// → e.g. "a3f2b1..."  (64-char hex, deterministic)

// O(1) lookup
console.log(cs_mast_s_exists(tree, tree.rootSignature)); // true
console.log(cs_mast_s_exists(tree, '$v=1$...$deadbeef')); // false
```

---

## Walk a Specific Node's Signature

Every Babel AST node gets a `cs-mast-s-hash` property attached after `cs_mast_init`:

```typescript
import { parse } from '@babel/parser';
import { cs_mast_init, CS_MAST_SIGNATURE_KEY } from 'cs-mast';

const source = 'const x = 42;';
const tree = cs_mast_init(source, {
  hash: 'sha256', lang: 'js', prsr: '@babel/parser',
  scat: ['lit', 'val', 'decl'], sinc: [],
});

// Access the Babel File node
const fileNode = tree.root._raw as any;
console.log(fileNode[CS_MAST_SIGNATURE_KEY]); // the File's signature (if File is actively hashed)

// The numeric literal "42" will have a signature
// Navigate the AdapterNode tree to find it
function findNode(node: any, predicate: (n: any) => boolean): any {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
}

const numLit = findNode(tree.root, (n) => n.nodeType === 'NumericLiteral');
console.log(numLit?.computedHash); // 64-char hex
```

---

## Multi-file Codebase

```typescript
import { cs_mast_init_codebase } from 'cs-mast';

const result = cs_mast_init_codebase(
  [
    { filename: 'utils.js',  source: 'export const add = (a, b) => a + b;' },
    { filename: 'index.js',  source: 'import { add } from "./utils.js";' },
  ],
  {
    hash: 'sha256', lang: 'js', prsr: '@babel/parser',
    scat: ['lit', 'decl'], sinc: [],
  }
);

console.log(result.codebaseHash);      // 64-char hex, order-independent
console.log(result.codebaseSignature); // full CS-MAST-S string
```

---

## Checking for a Known Signature

The primary use-case in a SAST scanner: check whether a previously-fingerprinted code
pattern is present in a target codebase.

```typescript
import { cs_mast_init, cs_mast_s_exists } from 'cs-mast';

const KNOWN_PATTERN_SIG =
  '$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=lit_val_decl$<known-hex>';

const targetSource = readFileSync('target.js', 'utf8');
const config = { hash: 'sha256', lang: 'js', prsr: '@babel/parser',
                 scat: ['lit', 'val', 'decl'] as const, sinc: [] };

const tree = cs_mast_init(targetSource, config);

if (cs_mast_s_exists(tree, KNOWN_PATTERN_SIG)) {
  console.log('Pattern found!');
}
```

---

## Error Handling

```typescript
import { cs_mast_init, ParseError, ConfigError } from 'cs-mast';

try {
  const tree = cs_mast_init('const = =;', { /* ... */ });
} catch (e) {
  if (e instanceof ParseError) {
    console.error('Syntax error:', e.message);
  }
}

try {
  const tree = cs_mast_init('let x = 1;', {
    hash: 'sha256', lang: 'js', prsr: '@babel/parser',
    scat: [], sinc: [], // ← both empty!
  });
} catch (e) {
  if (e instanceof ConfigError) {
    console.error('Config error:', e.message, '(field:', e.field + ')');
  }
}
```
