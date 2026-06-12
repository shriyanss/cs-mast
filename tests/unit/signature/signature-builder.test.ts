import { buildSignature, buildSignatureFromConfig } from "../../../src/signature/signature-builder";
import { parseSignature } from "../../../src/signature/signature-parser";
import type { CsMastSignature } from "../../../src/types/signature";

const HEX64 = "a".repeat(64);

function base(): CsMastSignature {
    return {
        version: 1,
        hash: "sha256",
        lang: "js",
        prsr: "-babel/parser",
        scat: ["lit"],
        sinc: [],
        hashHex: HEX64,
    };
}

describe("buildSignature", () => {
    it("always includes $v=1", () => {
        expect(buildSignature(base())).toMatch(/^\$v=1\$/);
    });

    it("ends with $<64hex>", () => {
        const sig = buildSignature(base());
        expect(sig).toMatch(/\$[0-9a-f]{64}$/);
        expect(sig.endsWith("$" + HEX64)).toBe(true);
    });

    it("omits lver when undefined", () => {
        const sig = buildSignature({ ...base(), lver: undefined });
        expect(sig).not.toContain("lver");
    });

    it("includes lver when defined", () => {
        const sig = buildSignature({ ...base(), lver: "es6" });
        expect(sig).toContain("lver=es6");
    });

    it("multiple scat joined with _", () => {
        const sig = buildSignature({ ...base(), scat: ["lit", "decl"] });
        expect(sig).toContain("scat=lit_decl");
    });

    it("multiple sinc joined with _", () => {
        const sig = buildSignature({ ...base(), scat: [], sinc: ["IfStatement", "ForStatement"] });
        expect(sig).toContain("sinc=IfStatement_ForStatement");
    });

    it("round-trip: build → parse → build is lossless", () => {
        const parts = { ...base(), lver: "es2022", scat: ["lit", "id"], sinc: ["IfStatement"] };
        const sig1 = buildSignature(parts);
        const parsed = parseSignature(sig1)!;
        const sig2 = buildSignature(parsed);
        expect(sig2).toBe(sig1);
    });
});

describe("buildSignatureFromConfig", () => {
    it("sanitizes prsr automatically", () => {
        const sig = buildSignatureFromConfig(
            { hash: "sha256", lang: "js", prsr: "@babel/parser", scat: ["lit"], sinc: [] },
            HEX64
        );
        expect(sig).toContain("prsr=-babel/parser");
    });
});
