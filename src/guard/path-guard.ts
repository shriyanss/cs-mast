import { MutationError } from "../errors";

/**
 * Methods on @babel/traverse NodePath that mutate the AST and must not be called
 * on a CS-MAST tree, as they invalidate all computed signatures.
 * Note: direct property assignment (path.node.x = y) cannot be caught at runtime;
 * it is guarded only at the TypeScript type level via Readonly<>.
 */
export const RESTRICTED_METHODS = [
    "replaceWith",
    "replaceWithMultiple",
    "replaceWithSourceString",
    "replaceInline",
    "insertBefore",
    "insertAfter",
    "remove",
    "pushContainer",
    "unshiftContainer",
] as const;

export type RestrictedMethod = (typeof RESTRICTED_METHODS)[number];

/** Returns a function that always throws MutationError for the named method. */
export function makeGuard(methodName: string): () => never {
    return () => {
        throw new MutationError(methodName);
    };
}

/**
 * Wraps a Babel NodePath in a Proxy that throws MutationError when any
 * restricted method is accessed. All other property accesses pass through.
 */
export function guardPath<T extends object>(path: T): T {
    const restricted = new Set<string>(RESTRICTED_METHODS);
    return new Proxy(path, {
        get(target, prop) {
            if (typeof prop === "string" && restricted.has(prop)) {
                return makeGuard(prop);
            }
            const val = (target as Record<string, unknown>)[prop as string];
            return typeof val === "function" ? val.bind(target) : val;
        },
    });
}
