const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("wasm");

// Polyfill de punycode para compatibilidad nativa (Android / iOS) con markdown-it
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: require.resolve("punycode/"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
