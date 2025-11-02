import { config as dotenvConfig } from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'solidity-coverage';
import 'hardhat-gas-reporter';

dotenvConfig();

const reportGas = process.env.REPORT_GAS === 'true' || process.env.REPORT_GAS === '1';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.21',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    enabled: reportGas,
    currency: process.env.GAS_REPORTER_CURRENCY || 'USD',
    gasPrice: Number(process.env.GAS_REPORTER_GAS_PRICE || '20'),
    noColors: true,
    outputFile: 'gas-report.txt',
    ruler: [150000],
    onlyCalledMethods: true,
  },
  mocha: {
    timeout: 200000,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

export default config;
