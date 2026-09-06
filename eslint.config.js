// eslint.config.js
// OpusHunter — Flat ESLint Config (ESLint v9+)
// Rewritten from scratch. Previous version imported from non-existent packages:
//   - "@eslint/latest" (does not exist)
//   - "cluster" (Node.js built-in, wrong context)
//   - "os" (Node.js built-in, wrong context)
//   - "zustand" (does not export anything ESLint-related)

import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── Scope ──────────────────────────────────────────────────────────────────
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "android/**",
      "ios/**",
      "supabase/functions/**", // Deno runtime — linted separately
    ],
  },

  // ── Base JS ────────────────────────────────────────────────────────────────
  pluginJs.configs.recommended,

  // ── TypeScript ─────────────────────────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ── React ──────────────────────────────────────────────────────────────────
  {
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,

      // React 19 — JSX transform, no need to import React in scope
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off", // TypeScript handles this

      // Hooks discipline
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // React Compiler diagnostics are not a correctness contract for this
      // React Native codebase. Existing gesture refs, animated values, and
      // state hydration are intentional patterns here.
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/component-hook-factories": "off",
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // ── Environment ────────────────────────────────────────────────────────────
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // ── TypeScript overrides ───────────────────────────────────────────────────
  {
    rules: {
      // Allow explicit `any` in edge cases (RN bridge, Supabase generics)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow empty functions in store/hook skeletons during development
      "@typescript-eslint/no-empty-function": "warn",
      // Allow unused vars prefixed with _ (standard ignore convention)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // ts-ignore must have a description
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        { "ts-ignore": "allow-with-description" },
      ],
    },
  },
];
