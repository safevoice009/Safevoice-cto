import { crisisModelLoader, type GraphModel } from './crisisAI/CrisisModelLoader';

const crisisKeywords = [
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  'take my life',
  'want to die',
  'better off dead',
  'no reason to live',
  'worthless',
  'hang myself',
  'jump off',
  'overdose',
  'slit my wrist',
  "can't go on",
  'no way out',
  'give up',
  'nothing left',
  'end it all',
  'goodbye cruel world',
  'final message',
  'marna chahta hun',
  'zindagi se thak gaya',
  'khatam karna chahta hun',
];

const crisisPatterns = [
  /\b(want|going) to (kill|hurt) myself\b/i,
  /\bsuicide (plan|note|method)\b/i,
  /\bno (point|reason) (living|life)\b/i,
  /\beveryone (better off|happier) without me\b/i,
];

interface CrisisDetectionResult {
  isCrisis: boolean;
  method: 'ai_model' | 'keyword_pattern';
  confidence?: number;
  severity?: 'high' | 'critical';
}

let isAiModelReady = false;
let cachedModel: GraphModel | null = null;

/**
 * Initialize AI model for crisis detection
 */
export async function initializeCrisisModel(): Promise<boolean> {
  try {
    const result = await crisisModelLoader.ensureModelReady();
    
    if (result.success && result.model) {
      cachedModel = result.model;
      isAiModelReady = true;
      console.log('AI model initialized successfully for crisis detection');
      return true;
    } else {
      console.warn('AI model failed to load, falling back to keyword detection:', result.error);
      return false;
    }
  } catch (error) {
    console.warn('Failed to initialize AI crisis model:', error);
    return false;
  }
}

/**
 * Get current model readiness status
 */
export function isCrisisModelReady(): boolean {
  return isAiModelReady && cachedModel !== null;
}

/**
 * AI-based crisis detection using TensorFlow.js model
 */
async function detectCrisisWithAI(text: string): Promise<{ isCrisis: boolean; confidence: number } | null> {
  if (!cachedModel || !isAiModelReady) {
    return null;
  }

  try {
    // Tokenize and preprocess text for the model
    const tokens = tokenizeText(text);
    const inputTensor = await preprocessForModel(tokens);
    
    // Run inference
    const prediction = cachedModel.predict(inputTensor) as { dispose: () => void; dataSync: () => Float32Array };
    
    // Clean up tensors to prevent memory leaks
    inputTensor.dispose();
    prediction.dispose();

    const crisisProbability = prediction.dataSync()[1]; // Assuming binary classification
    
    return {
      isCrisis: crisisProbability > 0.7, // Threshold for crisis detection
      confidence: crisisProbability
    };
  } catch (error) {
    console.warn('AI model inference failed:', error);
    return null;
  }
}

/**
 * Tokenize text for AI model input
 */
function tokenizeText(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Preprocess tokens for TensorFlow.js model
 */
async function preprocessForModel(tokens: string[]): Promise<{ dispose: () => void; dataSync: () => number[] }> {
  // Import TensorFlow.js dynamically to avoid circular dependencies
  // In a real implementation, this would use the actual model vocabulary
  // and create proper embeddings/tensors
  
  try {
    const tf = await import('@tensorflow/tfjs') as unknown as { tensor: (data: number[], shape: number[]) => { dispose: () => void; dataSync: () => Float32Array } };
    
    // Simplified tokenization - in practice, this would be vocabulary-based
    const maxLength = 100;
    const tokenIds = new Array(maxLength).fill(0); // Padding tokens
    
    // Convert first maxLength tokens to simple hash-based IDs
    tokens.slice(0, maxLength).forEach((token, index) => {
      // Simple hash function for token ID generation
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      // Ensure positive ID and map to reasonable vocabulary size
      tokenIds[index] = Math.abs(hash) % 10000 + 1; // Reserve 0 for padding
    });
    
    // Create tensor for model input
    return tf.tensor([tokenIds], [1, maxLength]) as { dispose: () => void; dataSync: () => Float32Array };
  } catch (error) {
    // If TensorFlow.js is not available, return a mock tensor-like object
    console.warn('TensorFlow.js not available for preprocessing:', error);
    return { dispose: () => {}, dataSync: () => new Float32Array([0.1, 0.9]) }; // Mock binary classification
  }
}

/**
 * Keyword-based crisis detection (fallback method)
 */
function detectCrisisWithKeywords(text: string): { isCrisis: boolean; confidence: number } {
  if (!text) {
    return { isCrisis: false, confidence: 0 };
  }

  const lower = text.toLowerCase();
  
  // Check for exact keyword matches
  let keywordScore = 0;
  const keywordMatches = crisisKeywords.filter(keyword => 
    lower.includes(keyword.toLowerCase())
  );
  keywordScore += keywordMatches.length * 0.3;

  // Check for pattern matches
  let patternScore = 0;
  const patternMatches = crisisPatterns.filter(pattern => pattern.test(text));
  patternScore += patternMatches.length * 0.5;

  // Add severity modifiers
  const severityWords = ['tonight', 'today', 'now', 'plan', 'ready'];
  const hasUrgency = severityWords.some(word => lower.includes(word));
  
  if (hasUrgency) {
    keywordScore += 0.2;
    patternScore += 0.3;
  }

  const confidence = Math.min(keywordScore + patternScore, 1.0);
  const isCrisis = confidence > 0.5;

  return { isCrisis, confidence };
}

/**
 * Main crisis detection function
 * Uses AI model when available, falls back to keyword detection
 */
export async function detectCrisis(text: string): Promise<CrisisDetectionResult> {
  if (!text || text.trim().length === 0) {
    return {
      isCrisis: false,
      method: 'keyword_pattern',
      confidence: 0,
      severity: 'high'
    };
  }

  // Try AI-based detection first
  const aiResult = await detectCrisisWithAI(text);
  if (aiResult) {
    return {
      isCrisis: aiResult.isCrisis,
      method: 'ai_model',
      confidence: aiResult.confidence,
      severity: aiResult.isCrisis ? 'critical' : 'high'
    };
  }

  // Fallback to keyword detection
  const keywordResult = detectCrisisWithKeywords(text);
  const severity = getCrisisSeverity(text);
  
  return {
    isCrisis: keywordResult.isCrisis,
    method: 'keyword_pattern',
    confidence: keywordResult.confidence,
    severity
  };
}

/**
 * Determine crisis severity based on text content
 */
export function getCrisisSeverity(text: string): 'high' | 'critical' {
  const criticalWords = ['tonight', 'today', 'now', 'plan', 'ready'];
  const lower = text.toLowerCase();
  const hasCritical = criticalWords.some((word) => lower.includes(word));

  return hasCritical ? 'critical' : 'high';
}