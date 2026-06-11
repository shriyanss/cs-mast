import { guardPath, RESTRICTED_METHODS, makeGuard } from '../../../src/guard/path-guard';
import { MutationError } from '../../../src/errors';

describe('makeGuard', () => {
  it('returns a function that throws MutationError', () => {
    const guard = makeGuard('replaceWith');
    expect(() => guard()).toThrow(MutationError);
    expect(() => guard()).toThrow(/replaceWith/);
  });
});

describe('RESTRICTED_METHODS', () => {
  const expected = [
    'replaceWith','replaceWithMultiple','replaceWithSourceString','replaceInline',
    'insertBefore','insertAfter','remove','pushContainer','unshiftContainer',
  ];
  for (const m of expected) {
    it(`includes '${m}'`, () => {
      expect(RESTRICTED_METHODS).toContain(m as never);
    });
  }
});

describe('guardPath proxy', () => {
  function makeFakePath() {
    return {
      node: { type: 'Identifier' },
      get: () => null,
      replaceWith: () => {},
      insertBefore: () => {},
      remove: () => {},
      pushContainer: () => {},
      parentPath: null,
      safeMethod: () => 'ok',
    };
  }

  it('throws MutationError for each restricted method', () => {
    const path = guardPath(makeFakePath()) as unknown as Record<string, () => void>;
    for (const method of RESTRICTED_METHODS) {
      expect(() => path[method]()).toThrow(MutationError);
    }
  });

  it('allows non-restricted methods through', () => {
    const path = guardPath(makeFakePath()) as unknown as Record<string, () => string>;
    expect(path['safeMethod']()).toBe('ok');
  });

  it('allows property access (node, parentPath)', () => {
    const path = guardPath(makeFakePath());
    expect((path as { node: { type: string } }).node.type).toBe('Identifier');
  });

  it('MutationError carries the method name', () => {
    const path = guardPath(makeFakePath());
    try {
      (path as { remove: () => void }).remove();
      fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MutationError);
      expect((e as MutationError).method).toBe('remove');
    }
  });
});
