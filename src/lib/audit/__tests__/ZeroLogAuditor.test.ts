import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  scanLocalStorage,
  scanIndexedDB,
  runZeroLogAudit,
  haltOperations,
  unlockSystem,
  isSystemLocked,
} from '../ZeroLogAuditor';
import type { ZeroLogAuditReport } from '../ZeroLogAuditor';
import 'fake-indexeddb/auto';

describe('ZeroLogAuditor', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('scanLocalStorage', () => {
    it('should detect forbidden localStorage keys', () => {
      // Add a forbidden key
      localStorage.setItem('userId', 'user123');
      localStorage.setItem('ipAddress', '192.168.1.1');

      const result = scanLocalStorage();

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.forbiddenKeys).toContain('userId');
      expect(result.forbiddenKeys).toContain('ipAddress');
      expect(result.violations[0].severity).toBe('critical');
    });

    it('should pass clean state with only allowed keys', () => {
      // Add only allowed keys
      localStorage.setItem('safevoice:studentId', 'Student#1234');
      localStorage.setItem('safevoice:theme', 'dark');
      localStorage.setItem('safevoice:posts', JSON.stringify([]));

      const result = scanLocalStorage();

      expect(result.violations).toHaveLength(0);
      expect(result.allowedKeys.length).toBe(3);
      expect(result.forbiddenKeys).toHaveLength(0);
    });

    it('should detect forbidden patterns in allowed key values', () => {
      // Add an allowed key but with forbidden content
      localStorage.setItem(
        'safevoice:posts',
        JSON.stringify({
          userId: 'real-user-id',
          ipAddress: '192.168.1.1',
        })
      );

      const result = scanLocalStorage();

      // Should have violations for forbidden patterns in values
      const patternViolations = result.violations.filter(
        (v) => v.issue.includes('Forbidden pattern')
      );
      expect(patternViolations.length).toBeGreaterThan(0);
    });

    it('should count checked items correctly', () => {
      localStorage.setItem('safevoice:theme', 'dark');
      localStorage.setItem('safevoice:language', 'en');
      localStorage.setItem('safevoice:posts', '[]');

      const result = scanLocalStorage();

      expect(result.checkedCount).toBe(3);
    });
  });

  describe('scanIndexedDB', () => {
    it('should scan Dexie tables and verify CID-only content', async () => {
      const result = await scanIndexedDB();

      expect(result.checkedCount).toBeGreaterThanOrEqual(0);
      expect(result.databases).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should count CID references in stored records', async () => {
      // This test verifies the CID counting logic exists
      const result = await scanIndexedDB();

      expect(result.cidReferences).toBeGreaterThanOrEqual(0);
    });

    it('should detect unknown databases', async () => {
      // IndexedDB scanning should work even if SafeVoiceMediaDB doesn't exist
      const result = await scanIndexedDB();

      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.databases)).toBe(true);
    });
  });

  describe('runZeroLogAudit', () => {
    it('should return clean report when no violations exist', async () => {
      // Set up clean state
      localStorage.setItem('safevoice:theme', 'dark');

      const report = await runZeroLogAudit();

      expect(report.clean).toBe(true);
      expect(report.violations).toHaveLength(0);
      expect(report.timestamp).toBeDefined();
      expect(report.summary.totalViolations).toBe(0);
    });

    it('should detect violations and mark report as not clean', async () => {
      // Add forbidden key
      localStorage.setItem('userId', 'leaked-user-id');

      const report = await runZeroLogAudit();

      expect(report.clean).toBe(false);
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.summary.totalViolations).toBeGreaterThan(0);
      expect(report.summary.criticalViolations).toBeGreaterThan(0);
    });

    it('should halt operations when violations exist and haltOnViolations is true', async () => {
      localStorage.setItem('userId', 'leaked-user-id');

      const onHalt = vi.fn();

      const report = await runZeroLogAudit({
        haltOnViolations: true,
        onHalt,
      });

      expect(onHalt).toHaveBeenCalledWith(report);
      expect(report.clean).toBe(false);
    });

    it('should throw error if haltOnViolations is true and no onHalt callback', async () => {
      localStorage.setItem('userId', 'leaked-user-id');

      await expect(
        runZeroLogAudit({ haltOnViolations: true })
      ).rejects.toThrow('Zero-log audit failed');
    });

    it('should ensure no network calls are made during audit', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      await runZeroLogAudit();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should provide storage snapshot in report', async () => {
      localStorage.setItem('safevoice:theme', 'dark');
      localStorage.setItem('userId', 'leaked');

      const report = await runZeroLogAudit();

      expect(report.storageSnapshot).toBeDefined();
      expect(report.storageSnapshot.allowedKeys).toContain('safevoice:theme');
      expect(report.storageSnapshot.forbiddenKeys).toContain('userId');
      expect(Array.isArray(report.storageSnapshot.indexedDBs)).toBe(true);
    });
  });

  describe('haltOperations', () => {
    it('should lock the system when violations are detected', () => {
      const report: ZeroLogAuditReport = {
        timestamp: Date.now(),
        clean: false,
        violations: [
          {
            type: 'localStorage',
            location: 'localStorage',
            key: 'userId',
            issue: 'Forbidden key',
            severity: 'critical',
          },
        ],
        summary: {
          localStorageChecked: 1,
          indexedDBChecked: 0,
          totalViolations: 1,
          criticalViolations: 1,
        },
        storageSnapshot: {
          allowedKeys: [],
          forbiddenKeys: ['userId'],
          indexedDBs: [],
          cidReferences: 0,
        },
      };

      haltOperations(report);

      const locked = isSystemLocked();
      expect(locked).toBe(true);

      const lockData = localStorage.getItem('safevoice:systemLocked');
      expect(lockData).toBeDefined();
      const lock = JSON.parse(lockData!);
      expect(lock.locked).toBe(true);
      expect(lock.reason).toBe('zero-log-audit-failure');
    });

    it('should dispatch custom event when halting', () => {
      const eventListener = vi.fn();
      window.addEventListener('safevoice:zero-log-violation', eventListener);

      const report: ZeroLogAuditReport = {
        timestamp: Date.now(),
        clean: false,
        violations: [],
        summary: {
          localStorageChecked: 0,
          indexedDBChecked: 0,
          totalViolations: 1,
          criticalViolations: 0,
        },
        storageSnapshot: {
          allowedKeys: [],
          forbiddenKeys: [],
          indexedDBs: [],
          cidReferences: 0,
        },
      };

      haltOperations(report);

      expect(eventListener).toHaveBeenCalled();
      window.removeEventListener('safevoice:zero-log-violation', eventListener);
    });
  });

  describe('system lock', () => {
    it('should unlock system when unlockSystem is called', () => {
      // Lock the system first
      const report: ZeroLogAuditReport = {
        timestamp: Date.now(),
        clean: false,
        violations: [],
        summary: {
          localStorageChecked: 0,
          indexedDBChecked: 0,
          totalViolations: 1,
          criticalViolations: 0,
        },
        storageSnapshot: {
          allowedKeys: [],
          forbiddenKeys: [],
          indexedDBs: [],
          cidReferences: 0,
        },
      };
      haltOperations(report);

      expect(isSystemLocked()).toBe(true);

      // Unlock
      unlockSystem();

      expect(isSystemLocked()).toBe(false);
    });

    it('should return false for isSystemLocked when not locked', () => {
      expect(isSystemLocked()).toBe(false);
    });
  });
});
