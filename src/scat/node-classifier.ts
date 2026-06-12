import type { AdapterNode } from "../types/node-descriptor";
import type { ResolvedConfig } from "./category-resolver";
import { LIT_TYPES, ID_TYPES, OP_TYPES, DECL_TYPES, LOOP_TYPES, COND_TYPES } from "./category-map";

export interface NodeClassification {
    /** True if this node should be actively hashed (added to signatureMap). */
    shouldHash: boolean;
    isLit: boolean;
    isId: boolean;
    isOp: boolean;
    isDecl: boolean;
    isLoop: boolean;
    isCond: boolean;
    /** True if covered only by sinc (not by any scat category). */
    isSincOnly: boolean;
}

export function classifyNode(node: AdapterNode, resolved: ResolvedConfig): NodeClassification {
    const t = node.nodeType;
    const isLit = resolved.hasLit && LIT_TYPES.has(t);
    const isId = resolved.hasId && ID_TYPES.has(t);
    const isOp = resolved.hasOp && OP_TYPES.has(t);
    const isDecl = resolved.hasDecl && DECL_TYPES.has(t);
    const isLoop = resolved.hasLoop && LOOP_TYPES.has(t);
    const isCond = resolved.hasCond && COND_TYPES.has(t);
    const isSincOnly = !isLit && !isId && !isOp && !isDecl && !isLoop && !isCond && resolved.activeSinc.has(t);
    const shouldHash = isLit || isId || isOp || isDecl || isLoop || isCond || isSincOnly;
    return { shouldHash, isLit, isId, isOp, isDecl, isLoop, isCond, isSincOnly };
}
