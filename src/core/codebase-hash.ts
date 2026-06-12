import type { CsMastConfig } from "../types/config";
import type { IParserAdapter } from "../types/parser-adapter";
import { cs_mast_init, CsMastTree } from "./cs-mast-init";
import { sha256 } from "../hash/sha256";
import { buildSignature } from "../signature/signature-builder";
import { sanitizePrsr } from "../signature/prsr-sanitizer";

export interface CodebaseResult {
    /** One CsMastTree per file, in input order. */
    trees: CsMastTree[];
    /**
     * 64-char hex codebase-level hash.
     * Computed per spec Section IV-B-1a:
     *   1. Collect each file's root hash (computedHash of the File node).
     *   2. Sort the hash strings ASCII-ascending.
     *   3. Concatenate them.
     *   4. SHA-256 the concatenation.
     * Note (A8): raw concatenation would yield a non-fixed-length result, so we
     * apply one final SHA-256 to produce a proper 64-char "hash portion".
     */
    codebaseHash: string;
    /** Full codebase-level CS-MAST-S signature (uses shared config, codebaseHash as hashHex). */
    codebaseSignature: string;
}

/**
 * Processes multiple source files independently with the same config, then
 * derives a single codebase-level hash from all file root hashes.
 */
export function cs_mast_init_codebase(
    files: Array<{ filename: string; source: string }>,
    config: CsMastConfig,
    adapter?: IParserAdapter
): CodebaseResult {
    const trees: CsMastTree[] = files.map(({ source }) => cs_mast_init(source, config, adapter));

    const rootHashes = trees.map((t) => t.rootHash);
    // Sort ascending by ASCII value, then concatenate, then SHA-256 (A8)
    rootHashes.sort();
    const codebaseHash = sha256(rootHashes.join(""));

    const codebaseSignature = buildSignature({
        version: 1,
        hash: config.hash,
        lang: config.lang,
        lver: config.lver,
        prsr: sanitizePrsr(config.prsr),
        scat: config.scat,
        sinc: config.sinc,
        hashHex: codebaseHash,
    });

    return { trees, codebaseHash, codebaseSignature };
}
