---
id: intro
title: Introduction
sidebar_position: 1
slug: /
---

# CS-MAST

**Context-Stratified Merkelized Abstract Syntax Tree** (CS-MAST) is a deterministic hashing
scheme that attaches Merkle-style cryptographic signatures to every node of an Abstract Syntax
Tree. It is designed for use in Static Application Security Testing (SAST) scanners that need to:

- **Fingerprint code patterns** across large or heavily obfuscated JavaScript codebases
- **Detect structural equivalences** — two subtrees with the same signature are structurally and semantically identical under the chosen configuration
- **Perform constant-time lookups** — O(1) `cs_mast_s_exists()` backed by a hashmap built at init time

This package is the **reference TypeScript implementation** of the CS-MAST specification.

---

## The Problem CS-MAST Solves

Prior Merkle-style hashing of ASTs (e.g. in the URR system) suffered from **hash collisions** between nodes that were structurally identical but semantically distinct — for example, `let x = 1` and `const x = 1` would produce the same hash despite having different semantics.

CS-MAST addresses this with the **CS-MAST Signature (CS-MAST-S)**: a parameterized, PHC-style string that cryptographically binds the hash algorithm, language, parser, and node element inclusion settings directly to each node's SHA-256 digest.

---

## Core Concepts

### CS-MAST

The complete AST extended with CS-MAST-S signatures. Every node carries:
- Its original AST properties
- A `cs-mast-s-hash` property containing the full CS-MAST-S signature string

### CS-MAST-S

The signature value on each node — a single string encoding both the config parameters used during hashing and the resulting cryptographic digest:

```
$v=1$hash=sha256,lang=js,lver=es6,prsr=-babel/parser,scat=lit_val_decl$<64-char-hex>
```

### scat (settings-category)

Groups of node types that can be included in hashing as a category. For example, `lit` covers all scalar literals; `decl` covers all declaration statements.

### sinc (settings-include)

Specific individual node types included verbatim, complementing scat categories.

---

## What's in This Package

| Module | Description |
|--------|-------------|
| `cs_mast_init` | Parse source, compute all hashes, build the lookup hashmap |
| `cs_mast_s_exists` | O(1) signature lookup |
| `cs_mast_init_codebase` | Multi-file codebase-level hash |
| `parseSignature` / `buildSignature` | CS-MAST-S PHC string codec |
| `BabelAdapter` | `@babel/parser` implementation of `IParserAdapter` |
| `guardPath` | Proxy that blocks mutation of the tree |

---

## Spec Reference

This implementation follows the CS-MAST specification. The authoritative source is:

> Shriyans Sudhi, "Context-Stratified Merkelized Abstract Syntax Tree (CS-MAST): A Deterministic
> Hashing Scheme for General-Tree ASTs in SAST Scanners", Rochester Institute of Technology.

See [Design Decisions](./design-decisions) for all places where the spec leaves a detail
unspecified and the assumption made in this implementation.
