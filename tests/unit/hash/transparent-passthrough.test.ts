import { cs_mast_init } from "../../../src/core/cs-mast-init";
import type { CsMastConfig } from "../../../src/types/config";
import * as fs from "fs";
import * as path from "path";

const FOR_JS = fs.readFileSync(path.join("/tmp/cs-mast-code-examples/for.js"), "utf8");
const WHILE_JS = fs.readFileSync(path.join("/tmp/cs-mast-code-examples/while.js"), "utf8");

const SINC_BREAK: CsMastConfig = {
    hash: "sha256",
    lang: "js",
    lver: "es6",
    prsr: "@babel/parser",
    scat: [],
    sinc: ["BreakStatement"],
};

describe("Transparent passthrough — structural equivalence", () => {
    it("for-loop and while-loop with only sinc BreakStatement produce identical rootHash", () => {
        // Both files contain exactly one BreakStatement. All other nodes (ForStatement,
        // WhileStatement, BlockStatement, VariableDeclaration, console calls, etc.) are
        // uncategorized and transparent. Only the BreakStatement's hash propagates up,
        // so both files collapse to the same root hash regardless of their outer structure.
        const forTree = cs_mast_init(FOR_JS, SINC_BREAK);
        const whileTree = cs_mast_init(WHILE_JS, SINC_BREAK);
        expect(forTree.rootHash).toBe(whileTree.rootHash);
    });

    it("BreakStatement is the only actively-hashed node in the for-loop file", () => {
        const tree = cs_mast_init(FOR_JS, SINC_BREAK);
        let activeCount = 0;
        function walk(node: import("../../../src/types/node-descriptor").AdapterNode) {
            if (node.isActivelyHashed) activeCount++;
            for (const child of node.children) walk(child);
        }
        walk(tree.root);
        expect(activeCount).toBe(1);
    });

    it("rootHash is non-empty when at least one configured node exists", () => {
        const tree = cs_mast_init(FOR_JS, SINC_BREAK);
        expect(tree.rootHash).toHaveLength(64);
        expect(tree.rootHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("rootHash is empty string when no configured nodes exist in file", () => {
        // No literals, identifiers, or any configured type in 'break;' with scat:[] sinc:["Identifier"]
        // Actually BreakStatement has no children so with sinc:["Identifier"] and source "break;"
        // there are no Identifiers → root hash should be empty.
        // Use a source with no Identifiers (pure break statement).
        const tree = cs_mast_init("1 + 2;", {
            ...SINC_BREAK,
            sinc: ["Identifier"], // source has no Identifiers — only literals and BinaryExpression
        });
        expect(tree.rootHash).toBe("");
    });
});
