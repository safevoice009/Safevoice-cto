// Token earning and spending rules for $VOICE ecosystem

export const EARN_RULES = {
  // Posts
  firstPost: 20, // First post bonus
  regularPost: 10, // Each post
  mediaPostBonus: 15, // Posts with image/media attachments
  viralPost: 50, // >100 reactions

  // Reactions
  reactionReceived: 2, // Someone reacts to your post
  reactionGiven: 1, // You react to others

  // Comments
  comment: 3, // Each comment
  replyReceived: 2, // Someone replies to you

  // Community
  helpfulPost: 50, // Marked as helpful
  crisisResponse: 100, // Responding to crisis post
  reportAccepted: 10, // Valid report
  reportRejected: -5, // False report (penalty)

  // Engagement
  dailyLoginBonus: 5, // Log in once per day
  weeklyStreak: 50, // 7 consecutive days
  monthlyStreak: 300, // 30 consecutive days

  // Milestones
  milestone10Posts: 50,
  milestone50Posts: 200,
  milestone100Posts: 500,

  // Reputation
  trustedContributor: 100, // Verified helpful user
  earlyAdopter: 500, // First 1000 users
} as const;

export const SPEND_RULES = {
  // Features
  premiumMonthly: 50,
  premiumYearly: 500, // Save 100 VOICE

  // Post features
  postBoost: 10, // Boost to top of feed (1 hour)
  postBoostExtended: 25, // Boost for 24 hours
  postPinned: 20, // Pin to profile

  // Interactions
  sendTip: 1, // Min tip amount
  sendGift: 5, // Special gift animation
  awardBadge: 10, // Award badge to user

  // Content
  postExtension: 10, // Extend post lifetime
  postRestore: 5, // Restore deleted post

  // Profile
  customBadge: 100, // Create custom badge
  verifiedBadge: 1000, // Verified user status
  customTheme: 50, // Custom profile theme

  // NFT Badges (future)
  mintBronzeBadge: 100,
  mintSilverBadge: 500,
  mintGoldBadge: 1000,
  mintPlatinumBadge: 10000,
} as const;

export type EarnReason = keyof typeof EARN_RULES | string;
export type SpendReason = keyof typeof SPEND_RULES | string;

// Format VOICE balance for display
export function formatVoiceBalance(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M VOICE`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K VOICE`;
  }
  return `${amount.toFixed(1)} VOICE`;
}

// Calculate earnings breakdown
export interface EarningsBreakdown {
  posts: number;
  reactions: number;
  comments: number;
  helpful: number;
  streaks: number;
  bonuses: number;
  crisis: number;
  reporting: number;
}

export function calculateTotalEarnings(breakdown: EarningsBreakdown): number {
  return (
    breakdown.posts +
    breakdown.reactions +
    breakdown.comments +
    breakdown.helpful +
    breakdown.streaks +
    breakdown.bonuses +
    breakdown.crisis +
    breakdown.reporting
  );
}
