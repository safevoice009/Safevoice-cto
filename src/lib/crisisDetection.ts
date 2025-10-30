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

export function detectCrisis(text: string): boolean {
  if (!text) return false;

  const lower = text.toLowerCase();
  const hasKeyword = crisisKeywords.some((keyword) => lower.includes(keyword.toLowerCase()));
  const matchesPattern = crisisPatterns.some((pattern) => pattern.test(text));

  return hasKeyword || matchesPattern;
}

export function getCrisisSeverity(text: string): 'high' | 'critical' {
  const criticalWords = ['tonight', 'today', 'now', 'plan', 'ready'];
  const lower = text.toLowerCase();
  const hasCritical = criticalWords.some((word) => lower.includes(word));

  return hasCritical ? 'critical' : 'high';
}
