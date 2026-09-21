/**
 * AsyncStorage is a native module, so importing anything that reaches the repository layer fails
 * under Jest. The package ships an in-memory mock for exactly this; without it, testing a hook
 * that merely imports a service is impossible.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
