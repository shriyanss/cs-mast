import { computeNodeHash, computeDefaultHash } from "../../../src/hash/hash-formulas";
import { sha256 } from "../../../src/hash/sha256";
import { resolveConfig } from "../../../src/scat/category-resolver";
import type { AdapterNode } from "../../../src/types/node-descriptor";
import type { CsMastConfig } from "../../../src/types/config";

function cfg(overrides: Partial<CsMastConfig> = {}): CsMastConfig {
    return {
        hash: "sha256",
        lang: "js",
        prsr: "@babel/parser",
        scat: [],
        sinc: [],
        ...overrides,
    };
}

function node(overrides: Partial<AdapterNode>): AdapterNode {
    return {
        nodeType: "Unknown",
        children: [],
        refs: {},
        pathKey: "p",
        ...overrides,
    };
}

// ─── Literals ─────────────────────────────────────────────────────────────────

describe("Literal formulas", () => {
    describe("eq2: lit + val → Hash(LitType + LitValue)", () => {
        it("StringLiteral with value", () => {
            const n = node({ nodeType: "StringLiteral", value: "hello" });
            const r = resolveConfig(cfg({ scat: ["lit", "val"] }));
            expect(computeNodeHash(n, r)).toBe(sha256("StringLiteral" + "hello"));
        });

        it("NumericLiteral with value", () => {
            const n = node({ nodeType: "NumericLiteral", value: "42" });
            const r = resolveConfig(cfg({ scat: ["lit", "val"] }));
            expect(computeNodeHash(n, r)).toBe(sha256("NumericLiteral" + "42"));
        });

        it("BooleanLiteral true", () => {
            const n = node({ nodeType: "BooleanLiteral", value: "true" });
            const r = resolveConfig(cfg({ scat: ["lit", "val"] }));
            expect(computeNodeHash(n, r)).toBe(sha256("BooleanLiteral" + "true"));
        });

        it('NullLiteral uses "null" as value', () => {
            const n = node({ nodeType: "NullLiteral", value: "null" });
            const r = resolveConfig(cfg({ scat: ["lit", "val"] }));
            expect(computeNodeHash(n, r)).toBe(sha256("NullLiteral" + "null"));
        });

        it("BigIntLiteral", () => {
            const n = node({ nodeType: "BigIntLiteral", value: "9007199254740993" });
            const r = resolveConfig(cfg({ scat: ["lit", "val"] }));
            expect(computeNodeHash(n, r)).toBe(sha256("BigIntLiteral" + "9007199254740993"));
        });

        it("RegExpLiteral (flags pre-sorted by mapper)", () => {
            const n = node({ nodeType: "RegExpLiteral", value: "/hello/gi" });
            const r = resolveConfig(cfg({ scat: ["lit", "val"] }));
            expect(computeNodeHash(n, r)).toBe(sha256("RegExpLiteral" + "/hello/gi"));
        });
    });

    describe("eq3: lit only → Hash(LitType)", () => {
        it("StringLiteral without val", () => {
            const n = node({ nodeType: "StringLiteral", value: "ignored" });
            const r = resolveConfig(cfg({ scat: ["lit"] }));
            expect(computeNodeHash(n, r)).toBe(sha256("StringLiteral"));
        });

        it("Same type, different values → same hash when val absent", () => {
            const n1 = node({ nodeType: "NumericLiteral", value: "1" });
            const n2 = node({ nodeType: "NumericLiteral", value: "2" });
            const r = resolveConfig(cfg({ scat: ["lit"] }));
            expect(computeNodeHash(n1, r)).toBe(computeNodeHash(n2, r));
        });
    });
});

// ─── Identifiers ──────────────────────────────────────────────────────────────

describe("Identifier formulas", () => {
    it("eq4: id + name → Hash(NodeType + NodeName)", () => {
        const n = node({ nodeType: "Identifier", name: "myVar" });
        const r = resolveConfig(cfg({ scat: ["id", "name"] }));
        expect(computeNodeHash(n, r)).toBe(sha256("Identifier" + "myVar"));
    });

    it("eq5: id only → Hash(NodeType)", () => {
        const n = node({ nodeType: "Identifier", name: "myVar" });
        const r = resolveConfig(cfg({ scat: ["id"] }));
        expect(computeNodeHash(n, r)).toBe(sha256("Identifier"));
    });

    it("Same type, different names → different hashes when name active", () => {
        const n1 = node({ nodeType: "Identifier", name: "x" });
        const n2 = node({ nodeType: "Identifier", name: "y" });
        const r = resolveConfig(cfg({ scat: ["id", "name"] }));
        expect(computeNodeHash(n1, r)).not.toBe(computeNodeHash(n2, r));
    });
});

// ─── Operators ────────────────────────────────────────────────────────────────

describe("Operator formulas", () => {
    function binaryNode(leftH: string, op: string, rightH: string): AdapterNode {
        const left = node({ nodeType: "Identifier", computedHash: leftH });
        const right = node({ nodeType: "Identifier", computedHash: rightH });
        return node({
            nodeType: "BinaryExpression",
            operator: op,
            children: [left, right],
            refs: { left, right },
        });
    }

    it("eq6: op + op_name → Hash(Left + Op + Right)", () => {
        const n = binaryNode("aaaa", "+", "bbbb");
        const r = resolveConfig(cfg({ scat: ["op", "op_name"] }));
        expect(computeNodeHash(n, r)).toBe(sha256("aaaa" + "+" + "bbbb"));
    });

    it("eq7: op only → Hash(Left + Right)", () => {
        const n = binaryNode("aaaa", "+", "bbbb");
        const r = resolveConfig(cfg({ scat: ["op"] }));
        expect(computeNodeHash(n, r)).toBe(sha256("aaaa" + "bbbb"));
    });

    it("Different operators → different hashes when op_name active", () => {
        const n1 = binaryNode("h", "+", "h");
        const n2 = binaryNode("h", "-", "h");
        const r = resolveConfig(cfg({ scat: ["op", "op_name"] }));
        expect(computeNodeHash(n1, r)).not.toBe(computeNodeHash(n2, r));
    });

    it("Unary prefix with op_name → Hash(OpName + ArgHash)", () => {
        const arg = node({ nodeType: "Identifier", computedHash: "argh" });
        const n = node({
            nodeType: "UnaryExpression",
            operator: "-",
            prefix: true,
            children: [arg],
            refs: { argument: arg },
        });
        const r = resolveConfig(cfg({ scat: ["op", "op_name"] }));
        expect(computeNodeHash(n, r)).toBe(sha256("-" + "argh"));
    });

    it("UpdateExpression postfix with op_name → Hash(ArgHash + OpName)", () => {
        const arg = node({ nodeType: "Identifier", computedHash: "argh" });
        const n = node({
            nodeType: "UpdateExpression",
            operator: "++",
            prefix: false,
            children: [arg],
            refs: { argument: arg },
        });
        const r = resolveConfig(cfg({ scat: ["op", "op_name"] }));
        expect(computeNodeHash(n, r)).toBe(sha256("argh" + "++"));
    });
});

// ─── Declarations ─────────────────────────────────────────────────────────────

describe("Declaration formulas", () => {
    it("eq8: VariableDeclaration with decl → includes NodeType + Kind", () => {
        const decl1 = node({ nodeType: "VariableDeclarator", computedHash: "hhh" });
        const letN = node({
            nodeType: "VariableDeclaration",
            kind: "let",
            children: [decl1],
            refs: { declarations: [decl1] },
        });
        const constN = node({
            nodeType: "VariableDeclaration",
            kind: "const",
            children: [decl1],
            refs: { declarations: [decl1] },
        });
        const r = resolveConfig(cfg({ scat: ["decl"] }));
        const letH = computeNodeHash(letN, r);
        const constH = computeNodeHash(constN, r);
        expect(letH).toBe(sha256("VariableDeclaration" + "let" + "hhh"));
        expect(constH).toBe(sha256("VariableDeclaration" + "const" + "hhh"));
        expect(letH).not.toBe(constH); // URR collision prevention
    });

    it("VariableDeclaration transparent when decl not in scat → sha256(child hashes)", () => {
        const decl1 = node({ nodeType: "VariableDeclarator", computedHash: "hhh" });
        const n = node({
            nodeType: "VariableDeclaration",
            kind: "let",
            children: [decl1],
            refs: { declarations: [decl1] },
        });
        const r = resolveConfig(cfg({ scat: ["lit"] })); // decl not in scat
        // Transparent passthrough: sha256(child hashes) — no NodeType or Kind
        expect(computeNodeHash(n, r)).toBe(sha256("hhh"));
    });

    it("eq10/11: VariableDeclarator uses NodeType formula when decl is in scat", () => {
        const idN = node({ nodeType: "Identifier", computedHash: "idhash" });
        const initN = node({ nodeType: "NumericLiteral", computedHash: "inithash" });

        const withInit = node({
            nodeType: "VariableDeclarator",
            children: [idN, initN],
            refs: { id: idN, init: initN },
        });
        const withoutInit = node({
            nodeType: "VariableDeclarator",
            children: [idN],
            refs: { id: idN },
        });
        const r = resolveConfig(cfg({ scat: ["decl"] }));

        expect(computeNodeHash(withInit, r)).toBe(sha256("VariableDeclarator" + "idhash" + "inithash"));
        expect(computeNodeHash(withoutInit, r)).toBe(sha256("VariableDeclarator" + "idhash"));
    });

    it("VariableDeclarator is transparent (undefined) when decl not in scat and not in sinc", () => {
        const idN = node({ nodeType: "Identifier", computedHash: undefined });
        const n = node({
            nodeType: "VariableDeclarator",
            children: [idN],
            refs: { id: idN },
        });
        const r = resolveConfig(cfg({ scat: ["lit"] })); // decl not in scat
        expect(computeNodeHash(n, r)).toBeUndefined();
    });

    it("eq12: FunctionDeclaration with decl → includes NodeType", () => {
        const idN = node({ computedHash: "idhash" });
        const param = node({ computedHash: "paramhash" });
        const body = node({ computedHash: "bodyhash" });
        const n = node({
            nodeType: "FunctionDeclaration",
            children: [idN, param, body],
            refs: { id: idN, params: [param], body },
        });
        const r = resolveConfig(cfg({ scat: ["decl"] }));
        expect(computeNodeHash(n, r)).toBe(sha256("FunctionDeclaration" + "idhash" + "paramhash" + "bodyhash"));
    });

    it("FunctionDeclaration transparent when decl not in scat → sha256(child hashes, no NodeType)", () => {
        const idN = node({ computedHash: "idhash" });
        const param = node({ computedHash: "paramhash" });
        const body = node({ computedHash: "bodyhash" });
        const n = node({
            nodeType: "FunctionDeclaration",
            children: [idN, param, body],
            refs: { id: idN, params: [param], body },
        });
        const r = resolveConfig(cfg({ scat: ["lit"] })); // decl not in scat
        // Transparent passthrough: sha256(all children hashes) — no NodeType
        expect(computeNodeHash(n, r)).toBe(sha256("idhash" + "paramhash" + "bodyhash"));
    });

    it("eq14/15: ClassDeclaration with/without superClass", () => {
        const idN = node({ computedHash: "idh" });
        const body = node({ computedHash: "bodyh" });
        const superN = node({ computedHash: "superh" });

        const withSuper = node({
            nodeType: "ClassDeclaration",
            children: [idN, superN, body],
            refs: { id: idN, superClass: superN, body },
        });
        const noSuper = node({
            nodeType: "ClassDeclaration",
            children: [idN, body],
            refs: { id: idN, body },
        });

        const r = resolveConfig(cfg({ scat: ["decl"] }));
        expect(computeNodeHash(withSuper, r)).toBe(sha256("ClassDeclaration" + "idh" + "superh" + "bodyh"));
        expect(computeNodeHash(noSuper, r)).toBe(sha256("ClassDeclaration" + "idh" + "bodyh"));
    });

    it("ClassDeclaration transparent when decl not in scat → sha256(child hashes, no NodeType)", () => {
        const idN = node({ computedHash: "idh" });
        const body = node({ computedHash: "bodyh" });
        const n = node({
            nodeType: "ClassDeclaration",
            children: [idN, body],
            refs: { id: idN, body },
        });
        const r = resolveConfig(cfg({ scat: ["lit"] }));
        // Transparent passthrough: sha256(child hashes) — no NodeType
        expect(computeNodeHash(n, r)).toBe(sha256("idh" + "bodyh"));
    });
});

// ─── Loop formula ─────────────────────────────────────────────────────────────

describe("Loop formula (eq19)", () => {
    it("Sorts child hashes ASCII-ascending", () => {
        const c1 = node({ nodeType: "Identifier", computedHash: "zzz", isActivelyHashed: true });
        const c2 = node({ nodeType: "Identifier", computedHash: "aaa", isActivelyHashed: true });
        const loopN = node({
            nodeType: "ForStatement",
            children: [c1, c2],
            refs: {},
        });
        const r = resolveConfig(cfg({ scat: ["loop", "id"] }));
        c1.computedHash = "zzz";
        c1.isActivelyHashed = true;
        c2.computedHash = "aaa";
        c2.isActivelyHashed = true;
        const hash = computeNodeHash(loopN, r);
        expect(hash).toBe(sha256("ForStatement" + "aaa" + "zzz"));
    });

    it("Only includes actively-hashed children", () => {
        const active = node({ nodeType: "Identifier", computedHash: "active", isActivelyHashed: true });
        const inactive = node({ nodeType: "BlockStatement", computedHash: "inactive", isActivelyHashed: false });
        const loopN = node({
            nodeType: "WhileStatement",
            children: [active, inactive],
            refs: {},
        });
        const r = resolveConfig(cfg({ scat: ["loop", "id"] }));
        const hash = computeNodeHash(loopN, r);
        expect(hash).toBe(sha256("WhileStatement" + "active"));
    });

    it('Hash with no active children → Hash(NodeType + "")', () => {
        const loopN = node({ nodeType: "ForStatement", children: [], refs: {} });
        const r = resolveConfig(cfg({ scat: ["loop"] }));
        expect(computeNodeHash(loopN, r)).toBe(sha256("ForStatement"));
    });
});

// ─── Conditional formula ──────────────────────────────────────────────────────

describe("Conditional formula (eq20/21)", () => {
    it("eq20: with val → double-hash NodeType + Test + Consequent", () => {
        const testN = node({ computedHash: "testhash" });
        const consN = node({ computedHash: "conshash" });
        const n = node({
            nodeType: "IfStatement",
            children: [testN, consN],
            refs: { test: testN, consequent: consN },
        });
        const r = resolveConfig(cfg({ scat: ["cond", "val"] }));
        const expected = sha256(sha256("IfStatement") + sha256("testhash") + sha256("conshash"));
        expect(computeNodeHash(n, r)).toBe(expected);
    });

    it("eq21: without val → double-hash NodeType + Consequent only", () => {
        const testN = node({ computedHash: "testhash" });
        const consN = node({ computedHash: "conshash" });
        const n = node({
            nodeType: "IfStatement",
            children: [testN, consN],
            refs: { test: testN, consequent: consN },
        });
        const r = resolveConfig(cfg({ scat: ["cond"] }));
        const expected = sha256(sha256("IfStatement") + sha256("conshash"));
        expect(computeNodeHash(n, r)).toBe(expected);
    });

    it("SwitchStatement uses discriminant as test and cases as consequent", () => {
        const disc = node({ computedHash: "dischash" });
        const case1 = node({ computedHash: "c1" });
        const case2 = node({ computedHash: "c2" });
        const n = node({
            nodeType: "SwitchStatement",
            children: [disc, case1, case2],
            refs: { discriminant: disc, cases: [case1, case2] },
        });
        const r = resolveConfig(cfg({ scat: ["cond", "val"] }));
        const consInner = sha256("c1" + "c2");
        const expected = sha256(sha256("SwitchStatement") + sha256("dischash") + consInner);
        expect(computeNodeHash(n, r)).toBe(expected);
    });
});

// ─── sinc deduplication ───────────────────────────────────────────────────────

describe("sinc deduplication (A10)", () => {
    it("Node type in scat is not re-hashed by sinc", () => {
        const n = node({ nodeType: "Identifier", name: "x" });
        const r1 = resolveConfig(cfg({ scat: ["id", "name"], sinc: ["Identifier"] }));
        const r2 = resolveConfig(cfg({ scat: ["id", "name"] }));
        // Both should produce the same hash — sinc 'Identifier' is deduplicated against id scat
        expect(computeNodeHash(n, r1)).toBe(computeNodeHash(n, r2));
    });
});

// ─── Default hash (transparent passthrough, A11) ──────────────────────────────

describe("Default hash — transparent passthrough (A11)", () => {
    it("single child with hash → sha256(childHash)", () => {
        const child = node({ nodeType: "X", computedHash: "childH" });
        const parent = node({ nodeType: "BlockStatement", children: [child] });
        expect(computeDefaultHash(parent)).toBe(sha256("childH"));
    });

    it("multiple children with hashes → sha256(concat in source order)", () => {
        const c1 = node({ nodeType: "X", computedHash: "hash1" });
        const c2 = node({ nodeType: "Y", computedHash: "hash2" });
        const parent = node({ nodeType: "BlockStatement", children: [c1, c2] });
        expect(computeDefaultHash(parent)).toBe(sha256("hash1" + "hash2"));
    });

    it("leaf with no children → undefined", () => {
        const n = node({ nodeType: "BreakStatement", children: [] });
        expect(computeDefaultHash(n)).toBeUndefined();
    });

    it("all children have undefined computedHash → undefined", () => {
        const c1 = node({ nodeType: "X", computedHash: undefined });
        const c2 = node({ nodeType: "Y", computedHash: undefined });
        const parent = node({ nodeType: "BlockStatement", children: [c1, c2] });
        expect(computeDefaultHash(parent)).toBeUndefined();
    });

    it("mix of defined and undefined child hashes → only defined ones included", () => {
        const active = node({ nodeType: "X", computedHash: "activeH" });
        const inactive = node({ nodeType: "Y", computedHash: undefined });
        const parent = node({ nodeType: "BlockStatement", children: [active, inactive] });
        expect(computeDefaultHash(parent)).toBe(sha256("activeH"));
    });

    it("nodeType is NOT included in the hash (transparent — no type contribution)", () => {
        const child = node({ nodeType: "X", computedHash: "childH" });
        const p1 = node({ nodeType: "BlockStatement", children: [child] });
        const p2 = node({ nodeType: "SomeOtherNode", children: [child] });
        // Both uncategorized parents with same child produce the same hash
        expect(computeDefaultHash(p1)).toBe(computeDefaultHash(p2));
    });
});
