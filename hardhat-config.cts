import { config as dotenvConfig } from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

dotenvConfig();

const reportGas = process.env.REPORT_GAS === 'true' || process.env.REPORT_GAS === '1';

// Default private key for local development (DO NOT USE IN PRODUCTION)
const DEFAULT_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

const mochaConfig: any = {
  timeout: 200000,
  require: ['ts-node/register'],
  extension: ['ts', 'js'],
  spec: './contracts/test/**/*.test.ts',
};

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
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
      url: 'http://127.0.0.1:8545',
    },
    // Ethereum Mainnet
    mainnet: {
      chainId: 1,
      url: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Ethereum Layer 2 - Optimism
    optimism: {
      chainId: 10,
      url: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Ethereum Layer 2 - Arbitrum
    arbitrum: {
      chainId: 42161,
      url: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Ethereum Layer 2 - Base
    base: {
      chainId: 8453,
      url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Polygon PoS
    polygon: {
      chainId: 137,
      url: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Polygon zkEVM
    polygonZkEvm: {
      chainId: 1101,
      url: process.env.POLYGON_ZKEVM_RPC_URL || 'https://zkevm-rpc.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // BNB Smart Chain (BSC)
    bsc: {
      chainId: 56,
      url: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Avalanche C-Chain
    avalanche: {
      chainId: 43114,
      url: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
      gasPrice: 'auto',
    },
    // Testnets
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
    },
    goerli: {
      chainId: 5,
      url: process.env.GOERLI_RPC_URL || 'https://rpc.ankr.com/eth_goerli',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
    },
    mumbai: {
      chainId: 80001,
      url: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
    },
    bscTestnet: {
      chainId: 97,
      url: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [DEFAULT_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      // Ethereum
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      goerli: process.env.ETHERSCAN_API_KEY || '',
      // Polygon
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',
      // BSC
      bsc: process.env.BSCSCAN_API_KEY || '',
      bscTestnet: process.env.BSCSCAN_API_KEY || '',
      // Optimism
      optimisticEthereum: process.env.OPTIMISM_API_KEY || '',
      // Arbitrum
      arbitrumOne: process.env.ARBISCAN_API_KEY || '',
      // Avalanche
      avalanche: process.env.SNOWTRACE_API_KEY || '',
      // Base
      base: process.env.BASESCAN_API_KEY || '',
    },
  },
  gasReporter: {
    enabled: reportGas,
    currency: process.env.GAS_REPORTER_CURRENCY || 'USD',
    gasPrice: Number(process.env.GAS_REPORTER_GAS_PRICE || '20'),
    noColors: true,
    outputFile: 'gas-report.txt',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || '',
    token: 'ETH',
    gasPriceApi: process.env.GAS_PRICE_API || '',
    showTimeSpent: true,
    showMethodSig: true,
    onlyCalledMethods: true,
  },
  mocha: mochaConfig,
  paths: {
    sources: './contracts/src',
    tests: './contracts/test',
    cache: './cache',
    artifacts: './artifacts',
    deploy: './contracts/deploy',
    deployments: './deployments',
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};

export default config;
