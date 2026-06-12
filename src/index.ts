// ─── Core functions ───────────────────────────────────────────────────────────
export { cs_mast_init, CS_MAST_SIGNATURE_KEY } from "./core/cs-mast-init";
export type { CsMastTree } from "./core/cs-mast-init";
export { cs_mast_s_exists } from "./core/cs-mast-lookup";
export { cs_mast_init_codebase } from "./core/codebase-hash";
export type { CodebaseResult } from "./core/codebase-hash";

// ─── Signature utilities ──────────────────────────────────────────────────────
export { buildSignature, buildSignatureFromConfig } from "./signature/signature-builder";
export { parseSignature } from "./signature/signature-parser";
export { sanitizePrsr } from "./signature/prsr-sanitizer";

// ─── Types ────────────────────────────────────────────────────────────────────
export type { CsMastConfig, HashAlgorithm, ScatCategory } from "./types/config";
export type { CsMastSignature } from "./types/signature";
export type { AdapterNode, AdapterNodePath } from "./types/node-descriptor";
export type { IParserAdapter, PostOrderVisitor, TraversalState } from "./types/parser-adapter";

// ─── Errors ───────────────────────────────────────────────────────────────────
export { ParseError, ConfigError, MutationError } from "./errors";

// ─── Adapters ─────────────────────────────────────────────────────────────────
export { BabelAdapter } from "./adapters/babel/babel-adapter";
export type { BabelAdapterOptions } from "./adapters/babel/babel-adapter";

// ─── Guard ────────────────────────────────────────────────────────────────────
export { guardPath, RESTRICTED_METHODS } from "./guard/path-guard";

// ─── Hash utilities (for advanced use / testing) ──────────────────────────────
export { sha256 } from "./hash/sha256";
export { computeNodeHash, computeDefaultHash } from "./hash/hash-formulas";

// ─── Version ──────────────────────────────────────────────────────────────────
export { version } from "./version";
