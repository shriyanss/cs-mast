import { createHash } from "node:crypto";

/** Returns the SHA-256 digest of input (UTF-8 encoded) as a 64-char lowercase hex string. */
export function sha256(input: string): string {
    return createHash("sha256").update(input, "utf8").digest("hex");
}
