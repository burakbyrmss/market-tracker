const expoPreset = require('jest-expo/jest-preset');

// react-native-mmkv loads nitro-core, which ships ES modules, so Jest has to transform it too.
const [nodeModules, ...otherIgnores] = expoPreset.transformIgnorePatterns;

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/test/**/*.test.{ts,tsx}'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  transformIgnorePatterns: [nodeModules.replace('(?!(', '(?!(nitro-core|'), ...otherIgnores],
};
