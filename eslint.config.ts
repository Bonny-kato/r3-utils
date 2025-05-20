import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { Linter } from "eslint";
import prettierConfig from "eslint-config-prettier";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import Config = Linter.Config;

const config: Config[] = [
    js.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        plugins: {
            // @ts-ignore
            "@typescript-eslint": tsPlugin,
        },
        languageOptions: {
            parser: tsParser,
            globals: {
                console: true,
                process: true,
                window: true,
                setTimeout: true,
                localStorage: true,
                NodeJS:true,
                clearInterval:true
                // Add any other globals you need here
            },
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: {
                    jsx: true,
                },
                project: "./tsconfig.json",
            },
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
        },
    },
    {
        files: ["**/*.{jsx,tsx}"],
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react/react-in-jsx-scope": "off",
            "no-undef": "off",
        },
    },
    prettierConfig,
];

export default config;
