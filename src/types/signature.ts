/** Parsed representation of a CS-MAST-S PHC-style signature string. */
export interface CsMastSignature {
  /** Always 1 for this spec version. */
  version: number;
  /** Hash algorithm identifier, e.g. 'sha256'. */
  hash: string;
  /** Language extension, e.g. 'js'. */
  lang: string;
  /** Optional language version, e.g. 'es6'. */
  lver?: string;
  /** Parser name (after sanitization). */
  prsr: string;
  /** Active scat categories (may be empty if sinc is non-empty). */
  scat: string[];
  /** Active sinc node types (may be empty if scat is non-empty). */
  sinc: string[];
  /** 64-char lowercase hex SHA-256 hash of this node. */
  hashHex: string;
}
