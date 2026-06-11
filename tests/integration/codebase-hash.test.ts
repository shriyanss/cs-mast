import * as fs from 'fs';
import * as path from 'path';
import { cs_mast_init_codebase } from '../../src/core/codebase-hash';
import { sha256 } from '../../src/hash/sha256';
import { parseSignature } from '../../src/signature/signature-parser';
import type { CsMastConfig } from '../../src/types/config';

const cfg: CsMastConfig = {
  hash: 'sha256', lang: 'js', lver: 'es6',
  prsr: '@babel/parser', scat: ['lit', 'decl'], sinc: [],
};

const SIMPLE   = fs.readFileSync(path.join(__dirname, '../fixtures/simple.js'), 'utf8');
const IMPORTS  = fs.readFileSync(path.join(__dirname, '../fixtures/imports.js'), 'utf8');

describe('cs_mast_init_codebase', () => {
  it('returns one tree per file', () => {
    const result = cs_mast_init_codebase([
      { filename: 'a.js', source: SIMPLE },
      { filename: 'b.js', source: IMPORTS },
    ], cfg);
    expect(result.trees).toHaveLength(2);
  });

  it('each tree root hash is a valid 64-char hex', () => {
    const result = cs_mast_init_codebase([
      { filename: 'a.js', source: SIMPLE },
      { filename: 'b.js', source: IMPORTS },
    ], cfg);
    for (const tree of result.trees) {
      expect(tree.rootHash).toHaveLength(64);
      expect(tree.rootHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('codebaseHash = sha256(sorted(rootHashes).join(""))', () => {
    const result = cs_mast_init_codebase([
      { filename: 'a.js', source: SIMPLE },
      { filename: 'b.js', source: IMPORTS },
    ], cfg);
    const hashes = result.trees.map((t) => t.rootHash);
    hashes.sort();
    const expected = sha256(hashes.join(''));
    expect(result.codebaseHash).toBe(expected);
  });

  it('file ordering does not affect codebaseHash', () => {
    const r1 = cs_mast_init_codebase([
      { filename: 'a.js', source: SIMPLE },
      { filename: 'b.js', source: IMPORTS },
    ], cfg);
    const r2 = cs_mast_init_codebase([
      { filename: 'b.js', source: IMPORTS },
      { filename: 'a.js', source: SIMPLE },
    ], cfg);
    expect(r1.codebaseHash).toBe(r2.codebaseHash);
  });

  it('single-file codebaseHash = sha256(rootHash)', () => {
    const result = cs_mast_init_codebase([{ filename: 'a.js', source: SIMPLE }], cfg);
    expect(result.codebaseHash).toBe(sha256(result.trees[0].rootHash));
  });

  it('codebaseSignature is a valid CS-MAST-S string with codebaseHash', () => {
    const result = cs_mast_init_codebase([{ filename: 'a.js', source: SIMPLE }], cfg);
    const parsed = parseSignature(result.codebaseSignature);
    expect(parsed).not.toBeNull();
    expect(parsed!.hashHex).toBe(result.codebaseHash);
  });

  it('different files produce different codebaseHash', () => {
    const r1 = cs_mast_init_codebase([{ filename: 'a.js', source: SIMPLE }], cfg);
    const r2 = cs_mast_init_codebase([{ filename: 'b.js', source: IMPORTS }], cfg);
    expect(r1.codebaseHash).not.toBe(r2.codebaseHash);
  });
});
