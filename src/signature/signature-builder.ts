import type { CsMastSignature } from "../types/signature";
import type { CsMastConfig } from "../types/config";
import { sanitizePrsr } from "./prsr-sanitizer";

/**
 * Assembles a CS-MAST-S PHC-style signature string from its constituent parts.
 *
 * Format: $v=1$hash=<h>,lang=<l>[,lver=<v>],prsr=<p>[,scat=<cats>][,sinc=<types>]$<64hex>
 *
 * Multiple scat values joined by '_' (same separator as sinc per spec A — sinc explicitly
 * uses '_'; scat separator is unspecified so we apply the same convention).
 * Multiple sinc values joined by '_' per spec Section IV-A-6a.
 */
export function buildSignature(parts: CsMastSignature): string {
    const params: string[] = [`hash=${parts.hash}`, `lang=${parts.lang}`];
    if (parts.lver) params.push(`lver=${parts.lver}`);
    params.push(`prsr=${parts.prsr}`);
    if (parts.scat && parts.scat.length > 0) params.push(`scat=${parts.scat.join("_")}`);
    if (parts.sinc && parts.sinc.length > 0) params.push(`sinc=${parts.sinc.join("_")}`);
    return `$v=${parts.version}$${params.join(",")}$${parts.hashHex}`;
}

/** Builds a signature from a CsMastConfig (sanitizing prsr) and a pre-computed hashHex. */
export function buildSignatureFromConfig(config: CsMastConfig, hashHex: string): string {
    return buildSignature({
        version: 1,
        hash: config.hash,
        lang: config.lang,
        lver: config.lver,
        prsr: sanitizePrsr(config.prsr),
        scat: config.scat,
        sinc: config.sinc,
        hashHex,
    });
}
