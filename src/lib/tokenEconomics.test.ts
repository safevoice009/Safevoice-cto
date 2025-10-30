import { describe, it, expect } from 'vitest';
import {
  EARN_RULES,
  SPEND_RULES,
  formatVoiceBalance,
  calculateTotalEarnings,
  type EarningsBreakdown,
} from './tokenEconomics';

describe('Token Economics', () => {
  describe('EARN_RULES', () => {
    it('should have valid earning amounts', () => {
      expect(EARN_RULES.firstPost).toBe(20);
      expect(EARN_RULES.regularPost).toBe(10);
      expect(EARN_RULES.viralPost).toBe(50);
      expect(EARN_RULES.reactionReceived).toBe(2);
      expect(EARN_RULES.helpfulPost).toBe(50);
      expect(EARN_RULES.dailyLoginBonus).toBe(5);
    });

    it('should have positive earning amounts except for penalties', () => {
      Object.entries(EARN_RULES).forEach(([key, value]) => {
        if (key === 'reportRejected') {
          expect(value).toBeLessThan(0); // Penalty should be negative
        } else {
          expect(value).toBeGreaterThan(0);
        }
      });
    });

    it('should have streak bonuses increasing appropriately', () => {
      expect(EARN_RULES.weeklyStreak).toBeGreaterThan(EARN_RULES.dailyLoginBonus);
      expect(EARN_RULES.monthlyStreak).toBeGreaterThan(EARN_RULES.weeklyStreak);
    });

    it('should have milestone rewards increasing with post count', () => {
      expect(EARN_RULES.milestone50Posts).toBeGreaterThan(EARN_RULES.milestone10Posts);
      expect(EARN_RULES.milestone100Posts).toBeGreaterThan(EARN_RULES.milestone50Posts);
    });

    it('should reward crisis responses highly', () => {
      expect(EARN_RULES.crisisResponse).toBeGreaterThan(EARN_RULES.regularPost);
      expect(EARN_RULES.crisisResponse).toBeGreaterThan(EARN_RULES.viralPost);
    });
  });

  describe('SPEND_RULES', () => {
    it('should have valid spending amounts', () => {
      expect(SPEND_RULES.premiumMonthly).toBe(50);
      expect(SPEND_RULES.postBoost).toBe(10);
      expect(SPEND_RULES.sendTip).toBe(1);
    });

    it('should have all positive spending amounts', () => {
      Object.values(SPEND_RULES).forEach((value) => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should incentivize yearly premium with discount', () => {
      const monthlyYearlyCost = SPEND_RULES.premiumMonthly * 12;
      expect(SPEND_RULES.premiumYearly).toBeLessThan(monthlyYearlyCost);
      const savings = monthlyYearlyCost - SPEND_RULES.premiumYearly;
      expect(savings).toBe(100);
    });

    it('should have extended boost cost more than regular boost', () => {
      expect(SPEND_RULES.postBoostExtended).toBeGreaterThan(SPEND_RULES.postBoost);
    });

    it('should have NFT badges scaling appropriately', () => {
      expect(SPEND_RULES.mintSilverBadge).toBeGreaterThan(SPEND_RULES.mintBronzeBadge);
      expect(SPEND_RULES.mintGoldBadge).toBeGreaterThan(SPEND_RULES.mintSilverBadge);
      expect(SPEND_RULES.mintPlatinumBadge).toBeGreaterThan(SPEND_RULES.mintGoldBadge);
    });
  });

  describe('formatVoiceBalance', () => {
    it('should format small amounts correctly', () => {
      expect(formatVoiceBalance(0)).toBe('0.0 VOICE');
      expect(formatVoiceBalance(5)).toBe('5.0 VOICE');
      expect(formatVoiceBalance(99)).toBe('99.0 VOICE');
      expect(formatVoiceBalance(999)).toBe('999.0 VOICE');
    });

    it('should format thousands with K suffix', () => {
      expect(formatVoiceBalance(1000)).toBe('1.0K VOICE');
      expect(formatVoiceBalance(1500)).toBe('1.5K VOICE');
      expect(formatVoiceBalance(25000)).toBe('25.0K VOICE');
      expect(formatVoiceBalance(999999)).toBe('1000.0K VOICE');
    });

    it('should format millions with M suffix', () => {
      expect(formatVoiceBalance(1000000)).toBe('1.0M VOICE');
      expect(formatVoiceBalance(1500000)).toBe('1.5M VOICE');
      expect(formatVoiceBalance(25000000)).toBe('25.0M VOICE');
    });

    it('should handle decimal places correctly', () => {
      expect(formatVoiceBalance(1234)).toBe('1.2K VOICE');
      expect(formatVoiceBalance(1567)).toBe('1.6K VOICE');
      expect(formatVoiceBalance(1234567)).toBe('1.2M VOICE');
    });

    it('should handle negative amounts', () => {
      const result1 = formatVoiceBalance(-100);
      expect(result1).toContain('-100');
      expect(result1).toContain('VOICE');
      
      const result2 = formatVoiceBalance(-1500);
      expect(result2).toContain('-1500');
      expect(result2).toContain('VOICE');
      
      const result3 = formatVoiceBalance(-1500000);
      expect(result3).toContain('-1500000');
      expect(result3).toContain('VOICE');
    });

    it('should handle edge cases', () => {
      expect(formatVoiceBalance(0.5)).toBe('0.5 VOICE');
      expect(formatVoiceBalance(999.9)).toBe('999.9 VOICE');
      expect(formatVoiceBalance(1000.1)).toBe('1.0K VOICE');
    });
  });

  describe('calculateTotalEarnings', () => {
    it('should sum all breakdown categories', () => {
      const breakdown: EarningsBreakdown = {
        posts: 100,
        reactions: 50,
        comments: 30,
        helpful: 20,
        streaks: 15,
        bonuses: 10,
        crisis: 5,
        reporting: 2,
      };
      expect(calculateTotalEarnings(breakdown)).toBe(232);
    });

    it('should handle zero earnings', () => {
      const breakdown: EarningsBreakdown = {
        posts: 0,
        reactions: 0,
        comments: 0,
        helpful: 0,
        streaks: 0,
        bonuses: 0,
        crisis: 0,
        reporting: 0,
      };
      expect(calculateTotalEarnings(breakdown)).toBe(0);
    });

    it('should handle partial earnings', () => {
      const breakdown: EarningsBreakdown = {
        posts: 50,
        reactions: 0,
        comments: 10,
        helpful: 0,
        streaks: 5,
        bonuses: 0,
        crisis: 0,
        reporting: 0,
      };
      expect(calculateTotalEarnings(breakdown)).toBe(65);
    });

    it('should handle large earnings', () => {
      const breakdown: EarningsBreakdown = {
        posts: 10000,
        reactions: 5000,
        comments: 3000,
        helpful: 2000,
        streaks: 1500,
        bonuses: 1000,
        crisis: 500,
        reporting: 200,
      };
      expect(calculateTotalEarnings(breakdown)).toBe(23200);
    });

    it('should handle negative values (penalties)', () => {
      const breakdown: EarningsBreakdown = {
        posts: 100,
        reactions: 50,
        comments: 30,
        helpful: 20,
        streaks: 15,
        bonuses: 10,
        crisis: 5,
        reporting: -10, // Penalty
      };
      expect(calculateTotalEarnings(breakdown)).toBe(220);
    });
  });
});
