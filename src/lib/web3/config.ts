/**
 * Web3 Configuration
 * 
 * Environment-driven configuration for web3 bridge
 */

import { mainnet, polygon, bsc, arbitrum, optimism, base, localhost } from 'viem/chains';
import type { Address } from 'viem';
import type { ChainConfig, ContractAddresses, RPCConfig, Web3Config } from './types';

/**
 * Get RPC URLs from environment variables
 */
export function getRPCConfig(): RPCConfig {
  return {
    mainnet: import.meta.env.VITE_RPC_MAINNET,
    polygon: import.meta.env.VITE_RPC_POLYGON,
    bsc: import.meta.env.VITE_RPC_BSC,
    arbitrum: import.meta.env.VITE_RPC_ARBITRUM,
    optimism: import.meta.env.VITE_RPC_OPTIMISM,
    base: import.meta.env.VITE_RPC_BASE,
    localhost: import.meta.env.VITE_RPC_LOCALHOST || 'http://127.0.0.1:8545',
  };
}

/**
 * Get contract addresses from environment variables
 */
export function getContractAddresses(chainId: number): ContractAddresses {
  const prefix = getChainPrefix(chainId);
  
  return {
    voiceToken: (import.meta.env[`VITE_${prefix}_VOICE_TOKEN`] as Address) || ('0x0000000000000000000000000000000000000000' as Address),
    voiceVesting: import.meta.env[`VITE_${prefix}_VOICE_VESTING`] as Address | undefined,
    voiceStaking: import.meta.env[`VITE_${prefix}_VOICE_STAKING`] as Address | undefined,
    voiceAchievementNFT: import.meta.env[`VITE_${prefix}_VOICE_ACHIEVEMENT_NFT`] as Address | undefined,
    voiceGovernor: import.meta.env[`VITE_${prefix}_VOICE_GOVERNOR`] as Address | undefined,
  };
}

/**
 * Get chain prefix for environment variables
 */
function getChainPrefix(chainId: number): string {
  switch (chainId) {
    case mainnet.id:
      return 'MAINNET';
    case polygon.id:
      return 'POLYGON';
    case bsc.id:
      return 'BSC';
    case arbitrum.id:
      return 'ARBITRUM';
    case optimism.id:
      return 'OPTIMISM';
    case base.id:
      return 'BASE';
    case localhost.id:
      return 'LOCALHOST';
    default:
      return 'LOCALHOST';
  }
}

/**
 * Get chain configuration
 */
export function getChainConfig(chainId: number): ChainConfig {
  const rpcConfig = getRPCConfig();
  const contracts = getContractAddresses(chainId);
  
  switch (chainId) {
    case mainnet.id:
      return {
        chainId: mainnet.id,
        name: mainnet.name,
        rpcUrl: rpcConfig.mainnet || mainnet.rpcUrls.default.http[0],
        blockExplorer: mainnet.blockExplorers?.default.url,
        contracts,
      };
    
    case polygon.id:
      return {
        chainId: polygon.id,
        name: polygon.name,
        rpcUrl: rpcConfig.polygon || polygon.rpcUrls.default.http[0],
        blockExplorer: polygon.blockExplorers?.default.url,
        contracts,
      };
    
    case bsc.id:
      return {
        chainId: bsc.id,
        name: bsc.name,
        rpcUrl: rpcConfig.bsc || bsc.rpcUrls.default.http[0],
        blockExplorer: bsc.blockExplorers?.default.url,
        contracts,
      };
    
    case arbitrum.id:
      return {
        chainId: arbitrum.id,
        name: arbitrum.name,
        rpcUrl: rpcConfig.arbitrum || arbitrum.rpcUrls.default.http[0],
        blockExplorer: arbitrum.blockExplorers?.default.url,
        contracts,
      };
    
    case optimism.id:
      return {
        chainId: optimism.id,
        name: optimism.name,
        rpcUrl: rpcConfig.optimism || optimism.rpcUrls.default.http[0],
        blockExplorer: optimism.blockExplorers?.default.url,
        contracts,
      };
    
    case base.id:
      return {
        chainId: base.id,
        name: base.name,
        rpcUrl: rpcConfig.base || base.rpcUrls.default.http[0],
        blockExplorer: base.blockExplorers?.default.url,
        contracts,
      };
    
    case localhost.id:
    default:
      return {
        chainId: localhost.id,
        name: localhost.name,
        rpcUrl: rpcConfig.localhost || 'http://127.0.0.1:8545',
        blockExplorer: undefined,
        contracts,
      };
  }
}

/**
 * Create web3 config from environment
 */
export function createWeb3Config(chainId?: number): Web3Config {
  const enabled = import.meta.env.VITE_WEB3_ENABLED === 'true';
  const defaultChainId = chainId || parseInt(import.meta.env.VITE_CHAIN_ID || '31337', 10);
  const chainConfig = getChainConfig(defaultChainId);
  
  return {
    enabled,
    chainId: defaultChainId,
    rpcUrl: chainConfig.rpcUrl,
    contracts: chainConfig.contracts,
    pollingInterval: parseInt(import.meta.env.VITE_POLLING_INTERVAL || '5000', 10),
  };
}

/**
 * Check if web3 is enabled
 */
export function isWeb3Enabled(): boolean {
  return import.meta.env.VITE_WEB3_ENABLED === 'true';
}

/**
 * Get default chain ID
 */
export function getDefaultChainId(): number {
  return parseInt(import.meta.env.VITE_CHAIN_ID || '31337', 10);
}
