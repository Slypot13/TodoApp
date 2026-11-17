import js from '@eslint/js';

export default [
  { ignores: ['dist/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setInterval: 'readonly',
        process: 'readonly',
      },
    },
  },
];
