import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
    {
        ignores: [
            "**/node_modules/**",
            "**/.next/**",
            "**/dist/**",
            "**/out/**",
            "**/.turbo/**",
            "**/gen/**",
            "**/*.config.{js,mjs,cjs,ts}",
            "**/*.cjs",
            "**/generate-icons.*",
            "**/make_nsis_assets.js",
            "apps/web/public/**",
            "apps/web/scripts/**",
            "apps/desktop/**",
            "apps/web/next-env.d.ts",
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        // Lint only the TypeScript sources; TS itself checks undefined refs, so
        // `no-undef` (which doesn't understand Node/DOM/TS globals) is disabled.
        files: ["**/*.ts", "**/*.tsx"],
        plugins: { "react-hooks": reactHooks },
        rules: {
            "no-undef": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            // `any` is discouraged but allowed where dynamic; flag rather than fail.
            "@typescript-eslint/no-explicit-any": "warn",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            // Pre-existing stylistic nits — surface as warnings, don't block.
            "no-useless-escape": "warn",
            "no-empty": "warn",
            "no-useless-catch": "warn",
        },
    },
    // Formatting is owned by Prettier — disable conflicting ESLint rules.
    prettier,
);
