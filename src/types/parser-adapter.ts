import type { AdapterNode, AdapterNodePath } from "./node-descriptor";
import type { CsMastConfig } from "./config";

export interface TraversalState {
    /** Maps pathKey → 64-char hex hash for that node (set during traversal). */
    hashByPath: Map<string, string>;
    /** Maps full CS-MAST-S signature string → pathKey (the O(1) lookup table). */
    signatureMap: Map<string, string>;
    config: CsMastConfig;
}

/**
 * Called once per node in post-order (children before parent).
 * When called for node N, all of N's children already have computedHash set.
 */
export type PostOrderVisitor = (path: AdapterNodePath, state: TraversalState) => void;

/**
 * Interface every language/parser adapter must satisfy.
 *
 * Lifecycle:
 *   const ast = adapter.parse(source, config);
 *   adapter.traversePostOrder(ast, visitor, state);
 *
 * The adapter is responsible ONLY for:
 *   1. Parsing source text into an AdapterNode tree.
 *   2. Walking the tree post-order and invoking the visitor.
 * It must NOT perform any hashing.
 */
export interface IParserAdapter {
    /** Machine-readable parser name used for the prsr field (before sanitization). */
    readonly parserName: string;
    /** Language extension used for the lang field, e.g. 'js'. */
    readonly lang: string;
    /** Optional default language version used for the lver field. */
    readonly langVersion?: string;
    /**
     * Parse source text into an AdapterNode tree.
     * Throws ParseError on syntax failure.
     */
    parse(source: string, config: CsMastConfig): AdapterNode;
    /**
     * Walk the AdapterNode tree in post-order (children before parents),
     * invoking visitor once per node. The adapter guarantees that when
     * visitor is called for node N, all of N's children have been visited.
     */
    traversePostOrder(root: AdapterNode, visitor: PostOrderVisitor, state: TraversalState): void;
    /** Look up a node by its dotted pathKey. Returns null if not found. */
    resolveByPath(root: AdapterNode, pathKey: string): AdapterNode | null;
}
