import { sha256 as nobleSha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const isNode = typeof process !== "undefined" && typeof process.versions?.node === "string";

/** Returns the SHA-256 digest of input (UTF-8 encoded) as a 64-char lowercase hex string. */
export function sha256(input: string): string {
    const bytes = new TextEncoder().encode(input);
    if (isNode) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createHash } = require(/* webpackIgnore: true */ "crypto") as typeof import("crypto");
        return createHash("sha256").update(bytes).digest("hex");
    }
    return bytesToHex(nobleSha256(bytes));
}
