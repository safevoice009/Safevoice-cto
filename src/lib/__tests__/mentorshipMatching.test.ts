import { describe, it, expect } from 'vitest';
import {
  type MatchingWeights,
  type MatchExplanation,
  findBestMentorMatch,
  batchMatchMentees,
  shouldCleanupMatch,
  createMentorProfile,
  createMenteeRequest,
  createMentorMatch,
  normalizeWeights,
  DEFAULT_MATCHING_WEIGHTS,
} from '../mentorship';

const createExplanation = (): MatchExplanation => ({
  topicOverlapScore: 0,
  topicOverlapReason: '',
  collegeScore: 0,
  collegeReason: '',
  availabilityScore: 0,
  availabilityReason: '',
  reputationScore: 0,
  reputationReason: '',
  totalScore: 0,
  strengths: [],
  considerations: [],
  weights: DEFAULT_MATCHING_WEIGHTS,
});

describe('Mentorship Matching', () => {
  describe('normalizeWeights', () => {
    it('should return default weights if total is zero', () => {
      const weights: MatchingWeights = {
        topicOverlap: 0,
        collegeSimilarity: 0,
        availability: 0,
        reputation: 0,
      };
      
      const normalized = normalizeWeights(weights);
      expect(normalized).toEqual(DEFAULT_MATCHING_WEIGHTS);
    });

    it('should normalize weights to sum to 1', () => {
      const weights: MatchingWeights = {
        topicOverlap: 2,
        collegeSimilarity: 2,
        availability: 2,
        reputation: 2,
      };
      
      const normalized = normalizeWeights(weights);
      expect(normalized.topicOverlap).toBe(0.25);
      expect(normalized.collegeSimilarity).toBe(0.25);
      expect(normalized.availability).toBe(0.25);
      expect(normalized.reputation).toBe(0.25);
    });

    it('should handle uneven weights', () => {
      const weights: MatchingWeights = {
        topicOverlap: 6,
        collegeSimilarity: 2,
        availability: 1,
        reputation: 1,
      };
      
      const normalized = normalizeWeights(weights);
      expect(normalized.topicOverlap).toBe(0.6);
      expect(normalized.collegeSimilarity).toBe(0.2);
      expect(normalized.availability).toBe(0.1);
      expect(normalized.reputation).toBe(0.1);
    });
  });

  describe('findBestMentorMatch - Topic Overlap Scoring', () => {
    it('should prefer mentor with more topic overlap', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety', 'depression', 'academic_pressure'],
        { monday: ['morning'], tuesday: ['afternoon'] }
      );

      const mentor1 = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor1.karma = 500;
      mentor1.rating = 4.5;
      mentor1.streak = 10;

      const mentor2 = createMentorProfile(
        'mentor2',
        'MIT',
        ['anxiety', 'depression', 'academic_pressure'],
        { monday: ['morning'] }
      );
      mentor2.karma = 500;
      mentor2.rating = 4.5;
      mentor2.streak = 10;

      const result = findBestMentorMatch(mentee, [mentor1, mentor2]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(mentor2.id);
      expect(result!.explanation.strengths).toContain('Strong topic alignment');
    });

    it('should score perfect topic match at 100 when weights are topic-only', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety', 'depression'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety', 'depression'],
        { monday: ['morning'] }
      );
      mentor.karma = 1000;
      mentor.rating = 5;
      mentor.streak = 52;

      const topicOnlyWeights: MatchingWeights = {
        topicOverlap: 1,
        collegeSimilarity: 0,
        availability: 0,
        reputation: 0,
      };

      const result = findBestMentorMatch(mentee, [mentor], topicOnlyWeights);

      expect(result).not.toBeNull();
      expect(result!.score).toBe(100);
    });

    it('should note limited topic overlap as a consideration', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety', 'depression', 'stress_management', 'academic_pressure'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['career_guidance'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.considerations).toContain('Limited topic overlap');
    });
  });

  describe('findBestMentorMatch - College Similarity', () => {
    it('should prefer same college when topics are equal', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'Harvard',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor1 = createMentorProfile(
        'mentor1',
        'Yale',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor2 = createMentorProfile(
        'mentor2',
        'Harvard',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [mentor1, mentor2]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(mentor2.id);
      expect(result!.explanation.strengths).toContain('Same college connection');
    });

    it('should be case insensitive for college matching', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'stanford',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'STANFORD',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.collegeScore).toBeGreaterThan(0);
      expect(result!.explanation.collegeReason).toContain('Same college');
    });
  });

  describe('findBestMentorMatch - Availability Overlap', () => {
    it('should prefer mentor with better schedule compatibility', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        {
          monday: ['morning', 'afternoon'],
          wednesday: ['evening'],
          friday: ['morning'],
        }
      );

      const mentor1 = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor2 = createMentorProfile(
        'mentor2',
        'MIT',
        ['anxiety'],
        {
          monday: ['morning', 'afternoon'],
          wednesday: ['evening'],
          friday: ['morning'],
        }
      );

      const result = findBestMentorMatch(mentee, [mentor1, mentor2]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(mentor2.id);
      expect(result!.explanation.strengths).toContain('Good schedule compatibility');
    });

    it('should note scheduling challenges with low overlap', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning', 'afternoon', 'evening'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { tuesday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.considerations).toContain('Scheduling may be challenging');
    });

    it('should handle empty mentee availability gracefully', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        {}
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.availabilityScore).toBe(0);
    });
  });

  describe('findBestMentorMatch - Reputation Scoring', () => {
    it('should prefer higher rated mentor when other factors are equal', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor1 = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor1.karma = 500;
      mentor1.rating = 3.5;
      mentor1.streak = 5;

      const mentor2 = createMentorProfile(
        'mentor2',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor2.karma = 500;
      mentor2.rating = 4.8;
      mentor2.streak = 5;

      const result = findBestMentorMatch(mentee, [mentor1, mentor2]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(mentor2.id);
    });

    it('should identify highly experienced mentors', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.karma = 800;
      mentor.rating = 4.7;
      mentor.streak = 20;

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.strengths).toContain('Highly experienced mentor');
    });

    it('should note developing mentor experience', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.karma = 50;
      mentor.rating = 2.5;
      mentor.streak = 1;

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.considerations).toContain('Developing mentor experience');
    });
  });

  describe('findBestMentorMatch - Tie-Breaking', () => {
    it('should break ties using karma', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor1 = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor1.karma = 300;
      mentor1.rating = 4.0;

      const mentor2 = createMentorProfile(
        'mentor2',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor2.karma = 600;
      mentor2.rating = 4.0;

      const result = findBestMentorMatch(mentee, [mentor1, mentor2]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(mentor2.id);
    });

    it('should break ties using rating when karma is equal', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor1 = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor1.karma = 500;
      mentor1.rating = 3.8;
      mentor1.streak = 5;

      const mentor2 = createMentorProfile(
        'mentor2',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor2.karma = 500;
      mentor2.rating = 4.2;
      mentor2.streak = 5;

      const result = findBestMentorMatch(mentee, [mentor1, mentor2]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(mentor2.id);
    });

    it('should break ties using last active timestamp', () => {
      const now = Date.now();
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor1 = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor1.karma = 500;
      mentor1.rating = 4.0;
      mentor1.streak = 5;
      mentor1.lastActiveAt = now - 1000000;

      const mentor2 = createMentorProfile(
        'mentor2',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor2.karma = 500;
      mentor2.rating = 4.0;
      mentor2.streak = 5;
      mentor2.lastActiveAt = now - 100;

      const result = findBestMentorMatch(mentee, [mentor1, mentor2]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(mentor2.id);
    });
  });

  describe('findBestMentorMatch - Opt-Out and Capacity', () => {
    it('should exclude inactive mentors', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const inactiveMentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      inactiveMentor.isActive = false;

      const activeMentor = createMentorProfile(
        'mentor2',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [inactiveMentor, activeMentor]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(activeMentor.id);
    });

    it('should exclude mentors at capacity', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const atCapacityMentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      atCapacityMentor.maxMentees = 5;
      atCapacityMentor.currentMentees = ['m1', 'm2', 'm3', 'm4', 'm5'];

      const availableMentor = createMentorProfile(
        'mentor2',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [atCapacityMentor, availableMentor]);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(availableMentor.id);
    });

    it('should return null when no eligible mentors', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const inactiveMentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      inactiveMentor.isActive = false;

      const result = findBestMentorMatch(mentee, [inactiveMentor]);

      expect(result).toBeNull();
    });

    it('should return null when all mentors at capacity', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 2;
      mentor.currentMentees = ['m1', 'm2'];

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).toBeNull();
    });
  });

  describe('findBestMentorMatch - Custom Weights', () => {
    it('should prioritize topics when weight is high', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety', 'depression'],
        { monday: ['morning'] }
      );

      const topicMatchMentor = createMentorProfile(
        'mentor1',
        'Yale',
        ['anxiety', 'depression'],
        { tuesday: ['evening'] }
      );
      topicMatchMentor.karma = 100;
      topicMatchMentor.rating = 2.0;

      const collegeMatchMentor = createMentorProfile(
        'mentor2',
        'MIT',
        ['career_guidance'],
        { monday: ['morning'] }
      );
      collegeMatchMentor.karma = 1000;
      collegeMatchMentor.rating = 5.0;

      const topicWeights: MatchingWeights = {
        topicOverlap: 0.9,
        collegeSimilarity: 0.05,
        availability: 0.025,
        reputation: 0.025,
      };

      const result = findBestMentorMatch(mentee, [topicMatchMentor, collegeMatchMentor], topicWeights);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(topicMatchMentor.id);
    });

    it('should prioritize reputation when weight is high', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const lowRepMentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      lowRepMentor.karma = 50;
      lowRepMentor.rating = 2.0;
      lowRepMentor.streak = 1;

      const highRepMentor = createMentorProfile(
        'mentor2',
        'Yale',
        ['career_guidance'],
        { tuesday: ['evening'] }
      );
      highRepMentor.karma = 1000;
      highRepMentor.rating = 5.0;
      highRepMentor.streak = 52;

      const repWeights: MatchingWeights = {
        topicOverlap: 0.1,
        collegeSimilarity: 0.1,
        availability: 0.1,
        reputation: 0.7,
      };

      const result = findBestMentorMatch(mentee, [lowRepMentor, highRepMentor], repWeights);

      expect(result).not.toBeNull();
      expect(result!.mentor.id).toBe(highRepMentor.id);
    });
  });

  describe('batchMatchMentees', () => {
    it('should prioritize high urgency mentees', () => {
      const highUrgency = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] },
        'high'
      );

      const lowUrgency = createMenteeRequest(
        'mentee2',
        'MIT',
        ['depression'],
        { monday: ['morning'] },
        'low'
      );

      const mentor1 = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety', 'depression'],
        { monday: ['morning'] }
      );
      mentor1.maxMentees = 1;

      const results = batchMatchMentees([lowUrgency, highUrgency], [mentor1]);

      expect(results).toHaveLength(2);
      expect(results[0].mentee.id).toBe(highUrgency.id);
      expect(results[0].match).not.toBeNull();
      expect(results[1].mentee.id).toBe(lowUrgency.id);
      expect(results[1].match).toBeNull();
    });

    it('should respect mentor capacity during batch processing', () => {
      const mentee1 = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentee2 = createMenteeRequest(
        'mentee2',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentee3 = createMenteeRequest(
        'mentee3',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 2;

      const results = batchMatchMentees([mentee1, mentee2, mentee3], [mentor]);

      expect(results).toHaveLength(3);
      const matchedCount = results.filter((r) => r.match !== null).length;
      expect(matchedCount).toBe(2);
      expect(results[2].match).toBeNull();
    });

    it('should distribute mentees across multiple mentors', () => {
      const mentee1 = createMenteeRequest('m1', 'MIT', ['anxiety'], {});
      const mentee2 = createMenteeRequest('m2', 'MIT', ['depression'], {});
      const mentee3 = createMenteeRequest('m3', 'MIT', ['anxiety'], {});

      const mentor1 = createMentorProfile('mentor1', 'MIT', ['anxiety'], {});
      mentor1.maxMentees = 2;

      const mentor2 = createMentorProfile('mentor2', 'MIT', ['depression'], {});
      mentor2.maxMentees = 2;

      const results = batchMatchMentees([mentee1, mentee2, mentee3], [mentor1, mentor2]);

      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.match !== null)).toHaveLength(3);
      expect(results[0].match!.mentor.id).toBe(mentor1.id);
      expect(results[1].match!.mentor.id).toBe(mentor2.id);
      expect(results[2].match!.mentor.id).toBe(mentor1.id);
    });
  });

  describe('shouldCleanupMatch', () => {
    it('should return false for non-active matches', () => {
      const match = createMentorMatch('req1', 'm1', 'mt1', 85, createExplanation());
      match.status = 'completed';
      match.lastInteractionAt = Date.now() - (40 * 24 * 60 * 60 * 1000);

      expect(shouldCleanupMatch(match)).toBe(false);
    });

    it('should return true for active matches older than threshold', () => {
      const match = createMentorMatch('req1', 'm1', 'mt1', 85, createExplanation());
      match.status = 'active';
      match.lastInteractionAt = Date.now() - (35 * 24 * 60 * 60 * 1000);

      expect(shouldCleanupMatch(match)).toBe(true);
    });

    it('should return false for active matches within threshold', () => {
      const match = createMentorMatch('req1', 'm1', 'mt1', 85, createExplanation());
      match.status = 'active';
      match.lastInteractionAt = Date.now() - (20 * 24 * 60 * 60 * 1000);

      expect(shouldCleanupMatch(match)).toBe(false);
    });

    it('should use sessionStartedAt if lastInteractionAt is not set', () => {
      const match = createMentorMatch('req1', 'm1', 'mt1', 85, createExplanation());
      match.status = 'active';
      match.lastInteractionAt = undefined;
      match.sessionStartedAt = Date.now() - (35 * 24 * 60 * 60 * 1000);

      expect(shouldCleanupMatch(match)).toBe(true);
    });

    it('should use matchedAt as fallback', () => {
      const match = createMentorMatch('req1', 'm1', 'mt1', 85, createExplanation());
      match.status = 'active';
      match.lastInteractionAt = undefined;
      match.sessionStartedAt = undefined;
      match.matchedAt = Date.now() - (35 * 24 * 60 * 60 * 1000);

      expect(shouldCleanupMatch(match)).toBe(true);
    });
  });

  describe('Match Explanation Transparency', () => {
    it('should provide detailed explanation with all components', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety', 'depression'],
        { monday: ['morning', 'afternoon'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety', 'depression', 'stress_management'],
        { monday: ['morning', 'afternoon'], wednesday: ['evening'] }
      );
      mentor.karma = 600;
      mentor.rating = 4.3;
      mentor.streak = 15;

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation).toHaveProperty('topicOverlapScore');
      expect(result!.explanation).toHaveProperty('topicOverlapReason');
      expect(result!.explanation).toHaveProperty('collegeScore');
      expect(result!.explanation).toHaveProperty('collegeReason');
      expect(result!.explanation).toHaveProperty('availabilityScore');
      expect(result!.explanation).toHaveProperty('availabilityReason');
      expect(result!.explanation).toHaveProperty('reputationScore');
      expect(result!.explanation).toHaveProperty('reputationReason');
      expect(result!.explanation).toHaveProperty('totalScore');
      expect(result!.explanation).toHaveProperty('strengths');
      expect(result!.explanation).toHaveProperty('considerations');
      expect(result!.explanation).toHaveProperty('weights');
      
      expect(result!.explanation.topicOverlapReason).toContain('anxiety');
      expect(result!.explanation.collegeReason).toContain('MIT');
      expect(result!.explanation.reputationReason).toContain('600');
    });

    it('should list matched topics in explanation', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety', 'depression', 'stress_management'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety', 'depression'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.topicOverlapReason).toContain('anxiety');
      expect(result!.explanation.topicOverlapReason).toContain('depression');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty mentor list', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, []);

      expect(result).toBeNull();
    });

    it('should handle empty topic list for mentee', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        [],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety', 'depression'],
        { monday: ['morning'] }
      );

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.topicOverlapScore).toBe(0);
    });

    it('should handle zero karma mentor', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.karma = 0;
      mentor.rating = 0;
      mentor.streak = 0;

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.reputationScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle mentee with no availability preferences', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        {}
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'], tuesday: ['afternoon'], wednesday: ['evening'] }
      );

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).not.toBeNull();
      expect(result!.explanation.availabilityScore).toBe(0);
    });

    it('should handle mentor at exactly capacity', () => {
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const mentor = createMentorProfile(
        'mentor1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 3;
      mentor.currentMentees = ['m1', 'm2', 'm3'];

      const result = findBestMentorMatch(mentee, [mentor]);

      expect(result).toBeNull();
    });
  });
});
