import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadToIPFS, getIPFSGatewayUrl, getAllGatewayUrls, verifyIPFSContent } from '../ipfs';

// Mock IPFS HTTP client
vi.mock('ipfs-http-client', () => ({
  create: vi.fn(() => ({
    add: vi.fn(),
  })),
}));

describe('IPFS Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadToIPFS', () => {
    it('should return error when user does not opt in', async () => {
      const result = await uploadToIPFS('test content', false);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User did not opt in to IPFS storage');
      expect(result.cid).toBeUndefined();
    });

    it('should return error for empty content', async () => {
      const result = await uploadToIPFS('', true);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Content is empty');
      expect(result.cid).toBeUndefined();
    });

    it('should return error for whitespace-only content', async () => {
      const result = await uploadToIPFS('   ', true);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Content is empty');
      expect(result.cid).toBeUndefined();
    });

    it('should handle IPFS client initialization failure', async () => {
      const result = await uploadToIPFS('test content', true);
      
      // Since we can't actually connect to IPFS in tests, this should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getIPFSGatewayUrl', () => {
    it('should return gateway URL with CID', () => {
      const cid = 'QmTest123';
      const url = getIPFSGatewayUrl(cid);
      
      expect(url).toContain(cid);
      expect(url).toMatch(/^https?:\/\//);
    });

    it('should use different gateways based on index', () => {
      const cid = 'QmTest123';
      const url0 = getIPFSGatewayUrl(cid, 0);
      const url1 = getIPFSGatewayUrl(cid, 1);
      
      expect(url0).not.toBe(url1);
      expect(url0).toContain(cid);
      expect(url1).toContain(cid);
    });
  });

  describe('getAllGatewayUrls', () => {
    it('should return multiple gateway URLs', () => {
      const cid = 'QmTest123';
      const urls = getAllGatewayUrls(cid);
      
      expect(Array.isArray(urls)).toBe(true);
      expect(urls.length).toBeGreaterThan(1);
      urls.forEach((url) => {
        expect(url).toContain(cid);
        expect(url).toMatch(/^https?:\/\//);
      });
    });

    it('should return unique URLs for each gateway', () => {
      const cid = 'QmTest123';
      const urls = getAllGatewayUrls(cid);
      const uniqueUrls = new Set(urls);
      
      expect(uniqueUrls.size).toBe(urls.length);
    });
  });

  describe('verifyIPFSContent', () => {
    beforeEach(() => {
      // Mock global fetch
      global.fetch = vi.fn();
    });

    it('should return false when fetch fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      
      const result = await verifyIPFSContent('QmTest123', 'test content');
      
      expect(result).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
      });
      
      const result = await verifyIPFSContent('QmTest123', 'test content');
      
      expect(result).toBe(false);
    });

    it('should return true when content matches', async () => {
      const content = 'test content';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        text: async () => content,
      });
      
      const result = await verifyIPFSContent('QmTest123', content);
      
      expect(result).toBe(true);
    });

    it('should return false when content does not match', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        text: async () => 'different content',
      });
      
      const result = await verifyIPFSContent('QmTest123', 'test content');
      
      expect(result).toBe(false);
    });

    it('should trim content before comparison', async () => {
      const content = 'test content';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        text: async () => '  test content  ',
      });
      
      const result = await verifyIPFSContent('QmTest123', content);
      
      expect(result).toBe(true);
    });
  });
});
