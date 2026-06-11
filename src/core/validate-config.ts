import type { CsMastConfig } from '../types/config';
import { ConfigError } from '../errors';

const SUPPORTED_HASH_ALGORITHMS = new Set(['sha256']);

export function validateConfig(config: CsMastConfig): void {
  if (!config.hash) {
    throw new ConfigError('hash is required', 'hash');
  }
  if (!SUPPORTED_HASH_ALGORITHMS.has(config.hash)) {
    throw new ConfigError(`Unsupported hash algorithm '${config.hash}'. Supported: sha256`, 'hash');
  }
  if (!config.lang) {
    throw new ConfigError('lang is required', 'lang');
  }
  if (!config.prsr) {
    throw new ConfigError('prsr is required', 'prsr');
  }
  const hasScat = Array.isArray(config.scat) && config.scat.length > 0;
  const hasSinc = Array.isArray(config.sinc) && config.sinc.length > 0;
  if (!hasScat && !hasSinc) {
    throw new ConfigError('At least one of scat or sinc must be non-empty', 'scat/sinc');
  }
}
