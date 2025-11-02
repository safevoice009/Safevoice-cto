process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || 'tsconfig.hardhat.json';
require('ts-node/register');

module.exports = require('./hardhat-config.cts').default;
