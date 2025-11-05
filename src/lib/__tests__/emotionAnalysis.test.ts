/**
 * Emotion Analysis Test Suite
 * 
 * Tests for emotion analysis module including:
 * - HuggingFace API response parsing
 * - Fallback keyword-based heuristic
 * - Classification thresholds
 * - Caching and throttling
 * - Edge cases
 * - Store integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  analyzeEmotion,
  clearEmotionCache,
  getCacheStats,
  type EmotionType,
  type HuggingFaceLabel,
} from '../emotionAnalysis';

describe('Emotion Analysis - API Response Parsing', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    clearEmotionCache();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should parse HuggingFace response and map joy to Happy', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'joy', score: 0.85 },
      { label: 'neutral', score: 0.10 },
      { label: 'sadness', score: 0.05 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('I am so happy and excited about this!');
    
    expect(result.emotion).toBe('Happy');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.source).toBe('api');
  });

  it('should parse HuggingFace response and map sadness to Sad', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'sadness', score: 0.75 },
      { label: 'neutral', score: 0.15 },
      { label: 'joy', score: 0.10 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('I feel so sad and lonely today');
    
    expect(result.emotion).toBe('Sad');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.source).toBe('api');
  });

  it('should parse HuggingFace response and map fear to Anxious', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'fear', score: 0.80 },
      { label: 'neutral', score: 0.12 },
      { label: 'sadness', score: 0.08 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('I am very anxious about the exam tomorrow');
    
    expect(result.emotion).toBe('Anxious');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.source).toBe('api');
  });

  it('should parse HuggingFace response and map anger to Angry', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'anger', score: 0.72 },
      { label: 'disgust', score: 0.18 },
      { label: 'neutral', score: 0.10 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('This makes me so angry and frustrated!');
    
    expect(result.emotion).toBe('Angry');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.source).toBe('api');
  });

  it('should handle disgust by mapping to Sad', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'disgust', score: 0.65 },
      { label: 'neutral', score: 0.25 },
      { label: 'sadness', score: 0.10 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('This situation is disgusting');
    
    expect(result.emotion).toBe('Sad');
    expect(result.source).toBe('api');
  });

  it('should handle surprise by mapping to Happy', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'surprise', score: 0.70 },
      { label: 'joy', score: 0.20 },
      { label: 'neutral', score: 0.10 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('Wow! This is amazing!');
    
    expect(result.emotion).toBe('Happy');
    expect(result.source).toBe('api');
  });

  it('should handle neutral responses', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'neutral', score: 0.90 },
      { label: 'joy', score: 0.05 },
      { label: 'sadness', score: 0.05 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('The weather is cloudy today');
    
    expect(result.emotion).toBe('Neutral');
    expect(result.source).toBe('api');
  });

  it('should handle nested array response format', async () => {
    const mockResponse = [[
      { label: 'joy', score: 0.80 },
      { label: 'neutral', score: 0.15 },
      { label: 'sadness', score: 0.05 },
    ]];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('Great news everyone!');
    
    expect(result.emotion).toBe('Happy');
    expect(result.source).toBe('api');
  });

  it('should handle empty API response', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('Some text here');
    
    expect(result.emotion).toBe('Neutral');
    expect(result.confidence).toBe(0.5);
    expect(result.source).toBe('api');
  });
});

describe('Emotion Analysis - Classification Thresholds', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    clearEmotionCache();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should classify as Neutral when confidence is below threshold', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'joy', score: 0.25 },
      { label: 'sadness', score: 0.25 },
      { label: 'neutral', score: 0.25 },
      { label: 'anger', score: 0.25 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('Some ambiguous text');
    
    expect(result.emotion).toBe('Neutral');
  });

  it('should classify correctly when confidence is above threshold', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'joy', score: 0.85 },
      { label: 'neutral', score: 0.10 },
      { label: 'sadness', score: 0.05 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('I am extremely happy!');
    
    expect(result.emotion).toBe('Happy');
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('should aggregate multiple similar emotions', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'sadness', score: 0.40 },
      { label: 'disgust', score: 0.35 },
      { label: 'neutral', score: 0.25 },
    ];

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('This makes me sad and disappointed');
    
    // Both sadness and disgust map to Sad, so should aggregate
    expect(result.emotion).toBe('Sad');
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

describe('Emotion Analysis - Offline Fallback', () => {
  beforeEach(() => {
    clearEmotionCache();
  });

  it('should detect sad emotion from keywords', async () => {
    const result = await analyzeEmotion(
      'I am so sad and depressed. I feel hopeless and lonely.',
      { useOfflineOnly: true }
    );
    
    expect(result.emotion).toBe('Sad');
    expect(result.source).toBe('offline');
  });

  it('should detect anxious emotion from keywords', async () => {
    const result = await analyzeEmotion(
      'I am very anxious and worried about the exam. I feel nervous and stressed.',
      { useOfflineOnly: true }
    );
    
    expect(result.emotion).toBe('Anxious');
    expect(result.source).toBe('offline');
  });

  it('should detect angry emotion from keywords', async () => {
    const result = await analyzeEmotion(
      'I am so angry and frustrated. This makes me furious!',
      { useOfflineOnly: true }
    );
    
    expect(result.emotion).toBe('Angry');
    expect(result.source).toBe('offline');
  });

  it('should detect happy emotion from keywords', async () => {
    const result = await analyzeEmotion(
      'I am so happy and excited! This is amazing and wonderful!',
      { useOfflineOnly: true }
    );
    
    expect(result.emotion).toBe('Happy');
    expect(result.source).toBe('offline');
  });

  it('should return neutral for text without emotion keywords', async () => {
    const result = await analyzeEmotion(
      'The conference is scheduled for next Tuesday at 3 PM.',
      { useOfflineOnly: true }
    );
    
    expect(result.emotion).toBe('Neutral');
    expect(result.source).toBe('offline');
  });

  it('should handle negation patterns', async () => {
    const result = await analyzeEmotion(
      'I am not happy about this situation. This is not great.',
      { useOfflineOnly: true }
    );
    
    // Should reduce Happy weight due to negation
    expect(result.emotion).not.toBe('Happy');
    expect(result.source).toBe('offline');
  });

  it('should weight repeated keywords higher', async () => {
    const result = await analyzeEmotion(
      'Happy happy happy! So happy and happy again!',
      { useOfflineOnly: true }
    );
    
    expect(result.emotion).toBe('Happy');
    expect(result.confidence).toBeGreaterThan(0.3);
    expect(result.source).toBe('offline');
  });

  it('should calculate confidence based on keyword density', async () => {
    const highDensity = await analyzeEmotion(
      'Sad sad sad sad sad',
      { useOfflineOnly: true }
    );
    
    const lowDensity = await analyzeEmotion(
      'I am a bit sad but everything else is fine and normal',
      { useOfflineOnly: true }
    );
    
    expect(highDensity.confidence).toBeGreaterThan(lowDensity.confidence);
  });

  it('should fallback to offline when API fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const result = await analyzeEmotion('I am so sad and depressed');
    
    expect(result.source).toBe('offline');
    expect(result.emotion).toBe('Sad');

    fetchSpy.mockRestore();
  });

  it('should fallback to offline when API returns error status', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 })
    );

    const result = await analyzeEmotion('I am very anxious and worried');
    
    expect(result.source).toBe('offline');
    expect(result.emotion).toBe('Anxious');

    fetchSpy.mockRestore();
  });
});

describe('Emotion Analysis - Caching', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    clearEmotionCache();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should cache results for identical text', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'joy', score: 0.80 },
      { label: 'neutral', score: 0.15 },
      { label: 'sadness', score: 0.05 },
    ];

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const text = 'I am happy today';
    
    const result1 = await analyzeEmotion(text);
    const result2 = await analyzeEmotion(text);
    
    expect(result1.emotion).toBe('Happy');
    expect(result2.emotion).toBe('Happy');
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Should only call API once
  });

  it('should normalize text for cache key', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'joy', score: 0.80 },
      { label: 'neutral', score: 0.15 },
      { label: 'sadness', score: 0.05 },
    ];

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await analyzeEmotion('  I am happy  ');
    await analyzeEmotion('I AM HAPPY');
    
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should return cache statistics', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'joy', score: 0.80 },
    ];

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await analyzeEmotion('Happy text');
    
    const stats = getCacheStats();
    expect(stats.size).toBe(1);
    expect(stats.entries.length).toBe(1);
    expect(stats.entries[0].emotion).toBe('Happy');
  });

  it('should clear cache when requested', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'joy', score: 0.80 },
    ];

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await analyzeEmotion('Happy text');
    expect(getCacheStats().size).toBe(1);
    
    clearEmotionCache();
    expect(getCacheStats().size).toBe(0);
  });
});

describe('Emotion Analysis - Throttling', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    clearEmotionCache();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should throttle rapid API calls', async () => {
    const mockResponse: HuggingFaceLabel[] = [
      { label: 'joy', score: 0.80 },
    ];

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Make two calls with different text in rapid succession
    const result1 = await analyzeEmotion('I am happy');
    const result2 = await analyzeEmotion('I am very happy');
    
    // First call should use API
    expect(result1.source).toBe('api');
    
    // Second call should be throttled and use offline
    expect(result2.source).toBe('offline');
    
    // API should only be called once due to throttling
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Emotion Analysis - Manual Override', () => {
  beforeEach(() => {
    clearEmotionCache();
  });

  it('should accept manual emotion override', async () => {
    const result = await analyzeEmotion('This is neutral text', {
      manualOverride: 'Happy'
    });
    
    expect(result.emotion).toBe('Happy');
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('manual');
  });

  it('should prioritize manual override over API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    
    const result = await analyzeEmotion('I am very sad', {
      manualOverride: 'Happy'
    });
    
    expect(result.emotion).toBe('Happy');
    expect(result.source).toBe('manual');
    expect(fetchSpy).not.toHaveBeenCalled();
    
    fetchSpy.mockRestore();
  });

  it('should accept all emotion types as manual override', async () => {
    const emotions: EmotionType[] = ['Sad', 'Anxious', 'Angry', 'Happy', 'Neutral'];
    
    for (const emotion of emotions) {
      const result = await analyzeEmotion('Some text', {
        manualOverride: emotion
      });
      
      expect(result.emotion).toBe(emotion);
      expect(result.source).toBe('manual');
    }
  });
});

describe('Emotion Analysis - Edge Cases', () => {
  beforeEach(() => {
    clearEmotionCache();
  });

  it('should return Neutral for empty string', async () => {
    const result = await analyzeEmotion('', { useOfflineOnly: true });
    
    expect(result.emotion).toBe('Neutral');
    expect(result.confidence).toBe(0.5);
    expect(result.source).toBe('offline');
  });

  it('should return Neutral for whitespace-only string', async () => {
    const result = await analyzeEmotion('   \n\t  ', { useOfflineOnly: true });
    
    expect(result.emotion).toBe('Neutral');
    expect(result.confidence).toBe(0.5);
    expect(result.source).toBe('offline');
  });

  it('should return Neutral for very short text', async () => {
    const result = await analyzeEmotion('Hi', { useOfflineOnly: true });
    
    expect(result.emotion).toBe('Neutral');
    expect(result.confidence).toBeLessThanOrEqual(0.5);
    expect(result.source).toBe('offline');
  });

  it('should handle very long text', async () => {
    const longText = 'I am happy '.repeat(100);
    
    const result = await analyzeEmotion(longText, { useOfflineOnly: true });
    
    expect(result.emotion).toBe('Happy');
    expect(result.source).toBe('offline');
  });

  it('should handle text with special characters', async () => {
    const result = await analyzeEmotion(
      'I am so happy!!! 😊😊😊',
      { useOfflineOnly: true }
    );
    
    expect(result.emotion).toBe('Happy');
    expect(result.source).toBe('offline');
  });

  it('should handle mixed emotions with predominant emotion', async () => {
    const result = await analyzeEmotion(
      'I am sad but also a bit happy and excited',
      { useOfflineOnly: true }
    );
    
    // Should detect at least one emotion
    expect(['Sad', 'Happy', 'Neutral']).toContain(result.emotion);
    expect(result.source).toBe('offline');
  });

  it('should handle malformed JSON from API gracefully', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      new Response('Invalid JSON{', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await analyzeEmotion('I am sad and depressed');
    
    // Should fallback to offline on parse error
    expect(result.source).toBe('offline');
    expect(result.emotion).toBe('Sad');

    fetchSpy.mockRestore();
  });
});

describe('Emotion Analysis - Store Integration', () => {
  it('should provide correct types for store integration', async () => {
    const result = await analyzeEmotion('Test text', { useOfflineOnly: true });
    
    // Verify result has all required fields for store
    expect(result).toHaveProperty('emotion');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('source');
    
    // Verify types
    expect(typeof result.emotion).toBe('string');
    expect(typeof result.confidence).toBe('number');
    expect(typeof result.source).toBe('string');
    
    expect(['Sad', 'Anxious', 'Angry', 'Happy', 'Neutral']).toContain(result.emotion);
    expect(['api', 'offline', 'manual']).toContain(result.source);
  });

  it('should format confidence as decimal number', async () => {
    const result = await analyzeEmotion('Happy text', { useOfflineOnly: true });
    
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.confidence)).toBe(true);
  });
});
