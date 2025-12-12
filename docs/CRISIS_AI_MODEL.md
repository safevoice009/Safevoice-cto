# Crisis AI Model Implementation

## Overview

The Crisis AI Model provides on-device TensorFlow.js-based crisis detection with automatic fallback to keyword detection when the AI model is unavailable. This implementation ensures privacy-preserving, offline-capable crisis detection with zero network calls after the initial model download.

## Architecture

### Core Components

#### 1. CrisisModelLoader (`src/lib/crisisAI/CrisisModelLoader.ts`)
- **Purpose**: Handles model downloading, verification, caching, and lifecycle management
- **Key Features**:
  - SHA-256 checksum verification for security
  - IndexedDB caching for offline use
  - Progress tracking with detailed status updates
  - Automatic fallback on failures
  - Singleton pattern for efficient resource management

#### 2. Crisis Detection Service (`src/lib/crisisDetection.ts`)
- **Purpose**: Main interface for crisis detection with AI/keyword hybrid approach
- **Key Features**:
  - AI model inference when available
  - Fallback keyword pattern matching
  - Confidence scoring and severity assessment
  - Async/await pattern for non-blocking operations

#### 3. Store Integration (`src/lib/store.ts`)
- **Purpose**: Centralized state management for crisis AI functionality
- **State Properties**:
  - `modelReady`: Whether the AI model is loaded and ready
  - `modelMethod`: Current detection method (`ai_model` or `keyword_pattern`)
  - `modelConfidence`: Last detection confidence score
  - `isLoading`: Loading state for model initialization
  - `error`: Error messages for debugging
  - `lastDetection`: Recent detection results for analytics

## Workflow

### 1. Model Loading Process

```
1. User requests crisis detection
2. Check if model is cached and valid
3. If cached → Load from IndexedDB
4. If not cached → Download from /models/crisis-detector/
5. Verify checksums against manifest
6. Load model with TensorFlow.js
7. Cache for future use
8. Return success/failure status
```

### 2. Detection Flow

```
1. Text input received
2. If AI model ready → Try AI inference
3. If AI fails → Fallback to keyword detection
4. Return result with method and confidence
5. Update store state
6. Cache results for analytics
```

### 3. Offline Guarantee

- **First Load**: Downloads model (~5-15MB) and caches in IndexedDB
- **Subsequent Loads**: Loads from local IndexedDB cache
- **Cache Validation**: 7-day expiration with version tracking
- **Fallback**: Keyword detection always available offline

## Security Features

### Checksum Verification
- SHA-256 hash verification for all model files
- Prevents tampering and ensures model integrity
- Fails closed on checksum mismatch

### Model Integrity
- Cryptographic verification of model files
- Secure loading through TensorFlow.js APIs
- No execution of unverified code

### Privacy Protection
- On-device processing only
- No text sent to external servers
- Minimal logging of detection results
- Truncated text storage (100 chars max)

## File Structure

```
src/lib/crisisAI/
├── CrisisModelLoader.ts          # Core loader implementation
└── __tests__/
    └── CrisisModelLoader.test.ts # Comprehensive test suite

public/models/crisis-detector/
├── model.json                     # TensorFlow.js model topology
├── weight-shard-1.bin            # Model weights (can be multiple)
├── weight-shard-2.bin            # Additional weight shards
└── checksums.json                # SHA-256 manifest

scripts/
└── hash-model.mjs                # Script to regenerate checksums
```

## API Reference

### CrisisModelLoader

```typescript
// Load model with optional progress callback
const result = await crisisModelLoader.loadCrisisModel({
  onProgress: (progress) => console.log(`${progress.stage}: ${progress.progress}%`),
  forceReload: false,
  backend: 'cpu'
});

// Get cached model instance
const model = crisisModelLoader.getCachedModel();

// Ensure model is ready (download + cache if needed)
const result = await crisisModelLoader.ensureModelReady();

// Clean up resources
crisisModelLoader.destroy();
```

### Crisis Detection Service

```typescript
// Initialize AI model
const success = await initializeCrisisModel();

// Check if model is ready
const ready = isCrisisModelReady();

// Detect crisis in text
const result = await detectCrisis("I want to end it all");
console.log(result);
// {
//   isCrisis: true,
//   method: 'ai_model',
//   confidence: 0.87,
//   severity: 'critical'
// }
```

### Store Actions

```typescript
const { 
  crisisAI, 
  initializeCrisisModel, 
  detectCrisisInText, 
  getCrisisModelStatus 
} = useStore();

// Initialize model
await initializeCrisisModel();

// Check status
const status = getCrisisModelStatus();
console.log(status); // { ready: true, method: 'ai_model', confidence: 0 }

// Detect crisis
const isCrisis = await detectCrisisInText("I feel hopeless");
console.log(isCrisis); // true

// Access state
console.log(crisisAI.modelReady); // true
console.log(crisisAI.modelMethod); // 'ai_model'
console.log(crisisAI.lastDetection); // { method, confidence, timestamp, text }
```

## Configuration

### Model Configuration
```typescript
const MODEL_CONFIG = {
  baseUrl: '/models/crisis-detector',
  manifestFile: 'checksums.json',
  modelFile: 'model.json',
  cachePrefix: 'crisis-model',
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
```

### Environment Variables
```bash
# Optional: Custom model URL
VITE_CRISIS_MODEL_URL=https://cdn.example.com/crisis-model

# Optional: Enable debug logging
VITE_CRISIS_DEBUG=true
```

## Error Handling

### Graceful Degradation
- **Network Failure**: Falls back to keyword detection
- **Checksum Mismatch**: Aborts load, uses keyword detection
- **TensorFlow.js Unavailable**: Uses keyword detection
- **Invalid Model**: Reverts to keyword detection
- **Memory Issues**: Disposes tensors, uses keyword detection

### Error Types
```typescript
type CrisisModelError = 
  | 'checksum_mismatch'     // Security: Model tampered
  | 'download_failed'       // Network connectivity issues
  | 'load_failed'           // TensorFlow.js loading failure
  | 'cache_corrupted'       // IndexedDB corruption
  | 'tfjs_unavailable';     // TensorFlow.js not supported
```

### User Experience
- Silent fallback to keyword detection
- No user-facing error messages
- Console logging for debugging
- Automatic retry on next detection attempt

## Performance Considerations

### Memory Management
- Tensor disposal after inference
- Automatic garbage collection
- Singleton loader pattern
- Cache size limits (7-day expiration)

### Loading Optimization
- Progressive download with progress tracking
- Multiple backend support (CPU, WebGL, WASM)
- Streaming verification
- Parallel weight shard downloads

### Runtime Performance
- Async/await for non-blocking operations
- Minimal synchronous operations
- Lazy model initialization
- Efficient caching strategy

## Testing Strategy

### Test Coverage
- ✅ Successful model load and verification
- ✅ Checksum mismatch detection
- ✅ Cached load avoids network calls
- ✅ Progress callback invocation
- ✅ IndexedDB cache retrieval
- ✅ Fallback to keyword-only mode
- ✅ TensorFlow.js unavailable handling
- ✅ Memory cleanup and resource disposal
- ✅ Error propagation and handling
- ✅ Store integration and state management

### Test Commands
```bash
# Run all tests
npm test -- src/lib/crisisAI/__tests__/CrisisModelLoader.test.ts

# Run with coverage
npm run test:coverage

# Run specific test scenarios
npm test -- --grep "checksum"
```

## Deployment

### Build Process
1. **Model Preparation**: Generate TensorFlow.js model and weights
2. **Checksum Generation**: Run `npm run generate:checksums`
3. **Asset Compilation**: Include model files in build
4. **Build Verification**: Ensure all model files present

### Production Checklist
- [ ] Model files in `public/models/crisis-detector/`
- [ ] Valid `checksums.json` manifest
- [ ] TensorFlow.js dependencies installed
- [ ] Error handling tested
- [ ] Fallback behavior verified
- [ ] Cache expiration working
- [ ] Memory management tested

### Monitoring
- Model load success/failure rates
- Detection method usage (AI vs keyword)
- Fallback frequency
- Cache hit rates
- Error type distribution

## Future Enhancements

### Model Improvements
- Model versioning and hot-swapping
- A/B testing framework
- Custom model upload support
- Federated learning integration

### Performance Optimizations
- WebGL backend optimization
- WebAssembly acceleration
- Model quantization
- Edge caching CDN integration

### Feature Additions
- Multi-language support
- Confidence threshold configuration
- Batch processing capabilities
- Real-time streaming detection

## Troubleshooting

### Common Issues

**Model Download Fails**
- Check network connectivity
- Verify model files exist in public directory
- Check CORS headers if using CDN

**Checksums Don't Match**
- Regenerate checksums: `npm run generate:checksums`
- Verify file integrity
- Check for corrupted model files

**TensorFlow.js Errors**
- Verify browser compatibility
- Check console for WebGL errors
- Fallback to CPU backend

**High Memory Usage**
- Ensure proper tensor disposal
- Check for memory leaks in inference loops
- Monitor cache size limits

### Debug Mode
```typescript
// Enable debug logging
localStorage.setItem('VITE_CRISIS_DEBUG', 'true');

// Check model status
const status = getCrisisModelStatus();
console.log('Crisis model status:', status);
```

## Security Considerations

### Model Integrity
- SHA-256 verification prevents tampering
- Secure loading prevents code injection
- Offline operation reduces attack surface

### Privacy Protection
- No data transmitted to external servers
- Minimal logging of sensitive information
- Automatic cleanup of detection data
- Client-side processing only

### Access Control
- Model loading requires user interaction
- No background model downloads
- User consent for model caching
- Transparent fallback behavior