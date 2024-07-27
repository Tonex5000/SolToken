const webpack = require('webpack');
const { override, addWebpackAlias } = require('customize-cra');

module.exports = function (config, env) {
  // Apply the customize-cra overrides
  config = override(
    addWebpackAlias({
      'url': 'url-polyfill',
      'http': 'stream-http',
      'https': 'https-browserify',
      'zlib': 'browserify-zlib',
    })
  )(config, env);

  // Add the existing fallbacks
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer")
  };

  // Add the existing plugins
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  );

  return config;
};