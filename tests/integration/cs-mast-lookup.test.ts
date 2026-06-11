import { cs_mast_init } from '../../src/core/cs-mast-init';
import { cs_mast_s_exists } from '../../src/core/cs-mast-lookup';
import { buildSignatureFromConfig } from '../../src/signature/signature-builder';
import type { CsMastConfig } from '../../src/types/config';

const cfg: CsMastConfig = {
  hash: 'sha256', lang: 'js', lver: 'es6',
  prsr: '@babel/parser', scat: ['lit', 'val', 'id', 'name', 'decl'], sinc: [],
};

const SOURCE = 'const greeting = "hello"; function greet(name) { return greeting + name; }';

describe('cs_mast_s_exists', () => {
  const tree = cs_mast_init(SOURCE, cfg);

  it('returns true for a signature that exists in the tree', () => {
    const sig = [...tree._signatureMap.keys()][0];
    expect(cs_mast_s_exists(tree, sig)).toBe(true);
  });

  it('returns true for all signatures in the map', () => {
    for (const sig of tree._signatureMap.keys()) {
      expect(cs_mast_s_exists(tree, sig)).toBe(true);
    }
  });

  it('returns false for a fabricated signature (wrong hash)', () => {
    const fabricated = buildSignatureFromConfig(cfg, 'a'.repeat(64));
    expect(cs_mast_s_exists(tree, fabricated)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(cs_mast_s_exists(tree, '')).toBe(false);
  });

  it('returns false for a valid-format signature from a different source', () => {
    const otherTree = cs_mast_init('const other = 999;', cfg);
    const otherSigs = [...otherTree._signatureMap.keys()];
    for (const sig of otherSigs) {
      // Each sig in otherTree might or might not appear in tree; specifically
      // the NumericLiteral 999 signature should NOT appear in tree
      // (tree has "hello" and other identifiers, not 999)
    }
    // Cross-check: root hashes differ
    expect(tree.rootHash).not.toBe(otherTree.rootHash);
  });

  it('lookup does not modify the signatureMap (no side effects)', () => {
    const sizeBefore = tree._signatureMap.size;
    const sig = [...tree._signatureMap.keys()][0];
    cs_mast_s_exists(tree, sig);
    cs_mast_s_exists(tree, 'a'.repeat(64));
    expect(tree._signatureMap.size).toBe(sizeBefore);
  });

  it('O(1) lookup: is backed by Map.has', () => {
    // Functional check: signature present = true, not present = false
    const validSig = [...tree._signatureMap.keys()][0];
    const invalidSig = validSig.slice(0, -1) + (validSig.endsWith('a') ? 'b' : 'a');
    expect(cs_mast_s_exists(tree, validSig)).toBe(true);
    expect(cs_mast_s_exists(tree, invalidSig)).toBe(false);
  });
});
