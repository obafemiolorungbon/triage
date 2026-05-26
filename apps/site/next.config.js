//@ts-check

const path = require('path');
const { composePlugins, withNx } = require('@nx/next');

const nextConfig = {
  nx: {},
  output: 'standalone',
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

module.exports = composePlugins(withNx)(nextConfig);
