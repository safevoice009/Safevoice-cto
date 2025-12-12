import { classify as classifyWithModel, shouldEscalate as shouldEscalateWithModel, load as loadModel } from './crisisAI/CrisisDetectionModel';

// Fallback keyword list for when model is unavailable
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

/**
 * Keyword-based crisis detection (fallback)
 */
function detectCrisisKeywordFallback(text: string): boolean {
  if (!text) return false;

  const lower = text.toLowerCase();
  const hasKeyword = crisisKeywords.some((keyword) => lower.includes(keyword.toLowerCase()));
  const matchesPattern = crisisPatterns.some((pattern) => pattern.test(text));

  return hasKeyword || matchesPattern;
}

/**
 * Synchronous crisis detection (keyword-based only)
 * Used for quick checks in moderation pipeline
 * Async model-based version available via classifyCrisis()
 * @param text - Post content to analyze
 * @returns true if keywords indicate crisis
 */
export function detectCrisisSync(text: string): boolean {
  return detectCrisisKeywordFallback(text);
}

/**
 * Detect crisis using AI model with keyword fallback
 * Uses the pre-trained model if loaded, falls back to keyword heuristics
 * @param text - Post content to analyze
 * @param threshold - Probability threshold for escalation (default 0.7)
 * @returns true if crisis detected and should escalate
 */
export async function detectCrisis(text: string, threshold: number = 0.7): Promise<boolean> {
  if (!text) return false;
  
  try {
    // Attempt to use AI model if available
    return await shouldEscalateWithModel(text, threshold);
  } catch (error) {
    console.warn('[crisisDetection] Model inference failed, using keyword fallback:', error);
    // Fall back to keyword-based detection
    return detectCrisisKeywordFallback(text);
  }
}

/**
 * Classify crisis with probability scores
 * Returns classification result with probability, keywords, and critical flags
 */
export async function classifyCrisis(text: string): Promise<{
  probability: number;
  keywords: string[];
  isCritical: boolean;
  shouldEscalate: boolean;
}> {
  if (!text) {
    return {
      probability: 0,
      keywords: [],
      isCritical: false,
      shouldEscalate: false,
    };
  }
  
  try {
    // Ensure model is loaded
    await loadModel();
    // Use AI model classification
    return await classifyWithModel(text);
  } catch (error) {
    console.warn('[crisisDetection] Model classification failed, using keyword fallback:', error);
    
    // Fallback: keyword-based classification
    const lower = text.toLowerCase();
    const matchedKeywords = crisisKeywords.filter(k => lower.includes(k.toLowerCase()));
    const probability = detectCrisisKeywordFallback(text) ? 0.75 : 0;
    
    return {
      probability,
      keywords: matchedKeywords,
      isCritical: probability > 0 && /tonight|today|now|plan|ready/i.test(text),
      shouldEscalate: probability > 0.7,
    };
  }
}

/**
 * Get crisis severity level
 * @deprecated Use classifyCrisis() instead for full classification
 */
export function getCrisisSeverity(text: string): 'high' | 'critical' {
  const criticalWords = ['tonight', 'today', 'now', 'plan', 'ready'];
  const lower = text.toLowerCase();
  const hasCritical = criticalWords.some((word) => lower.includes(word));

  return hasCritical ? 'critical' : 'high';
}
