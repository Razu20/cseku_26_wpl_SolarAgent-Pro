import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['**/dist/**', '**/coverage/**', 'node_modules/**', '.next/**'],
  },
  js.configs.recommended,
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: { console: 'readonly', process: 'readonly' } } },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        Response: 'readonly',
        AbortSignal: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        performance: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        queueMicrotask: 'readonly',
        setImmediate: 'readonly',
        MessageChannel: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        DOMException: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        CustomEvent: 'readonly',
        React: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        localStorage: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
