export default [{
  ignores: ["node_modules/**"],
}, {
  files: ["**/*.js"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      document: "readonly", console: "readonly", HTMLCanvasElement: "readonly",
      ResizeObserver: "readonly", requestAnimationFrame: "readonly",
      cancelAnimationFrame: "readonly",
    },
  },
  rules: {
    "no-unused-vars": "error",
    "no-undef": "error",
    "no-constant-condition": "error",
    "eqeqeq": "error",
    "no-var": "error",
    "prefer-const": "error",
  },
}];
