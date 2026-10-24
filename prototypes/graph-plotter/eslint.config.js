import js from '@eslint/js';

export default [
  { ignores: ['dist/**', 'artifacts/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: { eqeqeq: 'error', 'no-var': 'error', 'prefer-const': 'error' },
  },
  {
    files: ['demo/**/*.js', 'examples/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly', window: 'readonly', ResizeObserver: 'readonly',
        requestAnimationFrame: 'readonly', fetch: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
];
