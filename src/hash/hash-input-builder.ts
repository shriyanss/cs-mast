/**
 * Constructs the exact UTF-8 string fed into SHA-256 for each formula.
 *
 * Documented assumptions (see CLAUDE.md):
 * A1: No separator between concatenated components.
 * A2: NodeType = node.nodeType (exact Babel node.type, e.g. "StringLiteral").
 * A3: LiteralValue encoding — see literalValueString() below.
 * A4: Unary/Update — prefix: Hash(OpName+ArgHash); postfix: Hash(ArgHash+OpName).
 * A6: VariableDeclarator always prefixes "VariableDeclarator" regardless of decl flag.
 * A7: Conditional double-hash — inner Hash(NodeType) and Hash(Test) before outer hash.
 */
import type { AdapterNode } from '../types/node-descriptor';

/**
 * Returns the normalized literal value string for hash-input construction.
 *
 * Encoding rules (A3):
 * - NullLiteral   → "null" (Babel carries no .value for NullLiteral)
 * - BooleanLiteral → "true" | "false"
 * - NumericLiteral → String(node.value)
 * - BigIntLiteral  → node.value (already a decimal string in Babel)
 * - RegExpLiteral  → /pattern/sortedFlags (flags sorted alphabetically to normalize gi==ig)
 *   The mapper stores this pre-normalized as the value field.
 * - StringLiteral  → node.value (parsed Unicode, NOT the quoted JS form)
 */
export function literalValueString(node: AdapterNode): string {
  switch (node.nodeType) {
    case 'NullLiteral':
      return 'null';
    case 'BooleanLiteral':
      return node.value === 'true' ? 'true' : 'false';
    default:
      return node.value ?? '';
  }
}

/** Gets the computed hash of a child node, returning '' if not yet computed. */
export function childHash(node: AdapterNode | undefined | null): string {
  return node?.computedHash ?? '';
}

/** Gets the computed hash of a named ref child. */
export function refHash(node: AdapterNode, key: string): string {
  const child = node.refs[key];
  if (!child || Array.isArray(child)) return '';
  return childHash(child);
}

/** Concatenates computed hashes of a named ref array in source order. */
export function refArrayHashes(node: AdapterNode, key: string): string {
  const children = node.refs[key];
  if (!Array.isArray(children)) return '';
  return children.map((c) => c.computedHash ?? '').join('');
}
