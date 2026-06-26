import type { CsMastConfig } from "../types/config";
import type { IParserAdapter, TraversalState, PostOrderVisitor } from "../types/parser-adapter";
import type { AdapterNodePath } from "../types/node-descriptor";
import { BabelAdapter } from "../adapters/babel/babel-adapter";
import { resolveConfig } from "../scat/category-resolver";
import { computeNodeHash } from "../hash/hash-formulas";
import { buildSignatureFromConfig } from "../signature/signature-builder";
import { validateConfig } from "./validate-config";

export const CS_MAST_SIGNATURE_KEY = "cs-mast-s-hash";

export interface CsMastTree {
    /** Root AdapterNode. computedHash is undefined for nodes with no active descendants. */
    root: import("../types/node-descriptor").AdapterNode;
    /** 64-char hex hash of the root (File) node. */
    rootHash: string;
    /** Full PHC signature of the root node (empty string if root not actively hashed). */
    rootSignature: string;
    config: CsMastConfig;
    adapter: IParserAdapter;
    /** Maps full CS-MAST-S signature → pathKey. O(1) lookup. */
    readonly _signatureMap: ReadonlyMap<string, string>;
}

/**
 * Primary entry point. Parses source, traverses post-order, attaches cs-mast-s-hash
 * to every actively-hashed node, and builds the O(1) signature hashmap.
 */
export function cs_mast_init(source: string, config: CsMastConfig, adapter?: IParserAdapter): CsMastTree {
    validateConfig(config);

    const useAdapter = adapter ?? new BabelAdapter();
    const resolved = resolveConfig(config);

    const state: TraversalState = {
        hashByPath: new Map<string, string>(),
        signatureMap: new Map<string, string>(),
        config,
    };

    const root = useAdapter.parse(source, config);

    const visitor: PostOrderVisitor = (path: AdapterNodePath, st: TraversalState) => {
        const { node } = path;
        const hash = computeNodeHash(node, resolved);

        if (hash !== undefined) st.hashByPath.set(path.pathKey, hash);

        if (node.isActivelyHashed) {
            const sig = buildSignatureFromConfig(st.config, hash as string);
            st.signatureMap.set(sig, path.pathKey);
            // Attach full signature to the original Babel node
            if (node._raw && typeof node._raw === "object") {
                (node._raw as Record<string, string>)[CS_MAST_SIGNATURE_KEY] = sig;
            }
        }
    };

    useAdapter.traversePostOrder(root, visitor, state);

    const rootHash = root.computedHash ?? "";
    // Root signature — only present if File node is actively hashed (rarely)
    const rawRoot = root._raw as Record<string, string> | undefined;
    const rootSignature = rawRoot?.[CS_MAST_SIGNATURE_KEY] ?? "";

    return {
        root,
        rootHash,
        rootSignature,
        config,
        adapter: useAdapter,
        _signatureMap: state.signatureMap,
    };
}
