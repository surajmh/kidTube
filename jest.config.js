/**
 * One runner for everything: pure helpers, hooks and components.
 *
 * The suite previously compiled TypeScript to .tmp-tests and ran `node --test`, which cannot
 * render a component or run a hook. `node:assert/strict` still works inside Jest, so the existing
 * service tests carried over by dropping their `node:test` import.
 */
module.exports = {
  preset: 'jest-expo',
  // These ship untranspiled ESM and must go through Babel rather than be treated as CommonJS.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets))',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.tmp-tests/'],
};
