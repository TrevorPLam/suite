import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import nx from '@nx/eslint-plugin';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@nx': nx,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': 'off',
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:calendar',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:calendar'],
            },
            {
              sourceTag: 'scope:tasks',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:tasks'],
            },
            {
              sourceTag: 'scope:drive',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:drive'],
            },
          ],
        },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@suite/ui/src/**'],
              message: 'Use @suite/ui instead of deep imports from @suite/ui/src',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.nx/**',
      'coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },
];
