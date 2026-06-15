import { sha256 as nobleSha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

/** Returns the SHA-256 digest of input (UTF-8 encoded) as a 64-char lowercase hex string. */
export function sha256(input: string): string {
    return bytesToHex(nobleSha256(new TextEncoder().encode(input)));
}
