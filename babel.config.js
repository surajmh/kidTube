const path = require('path');

// babel-preset-expo is nested under expo/ rather than hoisted, so a bare name does not resolve
// from the project root.
const babelPresetExpo = require.resolve('babel-preset-expo', {
  paths: [path.dirname(require.resolve('expo/package.json'))],
});

module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: [
      // reanimated: false because nativewind/babel (react-native-css-interop) adds the Reanimated
      // plugin unconditionally; letting the Expo preset add it too is a duplicate-plugin error.
      [babelPresetExpo, { jsxImportSource: 'nativewind', reanimated: false }],
      'nativewind/babel',
    ],
  };
};
