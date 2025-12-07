# Storage System Tests

This directory contains tests for the hybrid P2P storage system.

## Test Files

### StorageRouter.test.ts ✅
- **Status**: Active and passing
- **Coverage**: 14 tests
- **Environment**: Node/Browser compatible
- **Purpose**: Tests smart routing algorithm for storage layer selection

### StorageEncryption.test.ts.skip ⏸️
- **Status**: Skipped (requires browser crypto.subtle API)
- **Purpose**: Tests AES-256-GCM encryption with per-user keys
- **Why skipped**: Requires Web Crypto API (crypto.subtle) which is not available in Node test environment
- **How to run locally**: In browser environment or with jsdom configured for webcrypto
- **To enable**: Rename to `.test.ts` and run with appropriate polyfills

### StorageService.test.ts.skip ⏸️
- **Status**: Skipped (requires IndexedDB API)
- **Purpose**: Tests unified storage service with all layers
- **Why skipped**: Requires IndexedDB which is not available in Node test environment
- **How to run locally**: In browser environment or with jsdom configured for IndexedDB
- **To enable**: Rename to `.test.ts` and set up IndexedDB mock

## Running Tests

### Run all active tests
```bash
npm test -- --run
```

### Run only storage router tests
```bash
npm test -- src/lib/storage/__tests__/StorageRouter.test.ts --run
```

### Run with watch mode
```bash
npm test -- src/lib/storage/__tests__/StorageRouter.test.ts
```

## Browser API Requirements

The storage system requires these browser APIs:

1. **IndexedDB** (Local Storage layer)
   - Used in: StorageService, LocalStorage
   - Polyfill: `fake-indexeddb` package (not included by default)

2. **Web Crypto API** (Encryption layer)
   - Used in: StorageEncryption
   - Polyfill: Node.js `crypto.webcrypto` (attempted in setupTests.ts)

3. **LocalStorage** (Encryption key storage)
   - Used in: StorageEncryption
   - Polyfill: jsdom provides this

## Future: Enabling Skipped Tests

To enable the skipped tests in CI:

1. Install necessary polyfills in package.json:
   ```bash
   npm install --save-dev fake-indexeddb
   ```

2. Configure in setupTests.ts or vitest config

3. Rename .skip files back to .test.ts

4. Update this README with new status

## Notes

- The StorageRouter test is the primary functional test for the storage system
- It validates all routing decisions without requiring browser APIs
- Integration tests (StorageService, StorageEncryption) should be run in browser environments
- For browser testing, use: `npm run test:ui` with proper browser drivers

## See Also

- `docs/HYBRID_P2P_STORAGE.md` - Complete architecture guide
- `src/lib/storage/` - Core implementation
- `src/setupTests.ts` - Test environment setup
