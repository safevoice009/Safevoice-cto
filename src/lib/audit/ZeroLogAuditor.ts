import Dexie from 'dexie';
import { ALLOWED_STORAGE_KEYS } from '../privacy/middleware';

export interface ZeroLogViolation {
  type: 'localStorage' | 'indexedDB';
  location: string;
  key?: string;
  table?: string;
  recordId?: string | number;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
}

export interface ZeroLogAuditReport {
  timestamp: number;
  clean: boolean;
  violations: ZeroLogViolation[];
  summary: {
    localStorageChecked: number;
    indexedDBChecked: number;
    totalViolations: number;
    criticalViolations: number;
  };
  storageSnapshot: {
    allowedKeys: string[];
    forbiddenKeys: string[];
    indexedDBs: string[];
    cidReferences: number;
  };
}

export interface ZeroLogAuditOptions {
  haltOnViolations?: boolean;
  onHalt?: (report: ZeroLogAuditReport) => void;
}

const FORBIDDEN_PATTERNS = [
  /userId/i,
  /user_id/i,
  /user-id/i,
  /activityTimestamp/i,
  /activity_timestamp/i,
  /lastSeen/i,
  /last_seen/i,
  /ipAddress/i,
  /ip_address/i,
  /^ip$/i,
  /phoneNumber/i,
  /phone_number/i,
  /emailAddress/i,
  /email_address/i,
  /realName/i,
  /real_name/i,
  /fullName/i,
  /full_name/i,
  /location/i,
  /geoLocation/i,
  /latitude/i,
  /longitude/i,
  /messageContent(?!.*cid)/i, // Allow if it contains 'cid'
  /messageMetadata/i,
  /conversationHistory/i,
  /chatHistory/i,
  /trackingId/i,
  /tracking_id/i,
  /sessionId(?!.*anonymous)/i, // Allow if it's anonymous
  /session_id(?!.*anonymous)/i,
  /deviceFingerprint/i,
  /browser_fingerprint/i,
];

const ALLOWED_METADATA_FIELDS = [
  'cid',
  'ipfsCid',
  'mediaId',
  'encryptionKeyId',
  'timestamp',
  'createdAt',
  'expiresAt',
  'size',
  'mimeType',
  'fileName',
  'studentId', // Anonymous student IDs are allowed (Student#XXXX)
];

export function scanLocalStorage(): {
  violations: ZeroLogViolation[];
  checkedCount: number;
  allowedKeys: string[];
  forbiddenKeys: string[];
} {
  const violations: ZeroLogViolation[] = [];
  const allowedKeys: string[] = [];
  const forbiddenKeys: string[] = [];
  let checkedCount = 0;

  if (typeof window === 'undefined' || !window.localStorage) {
    return { violations, checkedCount: 0, allowedKeys, forbiddenKeys };
  }

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      checkedCount++;

      // Check if key is in allowed list
      const isAllowed = ALLOWED_STORAGE_KEYS.some((allowed) =>
        key.startsWith(allowed)
      );

      if (isAllowed) {
        allowedKeys.push(key);

        // Even allowed keys should not contain forbidden patterns in their values
        try {
          const value = window.localStorage.getItem(key);
          if (value) {
            for (const pattern of FORBIDDEN_PATTERNS) {
              if (pattern.test(value)) {
                violations.push({
                  type: 'localStorage',
                  location: 'localStorage',
                  key,
                  issue: `Forbidden pattern detected in value: ${pattern.source}`,
                  severity: 'high',
                  details: `Key '${key}' contains data matching forbidden pattern`,
                });
              }
            }
          }
        } catch {
          // Ignore JSON parse errors for encrypted data
        }
      } else {
        forbiddenKeys.push(key);
        violations.push({
          type: 'localStorage',
          location: 'localStorage',
          key,
          issue: 'Key not in ALLOWED_STORAGE_KEYS whitelist',
          severity: 'critical',
          details: `Unauthorized localStorage key: ${key}`,
        });
      }
    }
  } catch (error) {
    violations.push({
      type: 'localStorage',
      location: 'localStorage',
      issue: 'Failed to scan localStorage',
      severity: 'high',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return { violations, checkedCount, allowedKeys, forbiddenKeys };
}

export async function scanIndexedDB(): Promise<{
  violations: ZeroLogViolation[];
  checkedCount: number;
  databases: string[];
  cidReferences: number;
}> {
  const violations: ZeroLogViolation[] = [];
  const databases: string[] = [];
  let checkedCount = 0;
  let cidReferences = 0;

  if (typeof window === 'undefined' || !window.indexedDB) {
    return { violations, checkedCount: 0, databases, cidReferences: 0 };
  }

  try {
    // Get list of databases
    const dbList = await window.indexedDB.databases();
    databases.push(...dbList.map((db) => db.name || 'unknown'));

    // Check SafeVoiceMediaDB
    if (databases.includes('SafeVoiceMediaDB')) {
      try {
        const db = new Dexie('SafeVoiceMediaDB');
        await db.open();

        const tables = db.tables;
        for (const table of tables) {
          const records = await table.toArray();
          checkedCount += records.length;

          for (const record of records) {
            // Check for CID references (good)
            if (
              record.ipfsCid ||
              record.cid ||
              record.mediaId?.startsWith('Qm') ||
              record.mediaId?.startsWith('bafy')
            ) {
              cidReferences++;
            }

            // Check for forbidden patterns in record data
            const recordStr = JSON.stringify(record);
            for (const pattern of FORBIDDEN_PATTERNS) {
              if (pattern.test(recordStr)) {
                // Check if it's an allowed metadata field
                const isAllowedField = ALLOWED_METADATA_FIELDS.some((field) =>
                  recordStr.includes(`"${field}"`)
                );

                if (!isAllowedField) {
                  violations.push({
                    type: 'indexedDB',
                    location: 'SafeVoiceMediaDB',
                    table: table.name,
                    recordId: record.id,
                    issue: `Forbidden pattern detected: ${pattern.source}`,
                    severity: 'high',
                    details: `Record contains data matching forbidden pattern`,
                  });
                }
              }
            }

            // Verify only CID references for content
            if (record.data && record.data instanceof ArrayBuffer) {
              // Encrypted data is allowed
              continue;
            }

            // Check for unencrypted message content
            if (
              record.content &&
              typeof record.content === 'string' &&
              !record.ipfsCid &&
              !record.cid
            ) {
              violations.push({
                type: 'indexedDB',
                location: 'SafeVoiceMediaDB',
                table: table.name,
                recordId: record.id,
                issue: 'Unencrypted content without CID reference',
                severity: 'critical',
                details: 'Content should be stored on IPFS with only CID reference',
              });
            }
          }
        }

        db.close();
      } catch (error) {
        violations.push({
          type: 'indexedDB',
          location: 'SafeVoiceMediaDB',
          issue: 'Failed to scan database',
          severity: 'medium',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Check for other databases that might leak data
    const knownSafeDatabases = ['SafeVoiceMediaDB'];
    const unknownDatabases = databases.filter(
      (db) => !knownSafeDatabases.includes(db)
    );

    if (unknownDatabases.length > 0) {
      violations.push({
        type: 'indexedDB',
        location: 'indexedDB',
        issue: 'Unknown IndexedDB databases detected',
        severity: 'medium',
        details: `Unknown databases: ${unknownDatabases.join(', ')}`,
      });
    }
  } catch (error) {
    violations.push({
      type: 'indexedDB',
      location: 'indexedDB',
      issue: 'Failed to enumerate IndexedDB databases',
      severity: 'low',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return { violations, checkedCount, databases, cidReferences };
}

export async function runZeroLogAudit(
  options: ZeroLogAuditOptions = {}
): Promise<ZeroLogAuditReport> {
  const timestamp = Date.now();

  // Scan localStorage
  const localStorageResults = scanLocalStorage();

  // Scan IndexedDB
  const indexedDBResults = await scanIndexedDB();

  // Combine violations
  const allViolations = [
    ...localStorageResults.violations,
    ...indexedDBResults.violations,
  ];

  const criticalViolations = allViolations.filter(
    (v) => v.severity === 'critical'
  ).length;

  const report: ZeroLogAuditReport = {
    timestamp,
    clean: allViolations.length === 0,
    violations: allViolations,
    summary: {
      localStorageChecked: localStorageResults.checkedCount,
      indexedDBChecked: indexedDBResults.checkedCount,
      totalViolations: allViolations.length,
      criticalViolations,
    },
    storageSnapshot: {
      allowedKeys: localStorageResults.allowedKeys,
      forbiddenKeys: localStorageResults.forbiddenKeys,
      indexedDBs: indexedDBResults.databases,
      cidReferences: indexedDBResults.cidReferences,
    },
  };

  // Halt operations if violations exist and option is enabled
  if (!report.clean && options.haltOnViolations) {
    if (options.onHalt) {
      options.onHalt(report);
    } else {
      console.error('[ZeroLogAuditor] CRITICAL: Privacy violations detected!');
      throw new Error(
        `Zero-log audit failed with ${allViolations.length} violations`
      );
    }
  }

  return report;
}

export function haltOperations(report: ZeroLogAuditReport): void {
  console.error('[ZeroLogAuditor] Halting operations due to privacy violations');
  console.error('Violations:', report.violations);

  // Dispatch a global event that the app can listen to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('safevoice:zero-log-violation', {
        detail: report,
      })
    );
  }

  // Lock the system by setting a flag in localStorage
  try {
    window.localStorage.setItem(
      'safevoice:systemLocked',
      JSON.stringify({
        locked: true,
        reason: 'zero-log-audit-failure',
        timestamp: report.timestamp,
        violations: report.violations.length,
      })
    );
  } catch (error) {
    console.error('[ZeroLogAuditor] Failed to set system lock:', error);
  }
}

export function unlockSystem(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('safevoice:systemLocked');
      console.info('[ZeroLogAuditor] System unlocked');
    } catch (error) {
      console.error('[ZeroLogAuditor] Failed to unlock system:', error);
    }
  }
}

export function isSystemLocked(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const lockData = window.localStorage.getItem('safevoice:systemLocked');
    if (!lockData) return false;

    const lock = JSON.parse(lockData);
    return lock.locked === true;
  } catch {
    return false;
  }
}
