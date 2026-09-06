import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import { defineConfig } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import esX from 'eslint-plugin-es-x';
import { flatConfigs as importConfigs } from 'eslint-plugin-import-x';
import json from 'eslint-plugin-json';
import { flat as mdx } from 'eslint-plugin-mdx';
import preferArrowFunctions from 'eslint-plugin-prefer-arrow-functions';
import prettier from 'eslint-plugin-prettier/recommended';
import { configs as tomlConfigs } from 'eslint-plugin-toml';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import { configs as ymlConfigs } from 'eslint-plugin-yml';
import * as espree from 'espree';
import globals from 'globals';

const projects = ['./tsconfig.json', './tsconfig.spec.json', './tests-e2e/tsconfig.json'];

export default defineConfig([
  {
    ignores: [
      '**/.*',
      '!.releaserc.yml',
      'CHANGELOG.md',
      'CODEOWNERS',
      'LICENSE',
      'renovate.json',
      'dist/**',
      '**/node_modules/**',
      'test-reports/**',
      'tmp/**',
      '**/*.sh',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    extends: [
      js.configs.recommended,
      tsPlugin.configs['flat/recommended'],
      unicorn.configs['flat/recommended'],
      importConfigs.recommended,
      importConfigs.typescript,
      prettier,
    ],
    plugins: {
      'es-x': esX,
      'prefer-arrow-functions': preferArrowFunctions,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      globals: globals.es2024,
      parserOptions: {
        project: projects,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          noWarnOnMultipleProjects: true,
          project: projects,
        }),
      ],
      'es-x': { aggressive: true },
    },
    rules: {
      'arrow-parens': 'off',
      'arrow-body-style': 'off',
      'spaced-comment': ['error', 'always'],
      complexity: ['error', 150],
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
        },
      ],
      'max-lines': ['error', 500],
      'max-lines-per-function': ['error', 500],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'unicorn/expiring-todo-comments': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-method-this-argument': 'off',
      'unicorn/no-for-loop': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-this-assignment': 'off',
      'unicorn/no-typeof-undefined': 'off',
      'unicorn/no-unnecessary-polyfills': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/prefer-array-flat': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/prefer-dom-node-append': 'off',
      'unicorn/prefer-event-target': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/prefer-includes': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-set-has': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-switch': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prefer-type-error': 'off',
      'unicorn/name-replacements': 'off',
      'es-x/no-array-from': 'error',
      'es-x/no-array-isarray': 'off',
      'es-x/no-array-of': 'error',
      'es-x/no-array-prototype-copywithin': 'error',
      'es-x/no-array-prototype-entries': 'error',
      'es-x/no-array-prototype-every': 'error',
      'es-x/no-array-prototype-fill': 'off',
      'es-x/no-array-prototype-filter': 'off',
      'es-x/no-array-prototype-find': 'error',
      'es-x/no-array-prototype-findindex': 'error',
      'es-x/no-array-prototype-flat': 'error',
      'es-x/no-array-prototype-foreach': 'error',
      'es-x/no-array-prototype-includes': 'error',
      'es-x/no-array-prototype-indexof': 'off',
      'es-x/no-array-prototype-keys': 'error',
      'es-x/no-array-prototype-lastindexof': 'error',
      'es-x/no-array-prototype-map': 'off',
      'es-x/no-array-prototype-reduce': 'error',
      'es-x/no-array-prototype-reduceright': 'error',
      'es-x/no-array-prototype-some': 'off',
      'es-x/no-array-prototype-values': 'error',
      'es-x/no-array-prototype-at': 'error',
      'es-x/no-string-prototype-at': 'error',
      'no-alert': 'error',
      'no-console': [
        'error',
        {
          allow: ['error', 'warn'],
        },
      ],
      'no-debugger': 'error',
      'no-inner-declarations': ['error', 'functions', { blockScopedFunctions: 'disallow' }],
      'no-restricted-globals': ['error', 'fit', 'fdescribe', 'xit', 'xdescribe'],
      semi: ['error', 'always'],
      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true,
        },
      ],
      'import-x/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          groups: ['builtin', 'external', 'internal', 'index', 'parent', 'sibling'],
        },
      ],
      'unused-imports/no-unused-imports': 'error',
      'prefer-arrow-functions/prefer-arrow-functions': [
        'error',
        {
          allowNamedFunctions: true,
        },
      ],
    },
  },
  {
    files: ['libs/@cf-workers/turnstile-injection/src/frontend/index.ts'],
    rules: {
      // The injected script must support browsers without startsWith/endsWith.
      'unicorn/prefer-string-starts-ends-with': 'off',
      // The fetch wrapper and Turnstile onload callback intentionally modify window.
      'unicorn/no-global-object-property-assignment': 'off',
      // The XMLHttpRequest and fetch wrappers must preserve the caller's receiver.
      'unicorn/no-this-outside-of-class': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/prefer-logical-operator-over-ternary': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      parser: espree,
      ecmaVersion: 'latest',
      globals: globals.node,
    },
  },
  {
    files: ['**/*.json'],
    extends: [json.configs.recommended, prettier],
  },
  {
    files: ['**/tsconfig.json', '**/tsconfig.*.json'],
    extends: [json.configs['recommended-with-comments']],
  },
  {
    files: ['**/*.md'],
    extends: [mdx, prettier],
  },
  {
    files: ['**/*.{yaml,yml}'],
    extends: [ymlConfigs['flat/prettier'], prettier],
  },
  {
    files: ['**/*.toml'],
    extends: [tomlConfigs['flat/standard']],
  },
]);
