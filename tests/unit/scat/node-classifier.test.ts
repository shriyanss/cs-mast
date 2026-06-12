import { classifyNode } from "../../../src/scat/node-classifier";
import { resolveConfig } from "../../../src/scat/category-resolver";
import type { AdapterNode } from "../../../src/types/node-descriptor";
import type { CsMastConfig } from "../../../src/types/config";

function cfg(overrides: Partial<CsMastConfig> = {}): CsMastConfig {
    return {
        hash: "sha256",
        lang: "js",
        prsr: "p",
        scat: [],
        sinc: [],
        ...overrides,
    };
}

function node(nodeType: string): AdapterNode {
    return { nodeType, children: [], refs: {}, pathKey: "p" };
}

describe("classifyNode", () => {
    it("StringLiteral with lit in scat → isLit=true, shouldHash=true", () => {
        const r = resolveConfig(cfg({ scat: ["lit"] }));
        const cls = classifyNode(node("StringLiteral"), r);
        expect(cls.isLit).toBe(true);
        expect(cls.shouldHash).toBe(true);
        expect(cls.isId).toBe(false);
    });

    it("StringLiteral without lit in scat → shouldHash=false", () => {
        const r = resolveConfig(cfg({ scat: ["id"] }));
        expect(classifyNode(node("StringLiteral"), r).shouldHash).toBe(false);
    });

    it("Identifier with id+name → isId=true", () => {
        const r = resolveConfig(cfg({ scat: ["id", "name"] }));
        const cls = classifyNode(node("Identifier"), r);
        expect(cls.isId).toBe(true);
    });

    it("IfStatement with cond → isCond=true", () => {
        const r = resolveConfig(cfg({ scat: ["cond"] }));
        expect(classifyNode(node("IfStatement"), r).isCond).toBe(true);
    });

    it("sinc-only node not in any scat → isSincOnly=true, shouldHash=true", () => {
        const r = resolveConfig(cfg({ sinc: ["ReturnStatement"] }));
        const cls = classifyNode(node("ReturnStatement"), r);
        expect(cls.isSincOnly).toBe(true);
        expect(cls.shouldHash).toBe(true);
    });

    it("sinc type already covered by scat → NOT isSincOnly (deduplicated)", () => {
        const r = resolveConfig(cfg({ scat: ["id"], sinc: ["Identifier"] }));
        // Identifier is covered by 'id' scat, so sinc entry is dropped
        const cls = classifyNode(node("Identifier"), r);
        expect(cls.isSincOnly).toBe(false);
        expect(cls.isId).toBe(true);
    });

    it("BlockStatement not in any category → shouldHash=false", () => {
        const r = resolveConfig(cfg({ scat: ["lit", "id", "decl"] }));
        expect(classifyNode(node("BlockStatement"), r).shouldHash).toBe(false);
    });
});
