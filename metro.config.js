const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle emits migrations as .sql; babel-plugin-inline-import turns them into
// strings, but Metro has to be willing to resolve the extension first.
config.resolver.sourceExts.push('sql');

// Web runs SQLite through sql.js instead of expo-sqlite (see src/db/client.web.tsx),
// so the bundler needs no wasm handling and the page needs no cross-origin
// isolation headers: the wasm is fetched at runtime from the public directory.

module.exports = config;
