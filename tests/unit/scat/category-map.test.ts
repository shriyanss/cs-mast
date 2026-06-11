import { getScatCategoriesForNodeType, SCAT_NODE_TYPES } from '../../../src/scat/category-map';

describe('SCAT_NODE_TYPES (Table I mapping)', () => {
  describe('lit category', () => {
    const litTypes = ['StringLiteral','NumericLiteral','BooleanLiteral','RegExpLiteral','NullLiteral','BigIntLiteral'];
    for (const t of litTypes) {
      it(`${t} maps to 'lit'`, () => {
        expect(getScatCategoriesForNodeType(t)).toContain('lit');
      });
    }
  });

  describe('id category', () => {
    for (const t of ['Identifier','PrivateName','JSXIdentifier']) {
      it(`${t} maps to 'id'`, () => {
        expect(getScatCategoriesForNodeType(t)).toContain('id');
      });
    }
  });

  describe('op category', () => {
    for (const t of ['BinaryExpression','UnaryExpression','UpdateExpression','AssignmentExpression']) {
      it(`${t} maps to 'op'`, () => {
        expect(getScatCategoriesForNodeType(t)).toContain('op');
      });
    }
  });

  describe('decl category', () => {
    for (const t of ['VariableDeclaration','FunctionDeclaration','ClassDeclaration','ImportDeclaration']) {
      it(`${t} maps to 'decl'`, () => {
        expect(getScatCategoriesForNodeType(t)).toContain('decl');
      });
    }
  });

  describe('loop category', () => {
    for (const t of ['ForStatement','WhileStatement','DoWhileStatement','ForInStatement','ForOfStatement']) {
      it(`${t} maps to 'loop'`, () => {
        expect(getScatCategoriesForNodeType(t)).toContain('loop');
      });
    }
  });

  describe('cond category', () => {
    for (const t of ['IfStatement','SwitchStatement','ConditionalExpression']) {
      it(`${t} maps to 'cond'`, () => {
        expect(getScatCategoriesForNodeType(t)).toContain('cond');
      });
    }
  });

  it('returns empty array for unknown node type', () => {
    expect(getScatCategoriesForNodeType('BlockStatement')).toEqual([]);
    expect(getScatCategoriesForNodeType('ReturnStatement')).toEqual([]);
    expect(getScatCategoriesForNodeType('')).toEqual([]);
  });

  it('cross-cutting categories (name, val, op_name) have no structural node types', () => {
    // name/val/op_name are modifier flags, not structural selectors
    const allTypes = Object.keys(SCAT_NODE_TYPES);
    for (const t of allTypes) {
      expect(getScatCategoriesForNodeType(t)).not.toContain('name');
      expect(getScatCategoriesForNodeType(t)).not.toContain('val');
      expect(getScatCategoriesForNodeType(t)).not.toContain('op_name');
    }
  });
});
