# Emotion Analysis Implementation

## Overview

The emotion analysis module provides lightweight sentiment/emotion detection for posts using HuggingFace's API with offline fallback capabilities. It categorizes content into five emotion buckets: Sad, Anxious, Angry, Happy, and Neutral.

## Features

### 1. HuggingFace API Integration
- Uses `j-hartmann/emotion-english-distilroberta-base` model
- Configurable via environment variables
- Optional API token for higher rate limits
- Automatic mapping of model labels to emotion buckets

### 2. Offline Fallback
- Keyword-based heuristic when API unavailable
- Works in tests without network calls
- Handles negation patterns
- Weight-based confidence scoring

### 3. Caching & Throttling
- 5-minute cache TTL to avoid repeated analysis
- 1-second throttle between API calls
- Automatic cache cleanup
- Normalized text for cache keys

### 4. Manual Override
- Option to manually specify emotion
- 100% confidence for manual selections
- Useful for user corrections

## Configuration

Add to your `.env` file:

```env
# HuggingFace API Configuration (Optional)
VITE_HF_API_TOKEN=your_token_here
VITE_HF_EMOTION_API_URL=https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base
```

If not configured, the module falls back to offline analysis automatically.

## Usage

### Basic Analysis

```typescript
import { analyzeEmotion } from './lib/emotionAnalysis';

const result = await analyzeEmotion('I am so happy today!');
console.log(result.emotion);      // 'Happy'
console.log(result.confidence);   // 0.85
console.log(result.source);       // 'api' or 'offline'
```

### With Manual Override

```typescript
const result = await analyzeEmotion('Some text', {
  manualOverride: 'Anxious'
});
// result.emotion === 'Anxious'
// result.source === 'manual'
// result.confidence === 1.0
```

### Offline-Only Mode

```typescript
const result = await analyzeEmotion('Feeling stressed', {
  useOfflineOnly: true
});
// result.source === 'offline'
```

### Store Integration

```typescript
import { useStore } from './lib/store';
import { analyzeEmotion } from './lib/emotionAnalysis';

const emotionResult = await analyzeEmotion(postContent);

store.addPost(
  postContent,
  'Mental Health',
  '24h',
  undefined,
  false,
  undefined,
  undefined,
  undefined,
  undefined,
  { ...emotionResult, detectedAt: Date.now() }
);
```

## Emotion Mapping

The module maps HuggingFace's 7 emotions to 5 buckets:

| HuggingFace Label | Mapped Emotion |
|-------------------|----------------|
| joy               | Happy          |
| surprise          | Happy          |
| sadness           | Sad            |
| disgust           | Sad            |
| fear              | Anxious        |
| anger             | Angry          |
| neutral           | Neutral        |

## Offline Keywords

The offline fallback uses keyword matching with weights:

- **Sad**: sad, depressed, lonely, hopeless, crying, tears, miserable, heartbroken, grief, sorrow, unhappy, melancholy, down, blue, gloomy
- **Anxious**: anxious, anxiety, worried, nervous, panic, stress, overwhelmed, scared, fear, afraid, tense, uneasy, restless, pressure, exam, deadline, uncertain
- **Angry**: angry, furious, mad, rage, hate, annoyed, irritated, frustrated, infuriated, outraged, pissed, bitter, resentful, hostile
- **Happy**: happy, joy, excited, amazing, wonderful, great, excellent, love, blessed, grateful, thrilled, delighted, cheerful, pleased, glad, fantastic, awesome, celebration, celebrate

## API Response Format

HuggingFace returns arrays of labels with scores:

```json
[
  { "label": "joy", "score": 0.85 },
  { "label": "neutral", "score": 0.10 },
  { "label": "sadness", "score": 0.05 }
]
```

The module aggregates scores by emotion bucket and applies a 0.3 threshold for classification.

## Post Metadata

Emotion data is stored in the post object:

```typescript
interface Post {
  // ... other fields
  emotionAnalysis?: {
    emotion: 'Sad' | 'Anxious' | 'Angry' | 'Happy' | 'Neutral';
    confidence: number;  // 0-1
    source: 'api' | 'offline' | 'manual';
    detectedAt: number;  // timestamp
  };
}
```

## Testing

Comprehensive test suites cover:

### Core Functionality (`emotionAnalysis.test.ts`)
- API response parsing (9 tests)
- Classification thresholds (3 tests)
- Offline fallback (10 tests)
- Caching (4 tests)
- Throttling (1 test)
- Manual override (3 tests)
- Edge cases (7 tests)
- Store integration types (2 tests)

### Store Integration (`emotionAnalysisStoreIntegration.test.ts`)
- Post creation with emotion (10 tests)
- Different emotion types
- Encrypted posts
- Community posts
- Crisis-flagged posts
- Metadata persistence

Run tests:

```bash
npm test -- emotionAnalysis.test.ts
npm test -- emotionAnalysisStoreIntegration.test.ts
```

## Performance

- **Cache Hit**: ~1ms (instant)
- **Offline Analysis**: ~5-10ms
- **API Call**: ~200-500ms (network dependent)
- **Throttle**: 1 second between calls
- **Cache TTL**: 5 minutes

## Utility Functions

### Clear Cache

```typescript
import { clearEmotionCache } from './lib/emotionAnalysis';

clearEmotionCache();
```

### Get Cache Stats

```typescript
import { getCacheStats } from './lib/emotionAnalysis';

const stats = getCacheStats();
console.log(stats.size);      // Number of cached entries
console.log(stats.entries);   // Array of cache entries with metadata
```

## Privacy & Security

- No personally identifiable information is sent to HuggingFace
- Only post content is analyzed
- Offline mode works without any external calls
- Cache is in-memory only (cleared on page refresh)
- API token is optional and stored in environment variables

## Error Handling

The module gracefully handles:
- Network failures → Falls back to offline
- API errors → Falls back to offline
- Malformed responses → Falls back to offline
- Rate limiting → Uses throttling
- Empty/short text → Returns Neutral with 0.5 confidence

## Future Enhancements

Potential improvements:
- Multi-language support
- Custom emotion categories
- Confidence threshold configuration
- Advanced sentiment analysis
- Emotion trend tracking
- Integration with crisis detection system

## Files

- **Module**: `src/lib/emotionAnalysis.ts`
- **Tests**: `src/lib/__tests__/emotionAnalysis.test.ts`
- **Store Integration Tests**: `src/lib/__tests__/emotionAnalysisStoreIntegration.test.ts`
- **Types**: Exported from `emotionAnalysis.ts` and re-exported from `store.ts`
- **Environment**: `.env.example` updated with configuration

## Dependencies

- HuggingFace Inference API (optional)
- Zustand store (for integration)
- Vitest (for testing)

## License

Part of SafeVoice mental health support platform.
