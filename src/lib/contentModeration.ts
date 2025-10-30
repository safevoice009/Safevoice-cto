import { detectCrisis } from './crisisDetection';

const profanityList = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'madarchod',
  'behenchod',
  'chutiya',
  'randi',
  'gaandu',
];

function containsProfanity(text: string): boolean {
  const lowercased = text.toLowerCase();
  return profanityList.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowercased);
  });
}

interface PersonalInfoResult {
  detected: boolean;
  type?: string;
}

function containsPersonalInfo(text: string): PersonalInfoResult {
  const patterns: Record<string, RegExp> = {
    phone: /(\+91|0)?[6-9]\d{9}/,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    address: /\b\d+\s+[\w\s]+(?:street|road|st|rd|avenue|ave|lane|ln)\b/i,
    aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/,
    pan: /\b[A-Z]{5}\d{4}[A-Z]\b/,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return { detected: true, type };
    }
  }

  return { detected: false };
}

interface UserPost {
  content: string;
  createdAt: number;
}

function similarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

function isSpam(text: string, userPosts: UserPost[]): boolean {
  const recentPosts = userPosts.slice(0, 5);
  const isDuplicate = recentPosts.some((post) => similarity(post.content, text) > 0.8);

  const urlCount = (text.match(/https?:\/\/\S+/g) || []).length;
  const hasExcessiveUrls = urlCount > 3;

  const isAllCaps = text === text.toUpperCase() && text.length > 20;

  const hasRepeatedChars = /(.)\1{5,}/.test(text);

  return isDuplicate || hasExcessiveUrls || isAllCaps || hasRepeatedChars;
}

const harassmentKeywords = [
  'hate you',
  'kill yourself',
  'kys',
  'loser',
  'worthless piece',
  'ugly',
  'stupid',
  'retard',
  'psycho',
  'crazy',
  'fat',
  'slut',
  'whore',
];

function containsHarassment(text: string): boolean {
  const lowercased = text.toLowerCase();

  const hasKeyword = harassmentKeywords.some((keyword) => lowercased.includes(keyword));

  const hasMentionedInsult =
    /@Student#\d+/.test(text) && /(stupid|idiot|loser|hate|ugly)/.test(lowercased);

  return hasKeyword || hasMentionedInsult;
}

interface ModerationIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'support' | 'blur' | 'flag';
  message: string;
}

interface ModerationContext {
  userPosts?: UserPost[];
}

interface ModerationResult {
  allowed: boolean;
  blocked: boolean;
  reason?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  action?: 'block' | 'support' | 'blur' | 'flag';
  issues?: ModerationIssue[];
  needsReview?: boolean;
}

export async function moderateContent(
  content: string,
  context: ModerationContext = {}
): Promise<ModerationResult> {
  const issues: ModerationIssue[] = [];

  // 1. Personal Info (BLOCKING)
  const personalInfo = containsPersonalInfo(content);
  if (personalInfo.detected) {
    return {
      allowed: false,
      blocked: true,
      reason: `⚠️ Personal information detected (${personalInfo.type}). For your safety, please remove phone numbers, emails, or addresses.`,
      severity: 'critical',
      action: 'block',
    };
  }

  // 2. Spam (BLOCKING)
  if (isSpam(content, context.userPosts || [])) {
    return {
      allowed: false,
      blocked: true,
      reason: '🚫 This looks like spam. Please post unique, meaningful content.',
      severity: 'high',
      action: 'block',
    };
  }

  // 3. Crisis Detection (WARNING, NOT BLOCKING)
  if (detectCrisis(content)) {
    issues.push({
      type: 'crisis',
      severity: 'critical',
      action: 'support',
      message: 'Crisis keywords detected. Support resources will be shown.',
    });
  }

  // 4. Profanity (WARNING)
  if (containsProfanity(content)) {
    issues.push({
      type: 'profanity',
      severity: 'medium',
      action: 'blur',
      message: 'Profanity detected. Post will be blurred by default.',
    });
  }

  // 5. Harassment (WARNING + REPORTABLE)
  if (containsHarassment(content)) {
    issues.push({
      type: 'harassment',
      severity: 'high',
      action: 'flag',
      message: 'Potential harassment detected. Post may be reviewed.',
    });
  }

  return {
    allowed: true,
    blocked: false,
    issues,
    needsReview: issues.some((i) => i.severity === 'high'),
  };
}
