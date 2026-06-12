import { literalValueString, childHash, refHash, refArrayHashes } from "../../../src/hash/hash-input-builder";
import type { AdapterNode } from "../../../src/types/node-descriptor";

function makeNode(overrides: Partial<AdapterNode> = {}): AdapterNode {
    return {
        nodeType: "StringLiteral",
        children: [],
        refs: {},
        pathKey: "test",
        ...overrides,
    };
}

describe("literalValueString", () => {
    it('NullLiteral → "null"', () => {
        expect(literalValueString(makeNode({ nodeType: "NullLiteral", value: "null" }))).toBe("null");
    });

    it('BooleanLiteral true → "true"', () => {
        expect(literalValueString(makeNode({ nodeType: "BooleanLiteral", value: "true" }))).toBe("true");
    });

    it('BooleanLiteral false → "false"', () => {
        expect(literalValueString(makeNode({ nodeType: "BooleanLiteral", value: "false" }))).toBe("false");
    });

    it("NumericLiteral → String of value", () => {
        expect(literalValueString(makeNode({ nodeType: "NumericLiteral", value: "42" }))).toBe("42");
    });

    it("StringLiteral → raw value (not quoted)", () => {
        expect(literalValueString(makeNode({ nodeType: "StringLiteral", value: "hello" }))).toBe("hello");
    });

    it("BigIntLiteral → value string", () => {
        expect(literalValueString(makeNode({ nodeType: "BigIntLiteral", value: "9007199254740993" }))).toBe(
            "9007199254740993"
        );
    });

    it("RegExpLiteral → already-normalized value from mapper", () => {
        expect(literalValueString(makeNode({ nodeType: "RegExpLiteral", value: "/hello/gi" }))).toBe("/hello/gi");
    });
});

describe("childHash", () => {
    it("returns empty string for undefined node", () => {
        expect(childHash(undefined)).toBe("");
        expect(childHash(null)).toBe("");
    });

    it("returns computedHash if present", () => {
        const node = makeNode({ computedHash: "abc123" });
        expect(childHash(node)).toBe("abc123");
    });

    it("returns empty string if computedHash absent", () => {
        const node = makeNode();
        expect(childHash(node)).toBe("");
    });
});

describe("refHash", () => {
    it("returns hash of named single-node ref", () => {
        const child = makeNode({ computedHash: "deadbeef" });
        const parent = makeNode({ refs: { id: child } });
        expect(refHash(parent, "id")).toBe("deadbeef");
    });

    it("returns empty string for missing ref", () => {
        const parent = makeNode();
        expect(refHash(parent, "id")).toBe("");
    });

    it("returns empty string for array ref", () => {
        const parent = makeNode({ refs: { params: [] } });
        expect(refHash(parent, "params")).toBe("");
    });
});

describe("refArrayHashes", () => {
    it("concatenates hashes of array children in order", () => {
        const c1 = makeNode({ computedHash: "aaa" });
        const c2 = makeNode({ computedHash: "bbb" });
        const parent = makeNode({ refs: { items: [c1, c2] } });
        expect(refArrayHashes(parent, "items")).toBe("aaabbb");
    });

    it("returns empty string for missing ref", () => {
        expect(refArrayHashes(makeNode(), "items")).toBe("");
    });

    it("handles missing computedHash in child as empty string", () => {
        const c = makeNode();
        const parent = makeNode({ refs: { items: [c] } });
        expect(refArrayHashes(parent, "items")).toBe("");
    });
});
