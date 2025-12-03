import { describe, it, expect } from 'vitest';
import {
  getSupportedProtocols,
  getProtocolById,
  fetchDeFiYields,
  calculateTotalTVL,
  calculateWeightedAPY,
  depositToDeFi,
  withdrawFromDeFi,
} from '../defiAdapters';

describe('DeFi Adapters', () => {
  describe('getSupportedProtocols', () => {
    it('should return all protocols when no chainId specified', () => {
      const protocols = getSupportedProtocols();
      expect(protocols.length).toBeGreaterThan(0);
      expect(protocols[0]).toHaveProperty('id');
      expect(protocols[0]).toHaveProperty('name');
      expect(protocols[0]).toHaveProperty('type');
      expect(protocols[0]).toHaveProperty('chainId');
      expect(protocols[0]).toHaveProperty('apy');
    });

    it('should filter protocols by chainId', () => {
      const ethereumProtocols = getSupportedProtocols(1);
      expect(ethereumProtocols.every(p => p.chainId === 1)).toBe(true);

      const polygonProtocols = getSupportedProtocols(137);
      expect(polygonProtocols.every(p => p.chainId === 137)).toBe(true);
    });

    it('should return empty array for unsupported chain', () => {
      const protocols = getSupportedProtocols(999999);
      expect(protocols).toEqual([]);
    });
  });

  describe('getProtocolById', () => {
    it('should return protocol by ID', () => {
      const protocol = getProtocolById('aave-v3-ethereum');
      expect(protocol).toBeDefined();
      expect(protocol?.name).toBe('Aave V3');
      expect(protocol?.chainId).toBe(1);
    });

    it('should return undefined for non-existent protocol', () => {
      const protocol = getProtocolById('non-existent');
      expect(protocol).toBeUndefined();
    });
  });

  describe('fetchDeFiYields', () => {
    it('should return yield data for an address', async () => {
      const address = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const yields = await fetchDeFiYields(address);
      
      expect(Array.isArray(yields)).toBe(true);
      yields.forEach(y => {
        expect(y).toHaveProperty('protocolId');
        expect(y).toHaveProperty('protocolName');
        expect(y).toHaveProperty('chainId');
        expect(y).toHaveProperty('deposited');
        expect(y).toHaveProperty('earned');
        expect(y).toHaveProperty('apy');
        expect(y).toHaveProperty('lastUpdated');
      });
    });

    it('should filter yields by chainId', async () => {
      const address = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const yields = await fetchDeFiYields(address, [1]);
      
      yields.forEach(y => {
        expect(y.chainId).toBe(1);
      });
    });
  });

  describe('calculateTotalTVL', () => {
    it('should calculate total TVL across all protocols', () => {
      const tvl = calculateTotalTVL();
      expect(tvl).toBeGreaterThan(0);
    });

    it('should calculate TVL for specific chain', () => {
      const ethereumTVL = calculateTotalTVL(1);
      const polygonTVL = calculateTotalTVL(137);
      
      expect(ethereumTVL).toBeGreaterThan(0);
      expect(polygonTVL).toBeGreaterThan(0);
      expect(ethereumTVL).not.toBe(polygonTVL);
    });
  });

  describe('calculateWeightedAPY', () => {
    it('should calculate weighted average APY', () => {
      const apy = calculateWeightedAPY();
      expect(apy).toBeGreaterThan(0);
      expect(apy).toBeLessThan(100);
    });

    it('should return 0 for empty protocol list', () => {
      const apy = calculateWeightedAPY(999999); // Non-existent chain
      expect(apy).toBe(0);
    });
  });

  describe('depositToDeFi', () => {
    it('should return success for valid deposit', async () => {
      const address = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const result = await depositToDeFi('aave-v3-ethereum', 100, address);
      
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
    });

    it('should return error for invalid protocol', async () => {
      const address = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const result = await depositToDeFi('non-existent', 100, address);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Protocol not found');
    });
  });

  describe('withdrawFromDeFi', () => {
    it('should return success for valid withdrawal', async () => {
      const address = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const result = await withdrawFromDeFi('aave-v3-ethereum', 50, address);
      
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
    });

    it('should return error for invalid protocol', async () => {
      const address = '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const result = await withdrawFromDeFi('non-existent', 50, address);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Protocol not found');
    });
  });
});
