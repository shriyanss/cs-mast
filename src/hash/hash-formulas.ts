/**
 * Implements all 21 hash equations from the CS-MAST spec (Section IV-B3).
 *
 * Nodes in active scat/sinc categories use their category-specific equations.
 * Nodes in neither scat nor sinc use the transparent passthrough (A11):
 *   - If any direct children have a non-undefined computedHash, the node's hash
 *     is sha256(concat of those hashes in source order).
 *   - If no children have a hash, computedHash remains undefined.
 *
 * Declaration nodes (VariableDeclaration, FunctionDeclaration, ClassDeclaration,
 * ImportDeclaration, VariableDeclarator) use their specific formulas ONLY when
 * `decl` is in scat. Otherwise they fall through to the transparent passthrough.
 */
import { sha256 } from "./sha256";
import { literalValueString, childHash, refHash, refArrayHashes } from "./hash-input-builder";
import type { AdapterNode } from "../types/node-descriptor";
import type { ResolvedConfig } from "../scat/category-resolver";
import { classifyNode } from "../scat/node-classifier";

/**
 * Computes and returns the hash for the given node (64-char hex, or undefined if no
 * active descendants exist under an uncategorized node). Also sets node.computedHash
 * and node.isActivelyHashed. Must be called in post-order (children already have
 * computedHash set).
 */
export function computeNodeHash(node: AdapterNode, resolved: ResolvedConfig): string | undefined {
    const cls = classifyNode(node, resolved);
    let hash: string | undefined;

    if (cls.isLit) {
        hash = hashLiteral(node, resolved);
    } else if (cls.isId) {
        hash = hashIdentifier(node, resolved);
    } else if (cls.isOp) {
        hash = hashOperator(node, resolved);
    } else if (resolved.hasDecl && node.nodeType === "VariableDeclarator") {
        // VariableDeclarator uses eq10/11 only when decl is in scat (A6, updated).
        hash = hashVariableDeclarator(node);
    } else if (cls.isDecl) {
        // DECL_TYPES use their specific formulas only when decl is in scat.
        hash = hashDeclaration(node, resolved);
    } else if (cls.isLoop) {
        hash = hashLoop(node);
    } else if (cls.isCond) {
        hash = hashConditional(node, resolved);
    } else if (cls.isSincOnly) {
        hash = hashSincNode(node);
    } else {
        // Transparent passthrough (A11): not in any active scat category or sinc.
        hash = computeDefaultHash(node);
    }

    node.computedHash = hash;
    node.isActivelyHashed = cls.shouldHash;
    return hash;
}

// ─── Leaf formulas ────────────────────────────────────────────────────────────

/** eq2: Hash(LitType + LitValue) when val active; eq3: Hash(LitType) otherwise. */
function hashLiteral(node: AdapterNode, r: ResolvedConfig): string {
    if (r.hasVal) return sha256(node.nodeType + literalValueString(node));
    return sha256(node.nodeType);
}

/** eq4: Hash(NodeType + NodeName) when name active; eq5: Hash(NodeType) otherwise. */
function hashIdentifier(node: AdapterNode, r: ResolvedConfig): string {
    if (r.hasName) return sha256(node.nodeType + (node.name ?? ""));
    return sha256(node.nodeType);
}

// ─── Operator formulas ────────────────────────────────────────────────────────

/**
 * eq6: Hash(LeftHash + OpName + RightHash) for binary with op_name.
 * eq7: Hash(LeftHash + RightHash) for binary without op_name.
 * Unary/Update (A4):
 *   prefix  + op_name → Hash(OpName + ArgHash)
 *   postfix + op_name → Hash(ArgHash + OpName)
 *   no op_name        → Hash(ArgHash)
 */
function hashOperator(node: AdapterNode, r: ResolvedConfig): string {
    const isBinary = node.nodeType === "BinaryExpression" || node.nodeType === "AssignmentExpression";

    if (isBinary) {
        const leftH = refHash(node, "left");
        const rightH = refHash(node, "right");
        if (r.hasOpName) return sha256(leftH + (node.operator ?? "") + rightH);
        return sha256(leftH + rightH);
    }

    // UnaryExpression / UpdateExpression
    const argH = refHash(node, "argument");
    const isPostfix = node.nodeType === "UpdateExpression" && node.prefix === false;
    if (r.hasOpName) {
        if (isPostfix) return sha256(argH + (node.operator ?? ""));
        return sha256((node.operator ?? "") + argH);
    }
    return sha256(argH);
}

// ─── Declaration formulas ─────────────────────────────────────────────────────

/**
 * eq10: Hash(NodeType + IdHash + InitHash) when init present.
 * eq11: Hash(NodeType + IdHash) when no init.
 * NodeType always included per A6.
 */
function hashVariableDeclarator(node: AdapterNode): string {
    const idH = refHash(node, "id");
    const initN = node.refs["init"] as AdapterNode | undefined;
    if (initN && initN.computedHash !== undefined) {
        return sha256(node.nodeType + idH + initN.computedHash);
    }
    return sha256(node.nodeType + idH);
}

function hashDeclaration(node: AdapterNode, r: ResolvedConfig): string | undefined {
    switch (node.nodeType) {
        case "VariableDeclaration": {
            const childH = refArrayHashes(node, "declarations");
            if (r.hasDecl) return sha256(node.nodeType + (node.kind ?? "") + childH); // eq8
            return sha256(childH); // eq9
        }
        case "FunctionDeclaration": {
            const idH = refHash(node, "id");
            const paramH = refArrayHashes(node, "params");
            const bodyH = refHash(node, "body");
            if (r.hasDecl) return sha256(node.nodeType + idH + paramH + bodyH); // eq12
            return sha256(idH + paramH + bodyH); // eq13
        }
        case "ClassDeclaration": {
            const idH = refHash(node, "id");
            const bodyH = refHash(node, "body");
            const superN = node.refs["superClass"] as AdapterNode | undefined;
            const superH = superN ? childHash(superN) : null;
            if (r.hasDecl) {
                if (superH !== null) return sha256(node.nodeType + idH + superH + bodyH); // eq14
                return sha256(node.nodeType + idH + bodyH); // eq15
            }
            return sha256(idH + bodyH); // eq16
        }
        case "ImportDeclaration": {
            const specH = refArrayHashes(node, "specifiers");
            const sourceH = refHash(node, "source");
            if (r.hasDecl) return sha256(node.nodeType + specH + sourceH); // eq17
            return sha256(specH + sourceH); // eq18
        }
        default:
            return computeDefaultHash(node);
    }
}

// ─── Loop formula ─────────────────────────────────────────────────────────────

/**
 * eq19: Hash(NodeType + SortedChildHashes).
 * Only direct children with isActivelyHashed===true are included.
 * Child hashes sorted ASCII-ascending before concatenation (A9).
 */
function hashLoop(node: AdapterNode): string {
    const activeHashes = node.children.filter((c) => c.isActivelyHashed === true).map((c) => c.computedHash as string);
    activeHashes.sort();
    return sha256(node.nodeType + activeHashes.join(""));
}

// ─── Conditional formula ──────────────────────────────────────────────────────

/**
 * eq20: Hash(Hash(NodeType) + Hash(Test) + Hash(Consequent)) when val active.
 * eq21: Hash(Hash(NodeType) + Hash(Consequent)) otherwise.
 * Inner hashing of each component is a real SHA-256 pass (A7 — double-hash).
 * SwitchStatement: test=discriminant, consequent=concat of case hashes.
 */
function hashConditional(node: AdapterNode, r: ResolvedConfig): string {
    const nodeTypeHash = sha256(node.nodeType);

    let consequentInnerHash: string;
    let testNode: AdapterNode | undefined;

    if (node.nodeType === "SwitchStatement") {
        testNode = node.refs["discriminant"] as AdapterNode | undefined;
        const cases = (node.refs["cases"] as AdapterNode[] | undefined) ?? [];
        consequentInnerHash = sha256(cases.map((c) => c.computedHash ?? "").join(""));
    } else {
        testNode = node.refs["test"] as AdapterNode | undefined;
        const consequentNode = node.refs["consequent"] as AdapterNode | undefined;
        consequentInnerHash = sha256(consequentNode?.computedHash ?? "");
    }

    if (r.hasVal && testNode) {
        const testInnerHash = sha256(testNode.computedHash ?? "");
        return sha256(nodeTypeHash + testInnerHash + consequentInnerHash); // eq20
    }
    return sha256(nodeTypeHash + consequentInnerHash); // eq21
}

// ─── sinc-only formula ────────────────────────────────────────────────────────

/**
 * A12: sha256(nodeType + concat of actively-hashed direct children in source order).
 * Only children with isActivelyHashed===true are included. If none are active the
 * hash collapses to sha256(nodeType). Source order is preserved (unlike loops which
 * sort) because child position is semantically meaningful in generic node types.
 */
function hashSincNode(node: AdapterNode): string {
    const activeHashes = node.children.filter((c) => c.isActivelyHashed === true).map((c) => c.computedHash as string);
    return sha256(node.nodeType + activeHashes.join(""));
}

// ─── Default formula (A11 — transparent passthrough) ─────────────────────────

/**
 * Transparent passthrough for nodes not in any active scat category or sinc.
 * Collects direct children that have a non-undefined computedHash (source order)
 * and returns sha256 of their concatenation. Returns undefined when no children
 * have a hash — this propagates upward so a subtree with no configured nodes
 * produces no hash at all.
 */
export function computeDefaultHash(node: AdapterNode): string | undefined {
    const childHashes = node.children.map((c) => c.computedHash).filter((h): h is string => h !== undefined);
    if (childHashes.length === 0) return undefined;
    return sha256(childHashes.join(""));
}
