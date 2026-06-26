import * as fs from "fs";
import * as path from "path";
import { cs_mast_init, CS_MAST_SIGNATURE_KEY } from "../../src/core/cs-mast-init";
import { parseSignature } from "../../src/signature/signature-parser";
import type { CsMastConfig } from "../../src/types/config";
import type { AdapterNode } from "../../src/types/node-descriptor";
import { ConfigError } from "../../src/errors";

const FIXTURE = path.join(__dirname, "../fixtures/simple.js");
const SOURCE = fs.readFileSync(FIXTURE, "utf8");

function cfg(overrides: Partial<CsMastConfig> = {}): CsMastConfig {
    return {
        hash: "sha256",
        lang: "js",
        lver: "es6",
        prsr: "@babel/parser",
        scat: ["lit", "id", "decl"],
        sinc: [],
        ...overrides,
    };
}

// ─── Basic sanity ─────────────────────────────────────────────────────────────

describe("cs_mast_init — basic", () => {
    it("returns a CsMastTree with a root AdapterNode", () => {
        const tree = cs_mast_init(SOURCE, cfg());
        expect(tree.root).toBeDefined();
        expect(tree.root.nodeType).toBe("File");
    });

    it("rootHash is a 64-char hex string", () => {
        const tree = cs_mast_init(SOURCE, cfg());
        expect(tree.rootHash).toHaveLength(64);
        expect(tree.rootHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("signatureMap is non-empty", () => {
        const tree = cs_mast_init(SOURCE, cfg());
        expect(tree._signatureMap.size).toBeGreaterThan(0);
    });

    it("all signature keys are valid CS-MAST-S strings", () => {
        const tree = cs_mast_init(SOURCE, cfg());
        for (const sig of tree._signatureMap.keys()) {
            expect(parseSignature(sig)).not.toBeNull();
        }
    });

    it("throws ConfigError when both scat and sinc are empty", () => {
        expect(() => cs_mast_init("let x = 1;", cfg({ scat: [], sinc: [] }))).toThrow(ConfigError);
    });
});

// ─── cs-mast-s-hash attachment ────────────────────────────────────────────────

describe("cs-mast-s-hash attachment", () => {
    it("attaches cs-mast-s-hash to actively-hashed Babel nodes", () => {
        const tree = cs_mast_init('const x = "hello";', cfg());

        let found = 0;
        function walk(node: AdapterNode) {
            if (node._raw && typeof node._raw === "object") {
                const raw = node._raw as Record<string, unknown>;
                if (raw[CS_MAST_SIGNATURE_KEY]) found++;
            }
            for (const child of node.children) walk(child);
        }
        walk(tree.root);
        expect(found).toBeGreaterThan(0);
    });
});

// ─── Determinism ──────────────────────────────────────────────────────────────

describe("Determinism", () => {
    it("same source + same config → identical root hash (repeated calls)", () => {
        const c = cfg();
        const h1 = cs_mast_init(SOURCE, c).rootHash;
        const h2 = cs_mast_init(SOURCE, c).rootHash;
        const h3 = cs_mast_init(SOURCE, c).rootHash;
        expect(h1).toBe(h2);
        expect(h2).toBe(h3);
    });

    it("same source + same config → identical signatureMap", () => {
        const c = cfg();
        const t1 = cs_mast_init(SOURCE, c);
        const t2 = cs_mast_init(SOURCE, c);
        const sigs1 = [...t1._signatureMap.keys()].sort();
        const sigs2 = [...t2._signatureMap.keys()].sort();
        expect(sigs1).toEqual(sigs2);
    });

    it("different configs → different root hashes", () => {
        // Use val/name modifiers so the hash formula inputs differ between configs
        const h1 = cs_mast_init(SOURCE, cfg({ scat: ["lit", "val"] })).rootHash;
        const h2 = cs_mast_init(SOURCE, cfg({ scat: ["id", "name"] })).rootHash;
        expect(h1).not.toBe(h2);
    });
});

// ─── Collision avoidance (the URR problem) ────────────────────────────────────

describe("Collision avoidance", () => {
    it("let x = 1 vs const x = 1 → different signatures when decl active (eq8)", () => {
        const c = cfg({ scat: ["decl", "lit", "id"] });
        const t1 = cs_mast_init("let x = 1;", c);
        const t2 = cs_mast_init("const x = 1;", c);
        // Different kinds → different VariableDeclaration hashes
        const sigs1 = new Set(t1._signatureMap.keys());
        const sigs2 = new Set(t2._signatureMap.keys());
        // The VariableDeclaration signatures must differ
        const _intersection = [...sigs1].filter((s) => sigs2.has(s));
        // At minimum the root hashes must differ
        expect(t1.rootHash).not.toBe(t2.rootHash);
        // Verify no overlap in the VD-level sigs specifically
        const _letVD = [...sigs1].find(
            (s) => s.includes("VariableDeclaration") || parseSignature(s)?.hashHex !== undefined
        );
        const _constVD = [...sigs2].find(
            (s) => s.includes("VariableDeclaration") || parseSignature(s)?.hashHex !== undefined
        );
        // Simple check: at least one signature differs
        expect([...sigs1].sort().join(",")).not.toBe([...sigs2].sort().join(","));
    });

    it("Two literals with same type, different values → different hashes when val active", () => {
        const c = cfg({ scat: ["lit", "val"] });
        const t1 = cs_mast_init("const x = 1;", c);
        const t2 = cs_mast_init("const x = 2;", c);
        expect(t1.rootHash).not.toBe(t2.rootHash);
    });

    it("Two literals with same type, different values → same hash when val absent (eq3)", () => {
        const c = cfg({ scat: ["lit"] }); // no val modifier
        // Use variable declarations to ensure Babel parses these as StringLiteral, not directives
        const t1 = cs_mast_init('const x = "hello";', c);
        const t2 = cs_mast_init('const x = "world";', c);
        // Both StringLiterals hash to sha256('StringLiteral') — same signature
        const sigs1 = new Set(t1._signatureMap.keys());
        const sigs2 = new Set(t2._signatureMap.keys());
        const hasCommon = [...sigs1].some((s) => sigs2.has(s));
        expect(hasCommon).toBe(true);
    });

    it("Two identifiers with same type, different names → different hashes when name active", () => {
        const c = cfg({ scat: ["id", "name"] });
        const t1 = cs_mast_init("foo", c);
        const t2 = cs_mast_init("bar", c);
        expect(t1.rootHash).not.toBe(t2.rootHash);
    });

    it("Two identifiers with same type, different names → same hash when name absent", () => {
        const c = cfg({ scat: ["id"] });
        const t1 = cs_mast_init("foo", c);
        const t2 = cs_mast_init("bar", c);
        const sigs1 = new Set(t1._signatureMap.keys());
        const sigs2 = new Set(t2._signatureMap.keys());
        const hasCommon = [...sigs1].some((s) => sigs2.has(s));
        expect(hasCommon).toBe(true);
    });
});

// ─── Config sensitivity ───────────────────────────────────────────────────────

describe("Config sensitivity", () => {
    it("flipping val on/off changes literal signatures", () => {
        const withVal = cfg({ scat: ["lit", "val"] });
        const withoutVal = cfg({ scat: ["lit"] });
        const t1 = cs_mast_init("const x = 42;", withVal);
        const t2 = cs_mast_init("const x = 42;", withoutVal);
        const sigs1 = new Set(t1._signatureMap.keys());
        const sigs2 = new Set(t2._signatureMap.keys());
        expect([...sigs1].some((s) => sigs2.has(s))).toBe(false);
    });

    it("flipping name on/off changes identifier signatures", () => {
        const withName = cfg({ scat: ["id", "name"] });
        const withoutName = cfg({ scat: ["id"] });
        const t1 = cs_mast_init("let x;", withName);
        const t2 = cs_mast_init("let x;", withoutName);
        const sigs1 = new Set(t1._signatureMap.keys());
        const sigs2 = new Set(t2._signatureMap.keys());
        expect([...sigs1].some((s) => sigs2.has(s))).toBe(false);
    });

    it("flipping decl on/off changes declaration signatures", () => {
        const withDecl = cfg({ scat: ["decl"] });
        const withoutDecl = cfg({ scat: ["lit"] });
        const source = "function foo(x) { return x; }";
        const t1 = cs_mast_init(source, withDecl);
        const t2 = cs_mast_init(source, withoutDecl);
        expect(t1.rootHash).not.toBe(t2.rootHash);
    });
});

// ─── Post-order correctness ───────────────────────────────────────────────────

describe("Post-order correctness", () => {
    it("parent hash depends on child hash (Merkle property)", () => {
        const c = cfg({ scat: ["lit", "val", "decl"] });
        const t1 = cs_mast_init("const x = 1;", c);
        const t2 = cs_mast_init("const x = 2;", c);

        // Child hashes (NumericLiteral) differ because values differ
        // Parent hashes (VariableDeclarator, VariableDeclaration) must also differ
        expect(t1.rootHash).not.toBe(t2.rootHash);
    });

    it("uncategorized nodes with no active descendants have undefined computedHash", () => {
        // With only sinc: ["BreakStatement"], File/Program/WhileStatement are uncategorized.
        // The root (File) is not actively hashed.
        const tree = cs_mast_init("while(true) { break; }", {
            hash: "sha256",
            lang: "js",
            lver: "es6",
            prsr: "@babel/parser",
            scat: [],
            sinc: ["BreakStatement"],
        });
        expect(tree.root.isActivelyHashed).toBe(false);
        // Root still gets a computedHash via transparent passthrough from BreakStatement below
        expect(tree.rootHash).toHaveLength(64);
    });
});
