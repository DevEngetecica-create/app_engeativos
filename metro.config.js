// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Preferir entradas compatíveis com React Native/browser
config.resolver.resolverMainFields = ["react-native", "browser", "module", "main"];

// (Opcional, mas ajuda em alguns casos de "exports" condicionais)
config.resolver.unstable_conditionNames = ["react-native", "browser", "default"];

// Evita quebra caso alguma dependência tente "crypto"
config.resolver.extraNodeModules = {
  crypto: require.resolve("expo-crypto"),
};

module.exports = config;
