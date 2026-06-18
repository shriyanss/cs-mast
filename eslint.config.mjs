import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
    {
        ignores: ["dist/**", "node_modules/**", "coverage/**", "docs/**"],
    },
    {
        files: ["src/**/*.ts", "tests/**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
            parser: tsParser,
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...tsPlugin.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-console": "warn",
        },
    },
    {
        files: ["tests/**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node,
                fail: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
];
