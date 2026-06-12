import { sanitizePrsr } from "../../../src/signature/prsr-sanitizer";

describe("sanitizePrsr", () => {
    it("replaces @ with -", () => {
        expect(sanitizePrsr("@babel/parser")).toBe("-babel/parser");
    });

    it("keeps allowed chars: a-z A-Z 0-9 / + . -", () => {
        expect(sanitizePrsr("abc/XYZ+1.2-3")).toBe("abc/XYZ+1.2-3");
    });

    it("replaces space with -", () => {
        expect(sanitizePrsr("my parser")).toBe("my-parser");
    });

    it("replaces multiple illegal chars", () => {
        expect(sanitizePrsr("foo@bar!baz")).toBe("foo-bar-baz");
    });

    it("empty string stays empty", () => {
        expect(sanitizePrsr("")).toBe("");
    });

    it("already-clean name unchanged", () => {
        expect(sanitizePrsr("tree-sitter/python")).toBe("tree-sitter/python");
    });
});
