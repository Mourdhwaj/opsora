module.exports = function (api) {
  api.cache(true);
  const plugins = ['react-native-reanimated/plugin'];
  try {
    const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');
    plugins.push(expoRouterBabelPlugin);
  } catch {}
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
