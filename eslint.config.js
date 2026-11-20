// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

// Layer rules from docs/architecture/overview.md. Each entry lists the layers a folder must not import.
const layerBans = {
  'src/domain': [
    '@/app',
    '@/features',
    '@/services',
    '@/providers',
    '@/shared',
    'react',
    'react-native',
    'expo*',
  ],
  'src/providers': ['@/app', '@/features', '@/services'],
  'src/services': ['@/app', '@/features'],
  'src/features': ['@/app', '@/providers'],
  'src/shared': ['@/app', '@/features', '@/services', '@/providers'],
};

const layerConfigs = Object.entries(layerBans).map(([folder, banned]) => ({
  files: [`${folder}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: banned.map((group) => ({
          group: [group, `${group}/**`],
          message: `${folder} must not import ${group}. See docs/architecture/overview.md.`,
        })),
      },
    ],
  },
}));

const noStyleSheet = {
  selector:
    "ImportDeclaration[source.value='react-native'] ImportSpecifier[imported.name='StyleSheet']",
  message: 'Style with NativeWind className. See docs/decisions/0014-nativewind-styling.md.',
};

const noBigJs = {
  selector: "ImportDeclaration[source.value='big.js']",
  message:
    'Use src/domain/money.ts for money arithmetic. See docs/decisions/0006-decimal-money-module.md.',
};

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'coverage/*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-console': 'error',
      'no-restricted-syntax': ['error', noStyleSheet, noBigJs],
    },
  },
  ...layerConfigs,
  {
    files: ['src/domain/money.ts'],
    rules: { 'no-restricted-syntax': ['error', noStyleSheet] },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
]);
