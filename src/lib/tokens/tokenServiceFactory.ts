/**
 * Token Service Factory
 * 
 * Creates the appropriate TokenService implementation based on configuration.
 * This allows switching between local (RewardEngine) and onchain (ERC-20) modes.
 */

import type { TokenService, TokenServiceConfig } from './TokenService';
import { LocalTokenService } from './LocalTokenService';
import { OnchainTokenService } from './OnchainTokenService';
import { RewardEngine } from './RewardEngine';

/**
 * Create a token service based on configuration
 */
export function createTokenService(config: TokenServiceConfig): TokenService {
  if (config.mode === 'local') {
    console.log('[TokenServiceFactory] Creating LocalTokenService');
    return new LocalTokenService();
  }

  if (config.mode === 'onchain') {
    if (!config.contractAddress) {
      throw new Error('Contract address is required for onchain mode');
    }
    if (!config.rpcUrl) {
      throw new Error('RPC URL is required for onchain mode');
    }
    if (!config.chainId) {
      throw new Error('Chain ID is required for onchain mode');
    }

    console.log('[TokenServiceFactory] Creating OnchainTokenService (stub mode)', {
      contract: config.contractAddress,
      chain: config.chainId,
    });

    return new OnchainTokenService({
      contractAddress: config.contractAddress,
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
    });
  }

  throw new Error(`Unknown token service mode: ${config.mode}`);
}

/**
 * Get token service configuration from environment variables
 */
export function getTokenServiceConfig(): TokenServiceConfig {
  const mode = (import.meta.env.VITE_TOKEN_MODE || 'local') as 'local' | 'onchain';

  return {
    mode,
    contractAddress: import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS,
    rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL,
    chainId: import.meta.env.VITE_CHAIN_ID ? parseInt(import.meta.env.VITE_CHAIN_ID) : 137,
  };
}

/**
 * Singleton instance
 */
let tokenServiceInstance: TokenService | null = null;

/**
 * Get the global token service instance
 */
export function getTokenService(): TokenService {
  if (!tokenServiceInstance) {
    const config = getTokenServiceConfig();
    tokenServiceInstance = createTokenService(config);
  }
  return tokenServiceInstance;
}

/**
 * Reset the token service (mainly for testing)
 */
export function resetTokenService(): void {
  tokenServiceInstance = null;
}
