import type { CsMastTree } from "./cs-mast-init";

/**
 * O(1) lookup: returns true if the given CS-MAST-S signature exists in the tree.
 * Backed by the hashmap built during cs_mast_init (Map.has = O(1) amortized).
 */
export function cs_mast_s_exists(tree: CsMastTree, signature: string): boolean {
    if (!signature) return false;
    return tree._signatureMap.has(signature);
}
