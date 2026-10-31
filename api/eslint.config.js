import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

// Regras recomendadas do ESLint, para código que corre no Node.js
export default defineConfig([
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
