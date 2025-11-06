/**
 * Emotion Analysis Module
 * 
 * Lightweight sentiment/emotion service that:
 * - Calls HuggingFace sentiment analysis API (configurable via env)
 * - Maps sentiment scores to emotion buckets: Sad/Anxious/Angry/Happy/Neutral
 * - Implements caching/throttling to avoid repeated API calls during typing
 * - Provides offline fallback with keyword-based heuristic
 * - Supports manual emotion override
 */

export type EmotionType = 'Sad' | 'Anxious' | 'Angry' | 'Happy' | 'Neutral';

export interface EmotionAnalysisResult {
  emotion: EmotionType;
  confidence: number;
  source: 'api' | 'offline' | 'manual';
}

export interface HuggingFaceLabel {
  label: string;
  score: number;
}

interface CacheEntry {
  text: string;
  result: EmotionAnalysisResult;
  timestamp: number;
}

// Configuration
const HF_API_URL = import.meta.env.VITE_HF_EMOTION_API_URL || 
  'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base';
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN || '';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const THROTTLE_MS = 1000; // 1 second throttle between API calls
const MIN_TEXT_LENGTH = 10; // Minimum text length for meaningful analysis

// Cache and throttling state
const cache = new Map<string, CacheEntry>();
let lastApiCallTime = 0;

/**
 * Offline keyword-based emotion detection fallback
 * Uses simple keyword matching for basic emotion classification
 */
const offlineEmotionDetection = (text: string): EmotionAnalysisResult => {
  const lowerText = text.toLowerCase();
  
  // Define emotion keywords with weights
  const emotionKeywords: Record<EmotionType, { keywords: string[]; weight: number }> = {
    Sad: {
      keywords: [
        'sad', 'depressed', 'lonely', 'hopeless', 'crying', 'tears',
        'miserable', 'heartbroken', 'grief', 'sorrow', 'unhappy',
        'melancholy', 'down', 'blue', 'gloomy'
      ],
      weight: 0
    },
    Anxious: {
      keywords: [
        'anxious', 'anxiety', 'worried', 'nervous', 'panic', 'stress',
        'overwhelmed', 'scared', 'fear', 'afraid', 'tense', 'uneasy',
        'restless', 'pressure', 'exam', 'deadline', 'uncertain'
      ],
      weight: 0
    },
    Angry: {
      keywords: [
        'angry', 'furious', 'mad', 'rage', 'hate', 'annoyed',
        'irritated', 'frustrated', 'infuriated', 'outraged', 'pissed',
        'bitter', 'resentful', 'hostile'
      ],
      weight: 0
    },
    Happy: {
      keywords: [
        'happy', 'joy', 'excited', 'amazing', 'wonderful', 'great',
        'excellent', 'love', 'blessed', 'grateful', 'thrilled',
        'delighted', 'cheerful', 'pleased', 'glad', 'fantastic',
        'awesome', 'celebration', 'celebrate'
      ],
      weight: 0
    },
    Neutral: {
      keywords: [],
      weight: 0
    }
  };

  // Calculate weights based on keyword matches
  const words = lowerText.split(/\s+/);
  
  // Check for negation patterns that might flip sentiment
  const hasNegation = /\b(not|no|never|neither|nor|none|nobody|nothing|n't)\b/i.test(lowerText);
  
  for (const [emotion, config] of Object.entries(emotionKeywords)) {
    if (emotion === 'Neutral') continue;
    
    for (const keyword of config.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerText)) {
        config.weight += 1;
        
        // Check if keyword appears multiple times
        const matches = lowerText.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
        if (matches && matches.length > 1) {
          config.weight += 0.5 * (matches.length - 1);
        }
      }
    }
  }

  // Handle negation - if we have negation and Happy keywords, reduce positivity and boost concern
  if (hasNegation && emotionKeywords.Happy.weight > 0) {
    emotionKeywords.Happy.weight *= 0.2;
    emotionKeywords.Sad.weight += 0.7;
    emotionKeywords.Anxious.weight += 0.4;
  }

  // Find emotion with highest weight
  let maxEmotion: EmotionType = 'Neutral';
  let maxWeight = 0;

  for (const [emotion, config] of Object.entries(emotionKeywords)) {
    if (config.weight > maxWeight) {
      maxWeight = config.weight;
      maxEmotion = emotion as EmotionType;
    }
  }

  // Calculate confidence based on weight and text length
  const totalWords = words.length;
  const confidence = maxWeight > 0 
    ? Math.min(0.85, 0.3 + (maxWeight / Math.max(totalWords / 10, 1)) * 0.55)
    : 0.3;

  return {
    emotion: maxEmotion,
    confidence: Number(confidence.toFixed(2)),
    source: 'offline'
  };
};

/**
 * Map HuggingFace emotion labels to our EmotionType buckets
 */
const mapHFLabelToEmotion = (label: string): EmotionType => {
  const normalizedLabel = label.toLowerCase();
  
  // j-hartmann/emotion-english-distilroberta-base returns:
  // anger, disgust, fear, joy, neutral, sadness, surprise
  if (normalizedLabel.includes('joy') || normalizedLabel.includes('surprise')) {
    return 'Happy';
  }
  if (normalizedLabel.includes('sadness') || normalizedLabel.includes('disgust')) {
    return 'Sad';
  }
  if (normalizedLabel.includes('fear')) {
    return 'Anxious';
  }
  if (normalizedLabel.includes('anger')) {
    return 'Angry';
  }
  
  return 'Neutral';
};

/**
 * Parse HuggingFace API response and classify into emotion buckets
 */
const parseHFResponse = (hfLabels: HuggingFaceLabel[]): EmotionAnalysisResult => {
  if (!hfLabels || hfLabels.length === 0) {
    return {
      emotion: 'Neutral',
      confidence: 0.5,
      source: 'api'
    };
  }

  // Aggregate scores by our emotion buckets
  const emotionScores: Record<EmotionType, number> = {
    Sad: 0,
    Anxious: 0,
    Angry: 0,
    Happy: 0,
    Neutral: 0
  };

  for (const label of hfLabels) {
    const emotion = mapHFLabelToEmotion(label.label);
    emotionScores[emotion] += label.score;
  }

  // Find emotion with highest score
  let maxEmotion: EmotionType = 'Neutral';
  let maxScore = 0;

  for (const [emotion, score] of Object.entries(emotionScores)) {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion as EmotionType;
    }
  }

  // Apply classification threshold
  const CONFIDENCE_THRESHOLD = 0.3;
  if (maxScore < CONFIDENCE_THRESHOLD) {
    maxEmotion = 'Neutral';
  }

  return {
    emotion: maxEmotion,
    confidence: Number(maxScore.toFixed(2)),
    source: 'api'
  };
};

/**
 * Call HuggingFace Inference API for emotion analysis
 */
const callHuggingFaceAPI = async (text: string): Promise<EmotionAnalysisResult> => {
  try {
    // Check throttling
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < THROTTLE_MS) {
      // Return offline result if throttled
      return offlineEmotionDetection(text);
    }

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HF_API_TOKEN ? { 'Authorization': `Bearer ${HF_API_TOKEN}` } : {})
      },
      body: JSON.stringify({ inputs: text })
    });

    lastApiCallTime = Date.now();

    if (!response.ok) {
      // Fallback to offline on API error
      return offlineEmotionDetection(text);
    }

    const data = await response.json();
    
    // HuggingFace returns array of label objects or nested array
    const labels = Array.isArray(data) 
      ? (Array.isArray(data[0]) ? data[0] : data)
      : [];

    return parseHFResponse(labels as HuggingFaceLabel[]);
  } catch {
    // Fallback to offline on network error
    return offlineEmotionDetection(text);
  }
};

/**
 * Get emotion from cache or generate cache key
 */
const getCacheKey = (text: string): string => {
  // Normalize text for cache key
  return text.toLowerCase().trim().slice(0, 500);
};

/**
 * Clean expired cache entries
 */
const cleanCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
};

/**
 * Main emotion analysis function with caching and fallback
 * 
 * @param text - Text to analyze
 * @param options - Optional configuration
 * @returns Promise resolving to emotion analysis result
 */
export const analyzeEmotion = async (
  text: string,
  options?: {
    useOfflineOnly?: boolean;
    manualOverride?: EmotionType;
  }
): Promise<EmotionAnalysisResult> => {
  // Handle manual override
  if (options?.manualOverride) {
    return {
      emotion: options.manualOverride,
      confidence: 1.0,
      source: 'manual'
    };
  }

  const normalizedText = typeof text === 'string' ? text.trim() : '';

  // Empty input defaults to neutral
  if (!normalizedText) {
    return {
      emotion: 'Neutral',
      confidence: 0.5,
      source: 'offline'
    };
  }

  // Very short input - run offline heuristic but clamp confidence
  if (normalizedText.length < MIN_TEXT_LENGTH) {
    const fallback = offlineEmotionDetection(normalizedText);
    return {
      ...fallback,
      confidence: Number(Math.min(fallback.confidence, 0.5).toFixed(2)),
    };
  }

  // Check cache
  const cacheKey = getCacheKey(normalizedText);
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
    return cachedEntry.result;
  }

  // Determine if we should use offline or API
  let result: EmotionAnalysisResult;
  
  if (options?.useOfflineOnly || !HF_API_URL) {
    result = offlineEmotionDetection(normalizedText);
  } else {
    result = await callHuggingFaceAPI(normalizedText);
  }

  // Cache result
  cache.set(cacheKey, {
    text: cacheKey,
    result,
    timestamp: Date.now()
  });

  // Clean old cache entries periodically
  if (cache.size > 100) {
    cleanCache();
  }

  return result;
};

/**
 * Clear emotion analysis cache (useful for testing)
 */
export const clearEmotionCache = (): void => {
  cache.clear();
  lastApiCallTime = 0;
};

/**
 * Get cache statistics (useful for testing)
 */
export const getCacheStats = () => ({
  size: cache.size,
  entries: Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    emotion: entry.result.emotion,
    source: entry.result.source,
    age: Date.now() - entry.timestamp
  }))
});
