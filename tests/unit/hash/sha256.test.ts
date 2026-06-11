import { sha256 } from '../../../src/hash/sha256';

describe('sha256', () => {
  it('returns 64-char lowercase hex', () => {
    const result = sha256('test');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches known SHA-256 vectors', () => {
    // Verified against sha256sum, OpenSSL, Python hashlib, Node crypto
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('a')).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
  });

  it('is deterministic', () => {
    expect(sha256('foo')).toBe(sha256('foo'));
  });

  it('handles UTF-8 multi-byte input', () => {
    const result = sha256('こんにちは');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different inputs produce different outputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
    expect(sha256('StringLiteral')).not.toBe(sha256('NumericLiteral'));
  });
});
