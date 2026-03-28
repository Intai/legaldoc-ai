import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import reactPlugin from 'eslint-plugin-react'
import globals from 'globals'

const eslintConfig = defineConfig([
  js.configs.recommended,
  globalIgnores([
    'dist/**',
    'node_modules/**',
    '**/docs/*',
    '**/shadcn/**',
    '{.venv,venv}/**',
    'htmlcov/**',
  ]), {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
    },
    rules: {
      // Enforce consistent code style
      'array-bracket-spacing': 'warn',
      'arrow-parens': ['warn', 'as-needed'],
      'arrow-spacing': 'warn',
      'block-spacing': 'warn',
      'brace-style': 'warn',
      'comma-dangle': ['warn', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'ignore',
      }],
      'comma-spacing': 'warn',
      'computed-property-spacing': 'warn',
      'eol-last': ['warn', 'always'],
      'func-call-spacing': 'warn',
      indent: ['error', 2],
      'key-spacing': 'warn',
      'keyword-spacing': 'warn',
      'linebreak-style': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-trailing-spaces': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-use-before-define': 'warn',
      'object-curly-spacing': ['warn', 'always'],
      'operator-linebreak': ['warn', 'before'],
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      semi: ['error', 'never'],
      'sort-imports': ['warn', {
        'ignoreCase': true,
        'ignoreDeclarationSort': true,
      }],
      'space-before-blocks': 'warn',
      'space-before-function-paren': ['warn', {
        anonymous: 'never',
        asyncArrow: 'always',
        named: 'never',
      }],
      'space-in-parens': 'warn',
      'space-infix-ops': 'warn',

      // React specific
      'react/jsx-filename-extension': ['warn', { extensions: ['.jsx'] }],
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'warn',
      'react/jsx-uses-vars': 'warn',

      // Import order enforcement
      'import/order': ['error', {
        groups: [
          'builtin', // Node.js built-in modules
          'external', // npm packages
          'internal', // Absolute imports
          'parent', // Relative parent imports
          'sibling', // Relative sibling imports
          'index', // Index imports
        ],
        pathGroups: [{
          pattern: 'react',
          group: 'external',
          position: 'before',
        }, {
          pattern: 'react-**',
          group: 'external',
          position: 'before',
        }, {
          pattern: '@/**',
          group: 'internal',
          position: 'before',
        }],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'never',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      }],
      'import/first': 'error',
      'import/newline-after-import': ['error', { count: 1 }],
      'import/no-duplicates': 'error',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    files: [
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.spec.mjs',
      'jest.config.js',
      'jest.setup.js',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      // Disable strict import ordering for test files to allow jest.mock() hoisting
      'import/order': 'off',
      'import/first': 'off',
      'import/newline-after-import': 'off',
    },
  },
])

export default eslintConfig
