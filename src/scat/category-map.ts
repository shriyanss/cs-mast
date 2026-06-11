import type { ScatCategory } from '../types/config';

/**
 * Maps each structural Babel node type to its scat category codes per Table I of the spec.
 * Note: 'name', 'val', 'op_name' are cross-cutting modifiers (empty arrays here) —
 * they affect how a node is hashed rather than which node types are selected.
 */
export const SCAT_NODE_TYPES: Readonly<Record<string, readonly ScatCategory[]>> = {
  StringLiteral:        ['lit'],
  NumericLiteral:       ['lit'],
  BooleanLiteral:       ['lit'],
  RegExpLiteral:        ['lit'],
  NullLiteral:          ['lit'],
  BigIntLiteral:        ['lit'],
  Identifier:           ['id'],
  PrivateName:          ['id'],
  JSXIdentifier:        ['id'],
  BinaryExpression:     ['op'],
  UnaryExpression:      ['op'],
  UpdateExpression:     ['op'],
  AssignmentExpression: ['op'],
  VariableDeclaration:  ['decl'],
  FunctionDeclaration:  ['decl'],
  ClassDeclaration:     ['decl'],
  ImportDeclaration:    ['decl'],
  ForStatement:         ['loop'],
  WhileStatement:       ['loop'],
  DoWhileStatement:     ['loop'],
  ForInStatement:       ['loop'],
  ForOfStatement:       ['loop'],
  IfStatement:          ['cond'],
  SwitchStatement:      ['cond'],
  ConditionalExpression:['cond'],
};

export const LIT_TYPES  = new Set(['StringLiteral','NumericLiteral','BooleanLiteral','RegExpLiteral','NullLiteral','BigIntLiteral']);
export const ID_TYPES   = new Set(['Identifier','PrivateName','JSXIdentifier']);
export const OP_TYPES   = new Set(['BinaryExpression','UnaryExpression','UpdateExpression','AssignmentExpression']);
export const DECL_TYPES = new Set(['VariableDeclaration','FunctionDeclaration','ClassDeclaration','ImportDeclaration']);
export const LOOP_TYPES = new Set(['ForStatement','WhileStatement','DoWhileStatement','ForInStatement','ForOfStatement']);
export const COND_TYPES = new Set(['IfStatement','SwitchStatement','ConditionalExpression']);

/** Returns all scat categories for a given Babel node type. */
export function getScatCategoriesForNodeType(nodeType: string): readonly ScatCategory[] {
  return SCAT_NODE_TYPES[nodeType] ?? [];
}
