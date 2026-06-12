import { BabelAdapter } from "../../src/adapters/babel/babel-adapter";
import { ParseError } from "../../src/errors";
import type { CsMastConfig } from "../../src/types/config";
import type { TraversalState } from "../../src/types/parser-adapter";

const cfg: CsMastConfig = {
    hash: "sha256",
    lang: "js",
    lver: "es6",
    prsr: "@babel/parser",
    scat: ["lit", "id", "decl"],
    sinc: [],
};

describe("BabelAdapter", () => {
    const adapter = new BabelAdapter();

    describe("parse()", () => {
        it('returns an AdapterNode with nodeType "File"', () => {
            const root = adapter.parse("const x = 1;", cfg);
            expect(root.nodeType).toBe("File");
        });

        it("root has program child", () => {
            const root = adapter.parse("const x = 1;", cfg);
            expect(root.refs["program"]).toBeDefined();
        });

        it("maps Identifier name correctly", () => {
            const root = adapter.parse("const hello = 1;", cfg);
            const program = root.refs["program"] as import("../../src/types/node-descriptor").AdapterNode;
            const body = program.refs["body"] as import("../../src/types/node-descriptor").AdapterNode[];
            const varDecl = body[0];
            const declarator = (
                varDecl.refs["declarations"] as import("../../src/types/node-descriptor").AdapterNode[]
            )[0];
            const id = declarator.refs["id"] as import("../../src/types/node-descriptor").AdapterNode;
            expect(id.name).toBe("hello");
        });

        it("maps StringLiteral value correctly", () => {
            const root = adapter.parse('const x = "hello";', cfg);
            const prog = root.refs["program"] as import("../../src/types/node-descriptor").AdapterNode;
            const body = prog.refs["body"] as import("../../src/types/node-descriptor").AdapterNode[];
            const varDecl = body[0];
            const declarator = (
                varDecl.refs["declarations"] as import("../../src/types/node-descriptor").AdapterNode[]
            )[0];
            const init = declarator.refs["init"] as import("../../src/types/node-descriptor").AdapterNode;
            expect(init.nodeType).toBe("StringLiteral");
            expect(init.value).toBe("hello");
        });

        it("maps NumericLiteral value as string", () => {
            const root = adapter.parse("const n = 42;", cfg);
            const prog = root.refs["program"] as import("../../src/types/node-descriptor").AdapterNode;
            const body = prog.refs["body"] as import("../../src/types/node-descriptor").AdapterNode[];
            const declarator = (
                body[0].refs["declarations"] as import("../../src/types/node-descriptor").AdapterNode[]
            )[0];
            const init = declarator.refs["init"] as import("../../src/types/node-descriptor").AdapterNode;
            expect(init.nodeType).toBe("NumericLiteral");
            expect(init.value).toBe("42");
        });

        it("maps RegExpLiteral with sorted flags", () => {
            const root = adapter.parse("const r = /foo/gi;", cfg);
            const prog = root.refs["program"] as import("../../src/types/node-descriptor").AdapterNode;
            const body = prog.refs["body"] as import("../../src/types/node-descriptor").AdapterNode[];
            const declarator = (
                body[0].refs["declarations"] as import("../../src/types/node-descriptor").AdapterNode[]
            )[0];
            const init = declarator.refs["init"] as import("../../src/types/node-descriptor").AdapterNode;
            expect(init.nodeType).toBe("RegExpLiteral");
            expect(init.value).toBe("/foo/gi"); // flags 'g','i' sorted → 'gi'
        });

        it("same regex with flags in different order → same normalized value", () => {
            const r1 = adapter.parse("const r = /foo/gi;", cfg);
            const r2 = adapter.parse("const r = /foo/ig;", cfg);
            const getRegexValue = (root: import("../../src/types/node-descriptor").AdapterNode) => {
                const prog = root.refs["program"] as import("../../src/types/node-descriptor").AdapterNode;
                const body = prog.refs["body"] as import("../../src/types/node-descriptor").AdapterNode[];
                const declarator = (
                    body[0].refs["declarations"] as import("../../src/types/node-descriptor").AdapterNode[]
                )[0];
                return (declarator.refs["init"] as import("../../src/types/node-descriptor").AdapterNode).value;
            };
            expect(getRegexValue(r1)).toBe(getRegexValue(r2));
        });

        it("maps VariableDeclaration kind", () => {
            const root = adapter.parse("let x = 1;", cfg);
            const prog = root.refs["program"] as import("../../src/types/node-descriptor").AdapterNode;
            const body = prog.refs["body"] as import("../../src/types/node-descriptor").AdapterNode[];
            expect(body[0].kind).toBe("let");
        });

        it("throws ParseError on invalid syntax", () => {
            expect(() => adapter.parse("const = =;", cfg)).toThrow(ParseError);
        });

        it("sets pathKey on every node", () => {
            const root = adapter.parse("let x;", cfg);
            expect(root.pathKey).toBe("file");
            const prog = root.refs["program"] as import("../../src/types/node-descriptor").AdapterNode;
            expect(prog.pathKey).toBe("file.program");
        });
    });

    describe("traversePostOrder()", () => {
        it("visits children before parents (post-order)", () => {
            const source = "const x = 1;";
            const root = adapter.parse(source, cfg);
            const order: string[] = [];
            const state: TraversalState = {
                hashByPath: new Map(),
                signatureMap: new Map(),
                config: cfg,
            };
            adapter.traversePostOrder(
                root,
                (path) => {
                    order.push(path.node.nodeType);
                },
                state
            );

            // NumericLiteral (1) must appear before VariableDeclarator
            const numIdx = order.indexOf("NumericLiteral");
            const declIdx = order.indexOf("VariableDeclarator");
            expect(numIdx).toBeGreaterThanOrEqual(0);
            expect(declIdx).toBeGreaterThan(numIdx);

            // VariableDeclarator must appear before VariableDeclaration
            const varDeclIdx = order.lastIndexOf("VariableDeclaration");
            expect(varDeclIdx).toBeGreaterThan(declIdx);

            // File always last
            expect(order[order.length - 1]).toBe("File");
        });
    });

    describe("resolveByPath()", () => {
        it("resolves a child via its pathKey", () => {
            const root = adapter.parse("let x;", cfg);
            const prog = root.refs["program"] as import("../../src/types/node-descriptor").AdapterNode;
            expect(adapter.resolveByPath(root, prog.pathKey)).toBeDefined();
        });
    });
});
