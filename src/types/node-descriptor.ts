/**
 * Language-neutral representation of a single AST node produced by a parser adapter.
 * The adapter maps parser-specific nodes to this shape before traversal.
 *
 * Design notes (see CLAUDE.md A1-A11):
 * - `value` is stored as a normalized string for all literal types.
 * - `prefix` is only meaningful for UpdateExpression (true=prefix ++x, false=postfix x++).
 * - `refs` provides named access to specific children required by hash formulas.
 * - `children` is the flat ordered list of ALL direct child nodes (for loop/default formulas).
 * - `pathKey` is set during upfront mapping, using dotted bracket notation from file root.
 * - `computedHash` is set during post-order traversal.
 * - `isActivelyHashed` is true only for nodes in active scat categories or sinc.
 */
export interface AdapterNode {
    /** Babel node.type string, e.g. 'StringLiteral', 'FunctionDeclaration'. */
    nodeType: string;
    /** Name property for Identifier/PrivateName/JSXIdentifier nodes. PrivateName is '#'+id. */
    name?: string;
    /** Normalized value string for literal nodes (see CLAUDE.md A3 for encoding rules). */
    value?: string;
    /** Operator symbol for BinaryExpression/UnaryExpression/UpdateExpression/AssignmentExpression. */
    operator?: string;
    /** Declaration kind for VariableDeclaration ('var' | 'let' | 'const'). */
    kind?: string;
    /** Only meaningful for UpdateExpression: true=prefix (++x), false=postfix (x++). */
    prefix?: boolean;
    /** All direct child AdapterNodes in source order. */
    children: AdapterNode[];
    /** Named children for formula-level access (e.g. refs['id'], refs['params'], refs['body']). */
    refs: Record<string, AdapterNode | AdapterNode[] | undefined>;
    /** Dotted path from file root, e.g. 'program.body.0.declarations.0'. */
    pathKey: string;
    /** Opaque back-reference to the original Babel node (used to attach cs-mast-s-hash). */
    _raw?: unknown;
    /** 64-char hex hash set during post-order traversal. Always set after traversal. */
    computedHash?: string;
    /** True only for nodes in an active scat category or sinc (added to signatureMap). */
    isActivelyHashed?: boolean;
}

export interface AdapterNodePath {
    node: AdapterNode;
    parent: AdapterNode | null;
    parentPath: AdapterNodePath | null;
    pathKey: string;
}
