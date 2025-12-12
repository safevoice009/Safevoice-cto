# Zero-Log Auditor

The Zero-Log Auditor is a built-in privacy compliance tool that verifies SafeVoice's zero-log policy by scanning local storage for unauthorized metadata, user IDs, IP addresses, and tracking data.

## Overview

SafeVoice enforces a strict zero-log policy where:
- ✅ **Allowed**: Anonymous student IDs (Student#XXXX), CID/IPFS references, encrypted content, timestamps
- ❌ **Forbidden**: Real user IDs, IP addresses, activity timestamps, message content (without CID), location data, tracking identifiers

The auditor scans both localStorage and IndexedDB to detect violations and can optionally halt system operations when privacy leaks are detected.

## Quick Start

### Running an Audit

1. **Access the Auditor**:
   - Open SafeVoice → Admin Panel (requires moderator privileges)
   - Click "Reporting" tab
   - Scroll to "Zero-Log Auditor" section

2. **Run Audit**:
   ```bash
   # Click "Run Zero-Log Audit" button in UI
   # OR run tests:
   npm test -- src/lib/audit/__tests__/ZeroLogAuditor.test.ts --run
   ```

3. **Interpret Results**:
   - **Green (✅)**: Clean storage, no violations
   - **Red (⚠️)**: Violations detected with count and severity

## Architecture

### Core Module (`src/lib/audit/ZeroLogAuditor.ts`)

```typescript
import { runZeroLogAudit, scanLocalStorage, scanIndexedDB } from './lib/audit/ZeroLogAuditor';

// Run full audit
const report = await runZeroLogAudit({
  haltOnViolations: true, // Lock system on violations
  onHalt: (report) => {
    console.error('Violations detected!', report);
  }
});

// Scan specific storage
const localStorageResult = scanLocalStorage();
const indexedDBResult = await scanIndexedDB();
```

### Report Structure

```typescript
interface ZeroLogAuditReport {
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
```

### Violation Types

```typescript
interface ZeroLogViolation {
  type: 'localStorage' | 'indexedDB';
  location: string; // Storage location
  key?: string; // localStorage key
  table?: string; // IndexedDB table
  recordId?: string | number; // Record ID
  issue: string; // Violation description
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string; // Additional context
}
```

## Detection Rules

### Forbidden Patterns

The auditor blocks these patterns in stored data:

- **User Identification**: `userId`, `user_id`, `realName`, `fullName`, `emailAddress`, `phoneNumber`
- **Activity Tracking**: `activityTimestamp`, `lastSeen`, `sessionId` (unless anonymous)
- **Location Data**: `ipAddress`, `ip`, `location`, `geoLocation`, `latitude`, `longitude`
- **Messaging**: `messageContent` (without CID), `messageMetadata`, `conversationHistory`, `chatHistory`
- **Tracking**: `trackingId`, `deviceFingerprint`, `browser_fingerprint`

### Allowed Metadata Fields

These fields are permitted in IndexedDB records:

- `cid`, `ipfsCid` - IPFS content identifiers
- `mediaId`, `encryptionKeyId` - Encrypted content references
- `timestamp`, `createdAt`, `expiresAt` - Time metadata
- `size`, `mimeType`, `fileName` - File metadata
- `studentId` - Anonymous student IDs (Student#XXXX format)

## Store Integration

### State

```typescript
interface StoreState {
  zeroLogAuditReport: ZeroLogAuditReport | null;
  isZeroLogAuditRunning: boolean;
  systemLocked: boolean;
  
  runZeroLogAudit: (haltOnViolations?: boolean) => Promise<void>;
  unlockSystem: () => void;
}
```

### Usage in Components

```typescript
import { useStore } from './lib/store';

function AuditorPanel() {
  const report = useStore(state => state.zeroLogAuditReport);
  const isRunning = useStore(state => state.isZeroLogAuditRunning);
  const runAudit = useStore(state => state.runZeroLogAudit);
  
  return (
    <button 
      onClick={() => runAudit(true)} 
      disabled={isRunning}
    >
      Run Audit
    </button>
  );
}
```

## UI Component

The `ZeroLogAuditPanel` component provides a comprehensive audit interface:

### Features

- **Audit Status**: Last run timestamp, clean/violation indicator
- **Storage Snapshot**: 
  - localStorage key counts (allowed vs forbidden)
  - IndexedDB database list
  - CID reference count
  - Total records checked
- **Violation List**: 
  - Severity badges (critical/high/medium/low)
  - Location and key information
  - Issue description and details
- **Controls**:
  - Run audit button
  - Halt on violations checkbox
  - System unlock button (when locked)
- **Privacy Guidelines**: Quick reference for allowed vs forbidden data

### Location

`Admin Panel → Reporting Tab → Zero-Log Auditor` (requires moderator privileges)

## System Lock

When violations are detected and `haltOnViolations` is enabled:

1. **Lock Trigger**: `haltOperations()` is called
2. **Lock Storage**: Flag saved to `safevoice:systemLocked` in localStorage
3. **Event Dispatch**: `safevoice:zero-log-violation` custom event fired
4. **UI Indicator**: Red "System Locked" badge appears
5. **Resolution**: Admin must:
   - Review and fix violations
   - Click "Unlock System" button
   - Re-run audit to verify clean state

## Testing

### Unit Tests (`src/lib/audit/__tests__/ZeroLogAuditor.test.ts`)

17 comprehensive tests covering:

1. **localStorage Scanning**:
   - Forbidden key detection
   - Clean state validation
   - Pattern matching in values
   - Item count accuracy

2. **IndexedDB Scanning**:
   - Dexie table inspection
   - CID reference counting
   - Unknown database detection

3. **Audit Execution**:
   - Clean report generation
   - Violation detection
   - Halt-on-violations behavior
   - No network calls verification
   - Storage snapshot accuracy

4. **System Lock**:
   - Lock on violations
   - Custom event dispatch
   - Unlock functionality
   - Lock state persistence

### Running Tests

```bash
# Run all auditor tests
npm test -- src/lib/audit/__tests__/ZeroLogAuditor.test.ts --run

# Run with coverage
npm test -- src/lib/audit/__tests__/ZeroLogAuditor.test.ts --coverage

# Watch mode
npm test -- src/lib/audit/__tests__/ZeroLogAuditor.test.ts
```

## Best Practices

### Development

1. **Regular Audits**: Run audits weekly or after major storage changes
2. **Pre-Deployment**: Always run audit before production deployments
3. **Clean State**: Maintain zero violations at all times
4. **Code Review**: Check for forbidden patterns in new code
5. **Test Coverage**: Add tests for new storage mechanisms

### Production

1. **Automated Audits**: Schedule regular audit runs
2. **Monitoring**: Track violation counts over time
3. **Alerts**: Set up notifications for critical violations
4. **Enforcement**: Enable `haltOnViolations` in production
5. **Compliance**: Export audit reports for documentation

### Debugging Violations

When violations are detected:

1. **Review Report**: Check violation type, location, and severity
2. **Identify Source**: Find code that writes forbidden data
3. **Fix Issue**: 
   - Remove unauthorized keys
   - Encrypt sensitive data
   - Store content on IPFS with CID references
   - Use anonymous identifiers
4. **Verify Fix**: Re-run audit to confirm clean state
5. **Update Tests**: Add test to prevent regression

## Privacy Compliance

The Zero-Log Auditor helps SafeVoice comply with privacy regulations:

- **GDPR**: No personal data stored without consent
- **COPPA**: No child identification data collected
- **CCPA**: No user tracking or profiling data
- **FERPA**: No education records linked to real identities

### Audit Report Export

Audit reports can be exported for compliance documentation:

```typescript
// Save report to file
const report = useStore.getState().zeroLogAuditReport;
const json = JSON.stringify(report, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// Download via link
```

## Troubleshooting

### Common Issues

**Issue**: Audit detects allowed keys as violations
- **Cause**: Key not in `ALLOWED_STORAGE_KEYS` whitelist
- **Fix**: Add key to `src/lib/privacy/middleware.ts`

**Issue**: CID references not counted
- **Cause**: CID format not recognized
- **Fix**: Ensure CIDs start with `Qm` (v0) or `bafy` (v1)

**Issue**: System locked after audit
- **Cause**: Violations detected with `haltOnViolations` enabled
- **Fix**: Review violations, fix issues, unlock system, re-run audit

**Issue**: False positives in pattern matching
- **Cause**: Pattern regex too broad
- **Fix**: Refine regex in `FORBIDDEN_PATTERNS` array

### Debug Mode

Enable detailed logging:

```typescript
// In ZeroLogAuditor.ts
console.debug('[ZeroLogAuditor] Scanning localStorage...');
console.debug('[ZeroLogAuditor] Found violation:', violation);
```

## API Reference

### Functions

#### `runZeroLogAudit(options?)`

Runs a complete zero-log audit of localStorage and IndexedDB.

**Parameters**:
- `options.haltOnViolations?: boolean` - Lock system if violations found
- `options.onHalt?: (report: ZeroLogAuditReport) => void` - Callback on halt

**Returns**: `Promise<ZeroLogAuditReport>`

#### `scanLocalStorage()`

Scans localStorage for forbidden keys and patterns.

**Returns**: 
```typescript
{
  violations: ZeroLogViolation[];
  checkedCount: number;
  allowedKeys: string[];
  forbiddenKeys: string[];
}
```

#### `scanIndexedDB()`

Scans IndexedDB databases for forbidden data.

**Returns**: 
```typescript
Promise<{
  violations: ZeroLogViolation[];
  checkedCount: number;
  databases: string[];
  cidReferences: number;
}>
```

#### `haltOperations(report)`

Locks the system due to privacy violations.

**Parameters**:
- `report: ZeroLogAuditReport` - Audit report with violations

#### `unlockSystem()`

Removes system lock after violations are resolved.

#### `isSystemLocked()`

Checks if system is currently locked.

**Returns**: `boolean`

## Contributing

When adding new storage mechanisms:

1. **Update Allowed Keys**: Add to `ALLOWED_STORAGE_KEYS` in `src/lib/privacy/middleware.ts`
2. **Add Storage Key**: Define in `STORAGE_KEYS` in `src/lib/store.ts`
3. **Test Auditor**: Ensure auditor scans new storage correctly
4. **Update Docs**: Document new storage in this file

## License

This auditor is part of SafeVoice and follows the project's license terms.

## Support

For questions or issues:
- Review `docs/PRIVACY_AUDIT_CHECKLIST.md`
- Check test examples in `src/lib/audit/__tests__/ZeroLogAuditor.test.ts`
- Contact privacy team for compliance questions
