import type { CsMastSignature } from '../types/signature';

/**
 * Parses a CS-MAST-S PHC-style signature string back into its parts.
 * Returns null if the string is not a valid CS-MAST-S signature.
 *
 * Expected format:
 *   $v=<version>$<param1>=<val>,<param2>=<val>,...$<64-char-hex>
 *
 * Required fields: v, hash, lang, prsr, and at least one of scat/sinc.
 * hashHex must be exactly 64 lowercase hex chars.
 */
export function parseSignature(sig: string): CsMastSignature | null {
  if (typeof sig !== 'string' || !sig.startsWith('$')) return null;

  // Split on '$' — results in ['', 'v=1', 'hash=...,lang=...', '<hex>']
  const parts = sig.split('$');
  if (parts.length !== 4 || parts[0] !== '') return null;

  const versionPart  = parts[1];
  const paramsPart   = parts[2];
  const hashHexPart  = parts[3];

  // Validate version
  if (!versionPart.startsWith('v=')) return null;
  const version = parseInt(versionPart.slice(2), 10);
  if (isNaN(version) || version < 1) return null;

  // Validate hash hex (64 lowercase hex chars)
  if (!/^[0-9a-f]{64}$/.test(hashHexPart)) return null;

  // Parse comma-separated params
  const paramMap: Record<string, string> = {};
  for (const token of paramsPart.split(',')) {
    const eq = token.indexOf('=');
    if (eq < 1) return null;
    const key = token.slice(0, eq);
    const val = token.slice(eq + 1);
    paramMap[key] = val;
  }

  // Required fields
  if (!paramMap['hash'] || !paramMap['lang'] || !paramMap['prsr']) return null;

  const scat = paramMap['scat'] ? paramMap['scat'].split('_').filter(Boolean) : [];
  const sinc = paramMap['sinc'] ? paramMap['sinc'].split('_').filter(Boolean) : [];

  // At least one of scat or sinc must be present
  if (scat.length === 0 && sinc.length === 0) return null;

  return {
    version,
    hash:    paramMap['hash'],
    lang:    paramMap['lang'],
    lver:    paramMap['lver'],
    prsr:    paramMap['prsr'],
    scat,
    sinc,
    hashHex: hashHexPart,
  };
}
