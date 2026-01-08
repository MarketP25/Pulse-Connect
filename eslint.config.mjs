import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**"]
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.d.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json"
      },
      globals: globals.browser
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react,
      "react-hooks": reactHooks,
      jsxA11y
    },
    rules: {
      // ✅ Core Adjustments
      "react/react-in-jsx-scope": "off", // unnecessary in Next.js
      "no-undef": "off", // handled by TypeScript
      "jsx-a11y/autocomplete-valid": "off", // overly strict
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],

      // ✅ React & Hooks Discipline
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // ✅ Accessibility Enforcement
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/no-redundant-roles": "warn",
      "jsx-a11y/control-has-associated-label": "warn"
    }
  }
];
