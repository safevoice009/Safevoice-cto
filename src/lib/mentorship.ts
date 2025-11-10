// Mentorship module - Mentor-mentee matching with topic taxonomy, availability, and reputation scoring

// Topic taxonomy for mentorship
export type MentorshipTopic =
  | 'anxiety'
  | 'depression'
  | 'stress_management'
  | 'academic_pressure'
  | 'relationships'
  | 'career_guidance'
  | 'time_management'
  | 'self_esteem'
  | 'loneliness'
  | 'grief'
  | 'eating_concerns'
  | 'substance_use'
  | 'trauma_recovery'
  | 'identity_exploration'
  | 'family_issues'
  | 'financial_stress'
  | 'sleep_issues'
  | 'general_support';

export const MENTORSHIP_TOPICS: MentorshipTopic[] = [
  'anxiety',
  'depression',
  'stress_management',
  'academic_pressure',
  'relationships',
  'career_guidance',
  'time_management',
  'self_esteem',
  'loneliness',
  'grief',
  'eating_concerns',
  'substance_use',
  'trauma_recovery',
  'identity_exploration',
  'family_issues',
  'financial_stress',
  'sleep_issues',
  'general_support',
];

// Availability time slots
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'late_night';
export const AVAILABILITY_TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening', 'late_night'];
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface AvailabilitySchedule {
  [day: string]: TimeSlot[]; // day of week -> available time slots
}

// Mentor profile
export interface MentorProfile {
  id: string;
  studentId: string;
  displayName?: string; // Optional pseudonym
  college: string; // For college similarity matching
  topics: MentorshipTopic[];
  availability: AvailabilitySchedule;
  karma: number; // Reputation score
  streak: number; // Consecutive weeks active
  totalSessions: number;
  rating: number; // 0-5 scale
  bio?: string;
  createdAt: number;
  lastActiveAt: number;
  isActive: boolean; // Opt-out flag
  maxMentees: number; // Capacity limit
  currentMentees: string[]; // Active mentee IDs
}

// Mentee request
export interface MenteeRequest {
  id: string;
  studentId: string;
  college: string;
  topics: MentorshipTopic[];
  preferredAvailability: AvailabilitySchedule;
  urgency: 'low' | 'medium' | 'high';
  description?: string;
  createdAt: number;
  status: 'pending' | 'matched' | 'expired';
}

// Match result
export interface MentorMatch {
  id: string;
  requestId: string;
  mentorId: string;
  menteeId: string;
  score: number; // 0-100
  explanation: MatchExplanation;
  matchedAt: number;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  sessionStartedAt?: number;
  lastInteractionAt?: number;
  expiresAt?: number; // Auto-cleanup timestamp
}

// Match explanation for transparency
export interface MatchExplanation {
  topicOverlapScore: number;
  topicOverlapReason: string;
  collegeScore: number;
  collegeReason: string;
  availabilityScore: number;
  availabilityReason: string;
  reputationScore: number;
  reputationReason: string;
  totalScore: number;
  strengths: string[];
  considerations: string[];
  weights: MatchingWeights;
}

// Matching algorithm configuration
export interface MatchingWeights {
  topicOverlap: number; // 0-1, default 0.4
  collegeSimilarity: number; // 0-1, default 0.2
  availability: number; // 0-1, default 0.2
  reputation: number; // 0-1, default 0.2
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  topicOverlap: 0.4,
  collegeSimilarity: 0.2,
  availability: 0.2,
  reputation: 0.2,
};

export function normalizeWeights(weights: MatchingWeights): MatchingWeights {
  const total =
    weights.topicOverlap + weights.collegeSimilarity + weights.availability + weights.reputation;

  if (total <= 0) {
    return { ...DEFAULT_MATCHING_WEIGHTS };
  }

  return {
    topicOverlap: weights.topicOverlap / total,
    collegeSimilarity: weights.collegeSimilarity / total,
    availability: weights.availability / total,
    reputation: weights.reputation / total,
  };
}

// Inactive session cleanup threshold (30 days)
export const INACTIVE_SESSION_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

// Calculate topic overlap score
function calculateTopicOverlap(mentorTopics: MentorshipTopic[], menteeTopics: MentorshipTopic[]): number {
  if (menteeTopics.length === 0) return 0;
  
  const mentorSet = new Set(mentorTopics);
  const overlapCount = menteeTopics.filter((topic) => mentorSet.has(topic)).length;
  
  return overlapCount / menteeTopics.length;
}

// Calculate availability overlap score
function calculateAvailabilityOverlap(
  mentorAvailability: AvailabilitySchedule,
  menteeAvailability: AvailabilitySchedule
): number {
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  let totalSlots = 0;
  let matchingSlots = 0;
  
  for (const day of days) {
    const menteeSlots = menteeAvailability[day] || [];
    if (menteeSlots.length === 0) continue;
    
    const mentorSlots = new Set(mentorAvailability[day] || []);
    totalSlots += menteeSlots.length;
    
    for (const slot of menteeSlots) {
      if (mentorSlots.has(slot)) {
        matchingSlots += 1;
      }
    }
  }
  
  return totalSlots === 0 ? 0 : matchingSlots / totalSlots;
}

// Calculate college similarity score
function calculateCollegeSimilarity(mentorCollege: string, menteeCollege: string): number {
  return mentorCollege.toLowerCase().trim() === menteeCollege.toLowerCase().trim() ? 1 : 0;
}

// Calculate reputation score (normalized 0-1)
function calculateReputationScore(mentor: MentorProfile): number {
  // Normalize karma (assume 0-1000 range)
  const karmaScore = Math.min(mentor.karma, 1000) / 1000;
  
  // Normalize rating (0-5 scale)
  const ratingScore = mentor.rating / 5;
  
  // Normalize streak (assume 0-52 weeks range)
  const streakScore = Math.min(mentor.streak, 52) / 52;
  
  // Weighted combination
  return (karmaScore * 0.4) + (ratingScore * 0.4) + (streakScore * 0.2);
}

// Generate match explanation
function generateMatchExplanation(
  mentor: MentorProfile,
  mentee: MenteeRequest,
  topicOverlap: number,
  collegeMatch: number,
  availabilityOverlap: number,
  reputationScore: number,
  weights: MatchingWeights
): MatchExplanation {
  const topicOverlapScore = topicOverlap * weights.topicOverlap * 100;
  const collegeScore = collegeMatch * weights.collegeSimilarity * 100;
  const availabilityScore = availabilityOverlap * weights.availability * 100;
  const reputationScoreWeighted = reputationScore * weights.reputation * 100;
  const totalScore = topicOverlapScore + collegeScore + availabilityScore + reputationScoreWeighted;
  
  const strengths: string[] = [];
  const considerations: string[] = [];
  
  // Topic overlap analysis
  const mentorSet = new Set(mentor.topics);
  const matchedTopics = mentee.topics.filter((t) => mentorSet.has(t));
  const topicOverlapReason = matchedTopics.length > 0
    ? `${matchedTopics.length} shared topic(s): ${matchedTopics.join(', ')}`
    : 'No topic overlap';
  
  if (topicOverlap >= 0.7) {
    strengths.push('Strong topic alignment');
  } else if (topicOverlap < 0.3) {
    considerations.push('Limited topic overlap');
  }
  
  // College similarity analysis
  const collegeReason = collegeMatch === 1
    ? `Same college: ${mentor.college}`
    : `Different colleges: ${mentor.college} vs ${mentee.college}`;
  
  if (collegeMatch === 1) {
    strengths.push('Same college connection');
  }
  
  // Availability analysis
  const availabilityReason = availabilityOverlap >= 0.5
    ? `${Math.round(availabilityOverlap * 100)}% schedule compatibility`
    : `Limited schedule overlap (${Math.round(availabilityOverlap * 100)}%)`;
  
  if (availabilityOverlap >= 0.5) {
    strengths.push('Good schedule compatibility');
  } else if (availabilityOverlap < 0.2) {
    considerations.push('Scheduling may be challenging');
  }
  
  // Reputation analysis
  const reputationReason = `Karma: ${mentor.karma}, Rating: ${mentor.rating.toFixed(1)}/5, Streak: ${mentor.streak} weeks`;
  
  if (mentor.rating >= 4.5 && mentor.karma >= 500) {
    strengths.push('Highly experienced mentor');
  } else if (mentor.rating < 3.0 || mentor.karma < 100) {
    considerations.push('Developing mentor experience');
  }
  
  return {
    topicOverlapScore,
    topicOverlapReason,
    collegeScore,
    collegeReason,
    availabilityScore,
    availabilityReason,
    reputationScore: reputationScoreWeighted,
    reputationReason,
    totalScore,
    strengths,
    considerations,
    weights,
  };
}

// Main matching algorithm
export function findBestMentorMatch(
  mentee: MenteeRequest,
  availableMentors: MentorProfile[],
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS
): { mentor: MentorProfile; score: number; explanation: MatchExplanation } | null {
  // Normalize weights to ensure they sum to 1
  const normalizedWeights = normalizeWeights(weights);
  
  // Filter out inactive mentors and those at capacity
  const eligibleMentors = availableMentors.filter(
    (mentor) => mentor.isActive && mentor.currentMentees.length < mentor.maxMentees
  );
  
  if (eligibleMentors.length === 0) {
    return null;
  }
  
  // Calculate scores for all eligible mentors
  const scoredMentors = eligibleMentors.map((mentor) => {
    const topicOverlap = calculateTopicOverlap(mentor.topics, mentee.topics);
    const collegeMatch = calculateCollegeSimilarity(mentor.college, mentee.college);
    const availabilityOverlap = calculateAvailabilityOverlap(mentor.availability, mentee.preferredAvailability);
    const reputationScore = calculateReputationScore(mentor);
    
    // Calculate weighted score (0-1)
    const rawScore =
      topicOverlap * normalizedWeights.topicOverlap +
      collegeMatch * normalizedWeights.collegeSimilarity +
      availabilityOverlap * normalizedWeights.availability +
      reputationScore * normalizedWeights.reputation;
    const score = Number((rawScore * 100).toFixed(2));
    
    const explanation = generateMatchExplanation(
      mentor,
      mentee,
      topicOverlap,
      collegeMatch,
      availabilityOverlap,
      reputationScore,
      normalizedWeights
    );
    
    return { mentor, rawScore, score, explanation };
  });
  
  // Sort by score (descending), then by karma for tie-breaking
  scoredMentors.sort((a, b) => {
    if (Math.abs(b.rawScore - a.rawScore) > 0.001) {
      return b.rawScore - a.rawScore;
    }
    // Tie-breaking: prefer higher karma
    if (b.mentor.karma !== a.mentor.karma) {
      return b.mentor.karma - a.mentor.karma;
    }
    // Further tie-breaking: prefer higher rating
    if (b.mentor.rating !== a.mentor.rating) {
      return b.mentor.rating - a.mentor.rating;
    }
    // Final tie-breaking: prefer more recent activity
    return b.mentor.lastActiveAt - a.mentor.lastActiveAt;
  });
  
  return {
    mentor: scoredMentors[0].mentor,
    score: scoredMentors[0].score,
    explanation: scoredMentors[0].explanation,
  };
}

// Find matches for multiple mentees in a batch
export function batchMatchMentees(
  mentees: MenteeRequest[],
  availableMentors: MentorProfile[],
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS
): Array<{ mentee: MenteeRequest; match: { mentor: MentorProfile; score: number; explanation: MatchExplanation } | null }> {
  // Sort mentees by urgency (high -> medium -> low)
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  const sortedMentees = [...mentees].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  
  const results: Array<{
    mentee: MenteeRequest;
    match: { mentor: MentorProfile; score: number; explanation: MatchExplanation } | null;
  }> = [];
  
  // Track mentor capacity during batch processing
  const mentorCapacity = new Map<string, number>();
  availableMentors.forEach((mentor) => {
    mentorCapacity.set(mentor.id, mentor.maxMentees - mentor.currentMentees.length);
  });
  
  for (const mentee of sortedMentees) {
    // Filter mentors with remaining capacity
    const availableForThis = availableMentors.filter((mentor) => {
      const remaining = mentorCapacity.get(mentor.id) || 0;
      return mentor.isActive && remaining > 0;
    });
    
    const match = findBestMentorMatch(mentee, availableForThis, weights);
    
    if (match) {
      // Decrement capacity
      const current = mentorCapacity.get(match.mentor.id) || 0;
      mentorCapacity.set(match.mentor.id, current - 1);
    }
    
    results.push({ mentee, match });
  }
  
  return results;
}

// Check if a match is inactive and should be cleaned up
export function shouldCleanupMatch(match: MentorMatch, now: number = Date.now()): boolean {
  if (match.status !== 'active') {
    return false;
  }
  
  const lastActivity = match.lastInteractionAt || match.sessionStartedAt || match.matchedAt;
  return now - lastActivity > INACTIVE_SESSION_THRESHOLD_MS;
}

// Create a new mentor profile
export function createMentorProfile(
  studentId: string,
  college: string,
  topics: MentorshipTopic[],
  availability: AvailabilitySchedule,
  displayName?: string,
  bio?: string
): MentorProfile {
  return {
    id: crypto.randomUUID(),
    studentId,
    displayName,
    college,
    topics,
    availability,
    karma: 0,
    streak: 0,
    totalSessions: 0,
    rating: 0,
    bio,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    isActive: true,
    maxMentees: 5,
    currentMentees: [],
  };
}

// Create a new mentee request
export function createMenteeRequest(
  studentId: string,
  college: string,
  topics: MentorshipTopic[],
  preferredAvailability: AvailabilitySchedule,
  urgency: 'low' | 'medium' | 'high' = 'medium',
  description?: string
): MenteeRequest {
  return {
    id: crypto.randomUUID(),
    studentId,
    college,
    topics,
    preferredAvailability,
    urgency,
    description,
    createdAt: Date.now(),
    status: 'pending',
  };
}

// Create a match record
export function createMentorMatch(
  requestId: string,
  mentorId: string,
  menteeId: string,
  score: number,
  explanation: MatchExplanation
): MentorMatch {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    requestId,
    mentorId,
    menteeId,
    score,
    explanation,
    matchedAt: now,
    status: 'active',
    sessionStartedAt: now,
    lastInteractionAt: now,
    expiresAt: now + INACTIVE_SESSION_THRESHOLD_MS,
  };
}

// Cleanup expired matches
export function cleanupInactiveMatches(matches: MentorMatch[]): {
  active: MentorMatch[];
  cleaned: MentorMatch[];
} {
  const now = Date.now();
  const active: MentorMatch[] = [];
  const cleaned: MentorMatch[] = [];

  for (const match of matches) {
    if (shouldCleanupMatch(match, now)) {
      cleaned.push({ ...match, status: 'expired' });
    } else {
      active.push(match);
    }
  }

  return { active, cleaned };
}

// Mentor review
export interface MentorReview {
  id: string;
  matchId: string;
  mentorId: string;
  menteeId: string;
  rating: number; // 1-5 scale
  feedback?: string;
  submittedAt: number;
}

// Mentor aggregate review data
export interface MentorReviewSummary {
  mentorId: string;
  averageRating: number;
  totalReviews: number;
  recentReviews: MentorReview[];
}

// Create a new mentor review
export function createMentorReview(
  matchId: string,
  mentorId: string,
  menteeId: string,
  rating: number,
  feedback?: string
): MentorReview {
  // Validate rating is between 1 and 5
  const validatedRating = Math.max(1, Math.min(5, rating));
  
  return {
    id: crypto.randomUUID(),
    matchId,
    mentorId,
    menteeId,
    rating: validatedRating,
    feedback: feedback?.trim(),
    submittedAt: Date.now(),
  };
}

// Calculate aggregate review statistics for a mentor
export function calculateMentorReviewSummary(
  mentorId: string,
  reviews: MentorReview[]
): MentorReviewSummary {
  const mentorReviews = reviews.filter((r) => r.mentorId === mentorId);
  
  const averageRating = mentorReviews.length > 0
    ? mentorReviews.reduce((sum, r) => sum + r.rating, 0) / mentorReviews.length
    : 0;
  
  // Get most recent 3 reviews
  const recentReviews = mentorReviews
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .slice(0, 3);
  
  return {
    mentorId,
    averageRating: Number(averageRating.toFixed(2)),
    totalReviews: mentorReviews.length,
    recentReviews,
  };
}
