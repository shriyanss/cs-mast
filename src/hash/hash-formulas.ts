/**
 * Implements all 21 hash equations from the CS-MAST spec (Section IV-B3).
 *
 * Every node in the traversal receives a computedHash. Nodes in active
 * scat/sinc categories use category-specific equations; all others use
 * the default Merkle-propagation formula (A11: sha256(nodeType + childHashes)).
 *
 * Special rule for declaration node types (VariableDeclaration, FunctionDeclaration,
 * ClassDeclaration, ImportDeclaration, VariableDeclarator): they ALWAYS use their
 * specific formula. The `decl` scat flag is a variant selector (controls whether
 * NodeType is included), not a gate. This ensures parent formulas that reference
 * child declaration hashes always receive a well-formed hash.
 * The `isActivelyHashed` flag is still only set true when `decl` is in scat.
 */
import { sha256 } from './sha256';
import { literalValueString, childHash, refHash, refArrayHashes } from './hash-input-builder';
import type { AdapterNode } from '../types/node-descriptor';
import type { ResolvedConfig } from '../scat/category-resolver';
import { classifyNode } from '../scat/node-classifier';
import { DECL_TYPES } from '../scat/category-map';

/**
 * Computes and returns the 64-char hex hash for the given node.
 * Also sets node.computedHash and node.isActivelyHashed.
 * Must be called in post-order (children already have computedHash set).
 */
export function computeNodeHash(node: AdapterNode, resolved: ResolvedConfig): string {
  const cls = classifyNode(node, resolved);
  let hash: string;

  if (cls.isLit) {
    hash = hashLiteral(node, resolved);
  } else if (cls.isId) {
    hash = hashIdentifier(node, resolved);
  } else if (cls.isOp) {
    hash = hashOperator(node, resolved);
  } else if (node.nodeType === 'VariableDeclarator') {
    // VariableDeclarator always uses eq 10/11 (A6 — no decl condition).
    hash = hashVariableDeclarator(node);
  } else if (DECL_TYPES.has(node.nodeType)) {
    // Declaration nodes always use their specific formulas (eq8-18).
    // resolved.hasDecl controls the variant (with/without NodeType).
    hash = hashDeclaration(node, resolved);
  } else if (cls.isLoop) {
    hash = hashLoop(node);
  } else if (cls.isCond) {
    hash = hashConditional(node, resolved);
  } else if (cls.isSincOnly) {
    hash = hashSincNode(node);
  } else {
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
  if (r.hasName) return sha256(node.nodeType + (node.name ?? ''));
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
  const isBinary = node.nodeType === 'BinaryExpression' || node.nodeType === 'AssignmentExpression';

  if (isBinary) {
    const leftH  = refHash(node, 'left');
    const rightH = refHash(node, 'right');
    if (r.hasOpName) return sha256(leftH + (node.operator ?? '') + rightH);
    return sha256(leftH + rightH);
  }

  // UnaryExpression / UpdateExpression
  const argH = refHash(node, 'argument');
  const isPostfix = node.nodeType === 'UpdateExpression' && node.prefix === false;
  if (r.hasOpName) {
    if (isPostfix) return sha256(argH + (node.operator ?? ''));
    return sha256((node.operator ?? '') + argH);
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
  const idH   = refHash(node, 'id');
  const initN = node.refs['init'] as AdapterNode | undefined;
  if (initN && initN.computedHash !== undefined) {
    return sha256(node.nodeType + idH + initN.computedHash);
  }
  return sha256(node.nodeType + idH);
}

function hashDeclaration(node: AdapterNode, r: ResolvedConfig): string {
  switch (node.nodeType) {
    case 'VariableDeclaration': {
      const childH = refArrayHashes(node, 'declarations');
      if (r.hasDecl) return sha256(node.nodeType + (node.kind ?? '') + childH); // eq8
      return sha256(childH); // eq9
    }
    case 'FunctionDeclaration': {
      const idH     = refHash(node, 'id');
      const paramH  = refArrayHashes(node, 'params');
      const bodyH   = refHash(node, 'body');
      if (r.hasDecl) return sha256(node.nodeType + idH + paramH + bodyH); // eq12
      return sha256(idH + paramH + bodyH); // eq13
    }
    case 'ClassDeclaration': {
      const idH    = refHash(node, 'id');
      const bodyH  = refHash(node, 'body');
      const superN = node.refs['superClass'] as AdapterNode | undefined;
      const superH = superN ? childHash(superN) : null;
      if (r.hasDecl) {
        if (superH !== null) return sha256(node.nodeType + idH + superH + bodyH); // eq14
        return sha256(node.nodeType + idH + bodyH); // eq15
      }
      return sha256(idH + bodyH); // eq16
    }
    case 'ImportDeclaration': {
      const specH   = refArrayHashes(node, 'specifiers');
      const sourceH = refHash(node, 'source');
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
  const activeHashes = node.children
    .filter((c) => c.isActivelyHashed === true)
    .map((c) => c.computedHash as string);
  activeHashes.sort();
  return sha256(node.nodeType + activeHashes.join(''));
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

  if (node.nodeType === 'SwitchStatement') {
    testNode = node.refs['discriminant'] as AdapterNode | undefined;
    const cases = (node.refs['cases'] as AdapterNode[] | undefined) ?? [];
    consequentInnerHash = sha256(cases.map((c) => c.computedHash ?? '').join(''));
  } else {
    testNode = node.refs['test'] as AdapterNode | undefined;
    const consequentNode = node.refs['consequent'] as AdapterNode | undefined;
    consequentInnerHash = sha256(consequentNode?.computedHash ?? '');
  }

  if (r.hasVal && testNode) {
    const testInnerHash = sha256(testNode.computedHash ?? '');
    return sha256(nodeTypeHash + testInnerHash + consequentInnerHash); // eq20
  }
  return sha256(nodeTypeHash + consequentInnerHash); // eq21
}

// ─── sinc-only formula ────────────────────────────────────────────────────────

/**
 * sinc nodes use the same default Merkle propagation: sha256(nodeType + childHashes).
 * They are separately tracked as isActivelyHashed (per A10 dedup at resolveConfig time).
 */
function hashSincNode(node: AdapterNode): string {
  return computeDefaultHash(node);
}

// ─── Default formula (A11) ────────────────────────────────────────────────────

/**
 * Default for all uncategorized nodes: sha256(nodeType + concat of all children's hashes).
 * Ensures every node provides a valid hash to its parent formula,
 * even if it is not in any active scat/sinc category.
 */
export function computeDefaultHash(node: AdapterNode): string {
  const childHashes = node.children.map((c) => c.computedHash ?? '').join('');
  return sha256(node.nodeType + childHashes);
}
