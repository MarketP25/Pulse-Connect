import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.d.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react,
      jsxA11y,
    },
    rules: {
      // ✅ Core Adjustments
      "react/react-in-jsx-scope": "off", // unnecessary in Next.js
      "jsx-a11y/autocomplete-valid": "off", // disables overly strict autocomplete rule
      "no-undef": "off", // TS handles this better
      "@typescript-eslint/no-explicit-any": "warn", // allows flexibility but flags usage
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "off", // allow `@ts-ignore` for edge cases
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],

      // ✅ React & Hooks
      "react-hooks/rules-of-hooks": "error", // keep this strong to avoid broken hooks
      "react-hooks/exhaustive-deps": "warn",

      // ✅ Accessibility Adjustments
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/no-redundant-roles": "warn",
    },
  },
];