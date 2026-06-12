export class ParseError extends Error {
    readonly source: string;
    readonly parserName: string;
    constructor(message: string, source: string, parserName: string) {
        super(message);
        this.name = "ParseError";
        this.source = source;
        this.parserName = parserName;
    }
}

export class ConfigError extends Error {
    readonly field: string;
    constructor(message: string, field: string) {
        super(message);
        this.name = "ConfigError";
        this.field = field;
    }
}

export class MutationError extends Error {
    readonly method: string;
    constructor(method: string) {
        super(
            `CS-MAST mutation guard: '${method}' is not allowed on a CS-MAST tree. Modifying a node invalidates all computed signatures. Re-run cs_mast_init after any structural change.`
        );
        this.name = "MutationError";
        this.method = method;
    }
}
