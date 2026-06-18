import { sha256 as nobleSha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const isNode = typeof process !== "undefined" && typeof process.versions?.node === "string";

// Capture the CJS require function by reference — bundlers only trace direct
// require("literal") calls, so this assignment is invisible to static analysis.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _require: ((id: string) => any) | undefined;
try {
    _require = require;
} catch {
    // not in a CJS environment (e.g. native ESM)
}

/** Returns the SHA-256 digest of input (UTF-8 encoded) as a 64-char lowercase hex string. */
export function sha256(input: string): string {
    const bytes = new TextEncoder().encode(input);
    if (isNode && _require) {
        const { createHash } = _require("crypto") as typeof import("crypto");
        return createHash("sha256").update(bytes).digest("hex");
    }
    return bytesToHex(nobleSha256(bytes));
}
