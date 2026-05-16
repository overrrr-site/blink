/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  settings: {
    react: { version: 'detect' },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['react-refresh'],
  ignorePatterns: [
    'dist',
    'node_modules',
    '.eslintrc.cjs',
    '*.config.ts',
    '*.config.js',
    'scripts',
    'public',
    'vite.config.ts.timestamp-*.mjs',
  ],
  rules: {
    // React 17+ / Vite では JSX 内の React import 不要
    'react/react-in-jsx-scope': 'off',
    // TypeScript を使うので prop-types は不要
    'react/prop-types': 'off',
    // 既存コードベース方針: any は許容（段階的に解消）
    '@typescript-eslint/no-explicit-any': 'off',
    // unused vars: アンダースコア接頭辞は無視
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    'no-unused-vars': 'off',
    // Vite Fast Refresh: コンポーネントのみ export
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // 既存コードと相性が悪いもの
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'react/no-unescaped-entities': 'off',
    'react/display-name': 'off',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-useless-escape': 'warn',
    'no-case-declarations': 'off',
    'prefer-const': 'warn',
    // 既存コードに多数あり、段階的に解消する方針のため警告のまま許容
    'react-hooks/exhaustive-deps': 'warn',
    // 全角空白などはテンプレートリテラル等で意図的に使われるケースもあるため警告
    'no-irregular-whitespace': ['warn', { skipStrings: true, skipTemplates: true, skipComments: true, skipRegExps: true }],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
      env: { node: true },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'react-refresh/only-export-components': 'off',
        'react-hooks/rules-of-hooks': 'off',
      },
    },
  ],
};
