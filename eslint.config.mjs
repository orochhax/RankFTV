// Fast lint tier. Type-aware rules live in eslint.typed.config.mjs.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import quality from "./eslint-rules/index.cjs";

export default defineConfig([
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...nextVitals,
  ...nextTs,
  {
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "import-x/no-unresolved": "error",
      // Baseline: 2 violações existentes na instalação inicial.
      "import-x/no-duplicates": "warn",
      "import-x/no-restricted-paths": [
        // Baseline: 89 imports atravessam as camadas atuais.
        "warn",
        {
          zones: [
            {
              target: "./lib/**/*",
              from: ["./app/**/*", "./components/**/*"],
            },
            {
              target: "./components/**/*",
              from: "./app/**/*",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    plugins: { quality },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Baselines das regras auxiliares introduzidas pelo template.
      "@typescript-eslint/no-dynamic-delete": "warn", // 2
      "@typescript-eslint/no-non-null-assertion": "warn", // 165
      "no-control-regex": "warn", // 2
      "no-regex-spaces": "warn", // 1
      "no-unsafe-finally": "warn", // 1
      "no-useless-escape": "warn", // 42
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-statements": ["warn", 20],
      "max-params": ["warn", 4],
      "max-lines-per-function": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      "max-nested-callbacks": ["warn", 3],
      // Baseline: 70 arquivos (65 de produção e 5 de teste).
      "quality/max-lines": ["warn", { max: 350 }],
      "quality/no-direct-console": [
        // Baseline: 19 chamadas diretas fora das exceções autorizadas.
        "warn",
        { logger: "reportOperationalEvent() from @/lib/observability" },
      ],
      "quality/no-direct-data-access": [
        // Baseline: 219 imports diretos da camada de dados na apresentação.
        "warn",
        {
          modules: [
            "@/lib/supabase/client",
            "@/lib/supabase/server",
            "@/lib/supabase/admin",
          ],
          bindings: ["createClient", "createAdminClient"],
          layers: ["/app/", "/components/"],
          extensions: [".tsx"],
        },
      ],
    },
  },
  {
    // The adapter and React error boundaries must work before delivery exists.
    files: ["lib/observability.ts", "app/error.tsx", "app/global-error.tsx"],
    rules: {
      "quality/no-direct-console": "off",
    },
  },
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/{__tests__,__mocks__,fixtures,mocks}/**/*.{ts,tsx}",
    ],
    plugins: { quality },
    rules: {
      "quality/max-lines": ["warn", { max: 350, includeTests: true }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "max-statements": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "import-x/no-restricted-paths": "off",
    },
  },
  {
    files: ["eslint-rules/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly", require: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".claude/**",
    ".github/agents/**",
    ".github/hooks/**",
    ".github/skills/**",
    ".next/**",
    ".rankftv/**",
    ".vscode/**",
    "arena-carousel/**",
    "node_modules/**",
    "out/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "**/*.tsbuildinfo",
    "package-lock.json",
    "next-env.d.ts",
  ]),
]);
