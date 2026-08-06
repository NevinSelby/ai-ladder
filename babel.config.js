module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Lets the Drizzle migrator `import` the generated .sql files directly.
      ['inline-import', { extensions: ['.sql'] }],
      // Reanimated 4 compiles worklets through this plugin and throws during
      // module initialisation without it — before React mounts, so no error
      // boundary can catch it and the app shows a blank white screen with
      // nothing in the console. It must stay last in the list.
      'react-native-worklets/plugin',
    ],
  };
};
