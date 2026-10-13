import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

export default [
    { ignores: ["node_modules/", "_site/"] },

    js.configs.recommended,
    stylistic.configs.customize({
        indent: 4,
        quotes: "double",
        semi: true,
        arrowParens: true,
        braceStyle: "1tbs",
    }),

    {
        files: ["src/**/*.js", "demo/**/*.js"],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ["test/**/*.js", "eslint.config.js"],
        languageOptions: { globals: globals.node },
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
];
