export type HashAlgorithm = "sha256";

export type ScatCategory = "lit" | "id" | "op" | "decl" | "loop" | "cond" | "name" | "val" | "op_name";

export interface CsMastConfig {
    /** Hash algorithm. Currently only 'sha256' is supported. */
    hash: HashAlgorithm;
    /** Shortest valid file extension for the language, e.g. 'js', 'py'. */
    lang: string;
    /** Optional language version, e.g. 'es6', 'es2022'. */
    lver?: string;
    /** Parser name. Characters outside [a-zA-Z0-9/+.-] are replaced with '-'. */
    prsr: string;
    /** Active scat category codes. At least one of scat/sinc must be non-empty. */
    scat: ScatCategory[];
    /** Exact node type names to include verbatim. Deduplicated against scat at init time. */
    sinc: string[];
    /** @babel/parser sourceType (default: 'module'). */
    sourceType?: "script" | "module" | "unambiguous";
    /** Extra @babel/parser plugins beyond ['jsx', 'typescript']. */
    parserPlugins?: string[];
}
