/**
 * Maps a Babel AST node tree to the adapter-neutral AdapterNode tree.
 * Built upfront (one recursive pass before traversal) so that pathKey
 * values are stable and the full tree structure is available.
 *
 * Key mapping decisions:
 * - pathKey uses dotted bracket notation: "program.body.0.declarations.0"
 * - RegExpLiteral value is pre-normalized as "/pattern/sortedFlags" (A3)
 * - PrivateName name is prefixed with '#' (A3)
 * - All direct AST children are enumerated via @babel/types VISITOR_KEYS
 * - Named refs provide formula-level access (e.g. refs['id'], refs['body'])
 */
import * as t from '@babel/types';
import type { AdapterNode } from '../../types/node-descriptor';

export function mapBabelAst(fileNode: t.File): AdapterNode {
  return mapNode(fileNode, 'file');
}

function mapNode(babelNode: t.Node, pathKey: string): AdapterNode {
  const node: AdapterNode = {
    nodeType: babelNode.type,
    children: [],
    refs: {},
    pathKey,
    _raw: babelNode,
  };

  applyNodeSpecifics(node, babelNode);
  populateChildren(node, babelNode, pathKey);

  return node;
}

function applyNodeSpecifics(node: AdapterNode, babelNode: t.Node): void {
  if (t.isIdentifier(babelNode)) {
    node.name = babelNode.name;
  } else if (t.isPrivateName(babelNode)) {
    node.name = '#' + babelNode.id.name;
  } else if (t.isJSXIdentifier(babelNode)) {
    node.name = babelNode.name;
  } else if (t.isStringLiteral(babelNode)) {
    node.value = babelNode.value;
  } else if (t.isNumericLiteral(babelNode)) {
    node.value = String(babelNode.value);
  } else if (t.isBooleanLiteral(babelNode)) {
    node.value = babelNode.value ? 'true' : 'false';
  } else if (t.isNullLiteral(babelNode)) {
    node.value = 'null';
  } else if (t.isBigIntLiteral(babelNode)) {
    node.value = babelNode.value;
  } else if (t.isRegExpLiteral(babelNode)) {
    const sortedFlags = [...babelNode.flags].sort().join('');
    node.value = `/${babelNode.pattern}/${sortedFlags}`;
  } else if (
    t.isBinaryExpression(babelNode) ||
    t.isAssignmentExpression(babelNode) ||
    t.isLogicalExpression(babelNode)
  ) {
    node.operator = babelNode.operator;
  } else if (t.isUnaryExpression(babelNode)) {
    node.operator = babelNode.operator;
    node.prefix = babelNode.prefix;
  } else if (t.isUpdateExpression(babelNode)) {
    node.operator = babelNode.operator;
    node.prefix = babelNode.prefix;
  } else if (t.isVariableDeclaration(babelNode)) {
    node.kind = babelNode.kind;
  }
}

function populateChildren(node: AdapterNode, babelNode: t.Node, pathKey: string): void {
  const visitorKeys = t.VISITOR_KEYS[babelNode.type] ?? [];

  for (const key of visitorKeys) {
    const raw = (babelNode as unknown as Record<string, unknown>)[key];

    if (Array.isArray(raw)) {
      const mapped: AdapterNode[] = [];
      raw.forEach((child, i) => {
        if (child && typeof child === 'object' && 'type' in child) {
          const childNode = mapNode(child as t.Node, `${pathKey}.${key}.${i}`);
          mapped.push(childNode);
          node.children.push(childNode);
        }
      });
      if (mapped.length > 0) node.refs[key] = mapped;
    } else if (raw && typeof raw === 'object' && 'type' in raw) {
      const childNode = mapNode(raw as t.Node, `${pathKey}.${key}`);
      node.refs[key] = childNode;
      node.children.push(childNode);
    }
  }
}
