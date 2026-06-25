module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.BABEL_ENV === 'production' || process.env.NODE_ENV === 'production';

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src', // 👈 Aqui o @ aponta para a pasta src
        },
      },
    ],
    'react-native-reanimated/plugin',
    ['react-native-worklets-core/plugin'],
  ];

  if (isProduction) {
    // Remove console.log/info/debug em produção; preserva console.error e console.warn
    plugins.push([
      'transform-remove-console',
      { exclude: ['error', 'warn'] },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
