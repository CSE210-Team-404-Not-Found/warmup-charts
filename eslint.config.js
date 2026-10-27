import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

export default [
    // MERGETODO: Remove once prototypes/ is resolved
    { ignores: ["node_modules/", "_site/", "prototypes/"] },

    js.configs.recommended,
    stylistic.configs.customize({
        indent: 4,
        quotes: "double",
        semi: true,
        arrowParens: true,
        braceStyle: "1tbs",
    }),

    {
        files: ["src/**/*.js", "demo/**/*.js", "benchmark/**/*.js"],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ["test/**/*.js", "eslint.config.js"],
        languageOptions: { globals: globals.node },
    },
    // E2E tests run in Node but pass some functions to the page.
    {
        files: ["e2e/**/*.js", "playwright.config.js"],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },

    {
        rules: {
            "eqeqeq": "error",
            "no-var": "error",
            "prefer-const": "error",
            "@stylistic/nonblock-statement-body-position": ["error", "below"],
            "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: false }],
            "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
            "@stylistic/max-len": ["error", { code: 100, ignoreUrls: true, ignoreComments: false }],
        },
    },
    // Code-smell rules from ESLint itself, chosen in docs/code-analysis.md. The
    // size limits sit just above today's largest functions; lower each one when
    // the function behind it is split.
    {
        rules: {
            "complexity": ["error", 25],
            "max-statements": ["error", 45],
            "max-lines-per-function": [
                "error", { max: 75, skipBlankLines: true, skipComments: true },
            ],
            "max-depth": ["error", 5],
            "max-params": ["error", 6],
            "max-nested-callbacks": ["error", 3],

            "no-nested-ternary": "error",
            "no-else-return": "error",
            "no-lonely-if": "error",
            "no-unneeded-ternary": "error",
            "no-useless-return": "error",
            "no-useless-concat": "error",
            "no-negated-condition": "error",
            "no-implicit-coercion": "error",
            "prefer-object-spread": "error",
            "object-shorthand": "error",
            "yoda": "error",
            "no-multi-assign": "error",

            "consistent-return": "error",
            "default-case": "error",
            "no-return-assign": "error",
            "no-sequences": "error",
            "no-throw-literal": "error",
            "no-self-compare": "error",
            "no-template-curly-in-string": "error",
            "no-unreachable-loop": "error",
            "no-unused-expressions": "error",
            "require-await": "error",
            "prefer-promise-reject-errors": "error",
            "no-constructor-return": "error",
            "no-duplicate-imports": "error",
            "no-use-before-define": ["error", { functions: false }],
            "radix": "error",
            "guard-for-in": "error",
            "no-empty-function": "error",
            "no-new-wrappers": "error",
            "no-array-constructor": "error",

            "no-eval": "error",
            "no-implied-eval": "error",
            "no-new-func": "error",
            "no-script-url": "error",
            "no-extend-native": "error",
            "no-proto": "error",
            "no-iterator": "error",
            "no-caller": "error",
            "no-alert": "error",
            "no-labels": "error",
        },
    },
];
