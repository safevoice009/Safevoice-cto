import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageRouter,
  type UploadOptions,
  getStorageRouter,
  resetStorageRouter,
} from '../router/StorageRouter';

describe('StorageRouter', () => {
  let router: StorageRouter;

  beforeEach(() => {
    resetStorageRouter();
    router = new StorageRouter();
  });

  describe('routeUpload', () => {
    it('should prefer P2P for small files with peers', async () => {
      router.updateMetrics({
        availablePeers: 10,
        averagePeerLatency: 50,
        localStorageAvailable: 100 * 1024 * 1024,
        ipfsNetworkHealthy: true,
      });

      const options: UploadOptions = {
        fileSize: 10 * 1024 * 1024, // 10MB
        mimeType: 'image/jpeg',
        fileName: 'image.jpg',
      };

      const decision = await router.routeUpload(options);

      expect(decision.primary).toBe('p2p');
      expect(decision.estimate.speed).toBe('instant');
      expect(decision.estimate.cost).toBe('free');
      expect(decision.estimate.privacy).toBe('p2p');
    });

    it('should use IPFS for large files', async () => {
      router.updateMetrics({
        availablePeers: 0,
        localStorageAvailable: 50 * 1024 * 1024,
        ipfsNetworkHealthy: true,
      });

      const options: UploadOptions = {
        fileSize: 200 * 1024 * 1024, // 200MB
        mimeType: 'video/mp4',
        fileName: 'video.mp4',
      };

      const decision = await router.routeUpload(options);

      expect(decision.primary).toBe('ipfs');
      expect(decision.estimate.privacy).toBe('distributed');
    });

    it('should maximize redundancy for critical content', async () => {
      const options: UploadOptions = {
        fileSize: 5 * 1024 * 1024,
        mimeType: 'text/plain',
        fileName: 'important.txt',
        isCriticalContent: true,
      };

      const decision = await router.routeUpload(options);

      expect(decision.primary).toBe('local');
      expect(decision.secondary).toBe('p2p');
      expect(decision.tertiary).toBe('ipfs');
      expect(decision.metadata.redundancy).toBeGreaterThan(1);
    });

    it('should distribute popular content', async () => {
      router.updateMetrics({
        availablePeers: 15,
        ipfsNetworkHealthy: true,
      });

      const options: UploadOptions = {
        fileSize: 50 * 1024 * 1024,
        mimeType: 'video/mp4',
        fileName: 'popular.mp4',
        isPopularContent: true,
      };

      const decision = await router.routeUpload(options);

      expect(decision.primary).toBe('p2p');
      expect(decision.metadata.redundancy).toBeGreaterThanOrEqual(2);
    });

    it('should respect user preference', async () => {
      router.updateMetrics({
        availablePeers: 0,
        ipfsNetworkHealthy: true,
      });

      const options: UploadOptions = {
        fileSize: 10 * 1024 * 1024,
        mimeType: 'image/jpeg',
        fileName: 'image.jpg',
        userPreference: 'ipfs',
      };

      const decision = await router.routeUpload(options);

      expect(decision.primary).toBe('ipfs');
    });

    it('should have all required metadata in decision', async () => {
      const options: UploadOptions = {
        fileSize: 10 * 1024 * 1024,
        mimeType: 'image/jpeg',
        fileName: 'image.jpg',
      };

      const decision = await router.routeUpload(options);

      expect(decision.primary).toBeDefined();
      expect(decision.reason).toBeDefined();
      expect(decision.estimate).toBeDefined();
      expect(decision.estimate.speed).toBeDefined();
      expect(decision.estimate.cost).toBeDefined();
      expect(decision.estimate.privacy).toBeDefined();
      expect(decision.metadata).toBeDefined();
      expect(decision.metadata.estimatedUploadTime).toBeGreaterThan(0);
      expect(decision.metadata.redundancy).toBeGreaterThan(0);
    });
  });

  describe('Metrics and Health', () => {
    it('should track and report metrics', () => {
      const metrics = {
        availablePeers: 25,
        averagePeerLatency: 75,
        localStorageUsed: 500 * 1024 * 1024,
        localStorageAvailable: 1000 * 1024 * 1024,
        ipfsNetworkHealthy: true,
      };

      router.updateMetrics(metrics);

      const reported = router.getMetrics();

      expect(reported.availablePeers).toBe(25);
      expect(reported.averagePeerLatency).toBe(75);
      expect(reported.ipfsNetworkHealthy).toBe(true);
    });

    it('should calculate network health', () => {
      router.updateMetrics({
        availablePeers: 20,
        ipfsNetworkHealthy: true,
      });

      const health = router.getNetworkHealth();

      expect(health.status).toBe('healthy');
      expect(health.p2pHealth).toBeGreaterThan(0);
      expect(health.ipfsHealth).toBeGreaterThan(0);
      expect(health.estimatedAvailability).toBeGreaterThan(0);
    });

    it('should report degraded health when few peers', () => {
      router.updateMetrics({
        availablePeers: 5,
        ipfsNetworkHealthy: false,
      });

      const health = router.getNetworkHealth();

      expect(health.status).toBe('degraded');
    });

    it('should report offline when no connectivity', () => {
      router.updateMetrics({
        availablePeers: 0,
        ipfsNetworkHealthy: false,
      });

      const health = router.getNetworkHealth();

      expect(health.status).toBe('offline');
    });
  });

  describe('Capacity Planning', () => {
    it('should calculate total capacity', () => {
      router.updateMetrics({
        availablePeers: 100,
        localStorageAvailable: 100 * 1024 * 1024,
        githubQuotaTotal: 1024 * 1024 * 1024,
        githubQuotaUsed: 500 * 1024 * 1024,
      });

      const capacity = router.getTotalCapacity();

      expect(capacity.localCapacity).toBeGreaterThan(0);
      expect(capacity.p2pCapacity).toBeGreaterThan(0);
      expect(capacity.githubCapacity).toBeGreaterThan(0);
      expect(capacity.totalCapacity).toBeGreaterThan(0);
    });
  });

  describe('Cost Analysis', () => {
    it('should provide cost comparison', () => {
      const analysis = router.getCostAnalysis();

      expect(analysis.length).toBeGreaterThan(0);

      // SafeVoice should be free
      const safevoice = analysis.find((a) => a.strategy.includes('SafeVoice'));
      expect(safevoice?.yearlyCost).toBe(0);

      // Traditional solutions should have costs
      const aws = analysis.find((a) => a.strategy.includes('AWS'));
      expect(aws?.yearlyCost).toBeGreaterThan(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should reuse singleton instance', () => {
      const router1 = getStorageRouter();
      const router2 = getStorageRouter();

      expect(router1).toBe(router2);
    });

    it('should reset singleton when requested', () => {
      const router1 = getStorageRouter();
      resetStorageRouter();
      const router2 = getStorageRouter();

      expect(router1).not.toBe(router2);
    });
  });
});
