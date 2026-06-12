import { parseSignature } from "../../../src/signature/signature-parser";

const HEX64 = "b".repeat(64);

describe("parseSignature", () => {
    const VALID = `$v=1$hash=sha256,lang=js,lver=es6,prsr=-babel/parser,scat=lit$${HEX64}`;

    it("parses a valid signature", () => {
        const result = parseSignature(VALID);
        expect(result).not.toBeNull();
        expect(result!.version).toBe(1);
        expect(result!.hash).toBe("sha256");
        expect(result!.lang).toBe("js");
        expect(result!.lver).toBe("es6");
        expect(result!.prsr).toBe("-babel/parser");
        expect(result!.scat).toEqual(["lit"]);
        expect(result!.sinc).toEqual([]);
        expect(result!.hashHex).toBe(HEX64);
    });

    it("parses spec example format", () => {
        const sig = `$v=1$hash=sha256,lang=js,lver=es6,prsr=-babel/parser,scat=lit_loop$${HEX64}`;
        const r = parseSignature(sig)!;
        expect(r.scat).toEqual(["lit", "loop"]);
    });

    it("splits sinc on _", () => {
        const sig = `$v=1$hash=sha256,lang=js,prsr=-babel/parser,sinc=IfStatement_ForStatement$${HEX64}`;
        const r = parseSignature(sig)!;
        expect(r.sinc).toEqual(["IfStatement", "ForStatement"]);
    });

    it("lver absent → undefined", () => {
        const sig = `$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=lit$${HEX64}`;
        expect(parseSignature(sig)!.lver).toBeUndefined();
    });

    it("returns null for missing hash field", () => {
        const sig = `$v=1$lang=js,prsr=-babel/parser,scat=lit$${HEX64}`;
        expect(parseSignature(sig)).toBeNull();
    });

    it("returns null for missing lang field", () => {
        const sig = `$v=1$hash=sha256,prsr=-babel/parser,scat=lit$${HEX64}`;
        expect(parseSignature(sig)).toBeNull();
    });

    it("returns null for missing prsr field", () => {
        const sig = `$v=1$hash=sha256,lang=js,scat=lit$${HEX64}`;
        expect(parseSignature(sig)).toBeNull();
    });

    it("returns null when both scat and sinc are absent", () => {
        const sig = `$v=1$hash=sha256,lang=js,prsr=-babel/parser$${HEX64}`;
        expect(parseSignature(sig)).toBeNull();
    });

    it("returns null for non-64-char hashHex", () => {
        const sig = `$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=lit$abcdef`;
        expect(parseSignature(sig)).toBeNull();
    });

    it("returns null for uppercase hex in hashHex", () => {
        const sig = `$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=lit$${"A".repeat(64)}`;
        expect(parseSignature(sig)).toBeNull();
    });

    it("returns null for empty string", () => {
        expect(parseSignature("")).toBeNull();
    });

    it("returns null for non-$ prefix", () => {
        expect(parseSignature("v=1$hash=sha256,lang=js,prsr=x,scat=lit$" + HEX64)).toBeNull();
    });
});
