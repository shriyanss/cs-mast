import type { CsMastConfig, ScatCategory } from '../types/config';
import { SCAT_NODE_TYPES } from './category-map';

export interface ResolvedConfig {
  /** All node types covered by scat or sinc (used to decide isActivelyHashed). */
  activeNodeTypes: Set<string>;
  activeScat: Set<ScatCategory>;
  /** sinc entries that are NOT already covered by a scat category (deduplicated per A10). */
  activeSinc: Set<string>;
  hasLit:    boolean;
  hasId:     boolean;
  hasOp:     boolean;
  hasDecl:   boolean;
  hasLoop:   boolean;
  hasCond:   boolean;
  hasName:   boolean;
  hasVal:    boolean;
  hasOpName: boolean;
}

/**
 * Resolves the effective configuration:
 * - Computes scat-covered node types from Table I.
 * - Deduplicates sinc against scat-covered types (A10: scat wins).
 * - Exposes boolean flags for common category membership tests.
 */
export function resolveConfig(config: CsMastConfig): ResolvedConfig {
  const activeScat = new Set<ScatCategory>(config.scat);

  const scatCoveredTypes = new Set<string>();
  for (const [nodeType, cats] of Object.entries(SCAT_NODE_TYPES)) {
    if (cats.some((c) => activeScat.has(c))) {
      scatCoveredTypes.add(nodeType);
    }
  }

  const activeSinc = new Set<string>();
  for (const nodeType of config.sinc ?? []) {
    if (!scatCoveredTypes.has(nodeType)) {
      activeSinc.add(nodeType);
    }
  }

  const activeNodeTypes = new Set([...scatCoveredTypes, ...activeSinc]);

  return {
    activeNodeTypes,
    activeScat,
    activeSinc,
    hasLit:    activeScat.has('lit'),
    hasId:     activeScat.has('id'),
    hasOp:     activeScat.has('op'),
    hasDecl:   activeScat.has('decl'),
    hasLoop:   activeScat.has('loop'),
    hasCond:   activeScat.has('cond'),
    hasName:   activeScat.has('name'),
    hasVal:    activeScat.has('val'),
    hasOpName: activeScat.has('op_name'),
  };
}
