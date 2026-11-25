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

// Text a user sees or hears must come from t(), so it exists in both languages. Catches letters
// written straight into JSX: as text, as a {'literal'}, and in props a screen reader reads out.
const untranslated =
  'Put user-facing text in the locale files and show it with t(). See AGENTS.md.';
const spokenProps =
  '/^(accessibilityLabel|accessibilityHint|accessibilityValue|aria-label|placeholder|title|label|text|note)$/';
const hasLetters = '/[A-Za-z]/';
const noUntranslatedText = [
  `JSXText[value=${hasLetters}]`,
  `JSXElement > JSXExpressionContainer > Literal[value=${hasLetters}]`,
  `JSXElement > JSXExpressionContainer > ConditionalExpression > Literal[value=${hasLetters}]`,
  `JSXElement > JSXExpressionContainer > TemplateLiteral > TemplateElement[value.raw=${hasLetters}]`,
  `JSXAttribute[name.name=${spokenProps}] > Literal[value=${hasLetters}]`,
  `JSXAttribute[name.name=${spokenProps}] > JSXExpressionContainer > Literal[value=${hasLetters}]`,
  `JSXAttribute[name.name=${spokenProps}] > JSXExpressionContainer > TemplateLiteral > TemplateElement[value.raw=${hasLetters}]`,
].map((selector) => ({ selector, message: untranslated }));

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
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', noStyleSheet, noBigJs, ...noUntranslatedText],
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
