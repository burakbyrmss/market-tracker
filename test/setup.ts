// Nitro loads its native module on import. Jest has no native side, and react-native-mmkv
// already swaps in its in-memory mock under Jest, so Nitro only needs to import cleanly.
jest.mock('react-native-nitro-modules', () => ({ NitroModules: {} }));
