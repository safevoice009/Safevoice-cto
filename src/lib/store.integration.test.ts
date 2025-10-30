import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from './store';
import { EARN_RULES, SPEND_RULES } from './tokenEconomics';

const defaultBreakdown = {
  posts: 0,
  reactions: 0,
  comments: 0,
  helpful: 0,
  streaks: 0,
  bonuses: 0,
  crisis: 0,
  reporting: 0,
};

const resetStore = () => {
  useStore.setState({
    studentId: 'Student#1000',
    posts: [],
    bookmarkedPosts: [],
    reports: [],
    notifications: [],
    unreadCount: 0,
    showCrisisModal: false,
    pendingPost: null,
    savedHelplines: [],
    emergencyBannerDismissedUntil: null,
    connectedAddress: null,
    anonymousWalletAddress: null,
    voiceBalance: 0,
    pendingRewards: 0,
    earningsBreakdown: { ...defaultBreakdown },
    transactionHistory: [],
    lastLoginDate: null,
    loginStreak: 0,
  });
  localStorage.clear();
};

describe('Store Integration – Token Journey', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should handle post → comment → claim → spend flow', async () => {
    const store = useStore.getState();

    // Step 1: Create the first post
    store.addPost('My first post', 'general', '24h');
    let state = useStore.getState();
    expect(state.posts).toHaveLength(1);
    expect(state.voiceBalance).toBe(EARN_RULES.firstPost);
    expect(state.pendingRewards).toBe(EARN_RULES.firstPost);
    expect(state.earningsBreakdown.posts).toBe(EARN_RULES.firstPost);
    expect(state.transactionHistory[0].reason).toBe('First post!');

    const firstPostId = state.posts[0].id;

    // Step 2: Create another post
    store.addPost('Second post for the community', 'support', '24h');
    state = useStore.getState();
    expect(state.posts).toHaveLength(2);
    expect(state.voiceBalance).toBe(EARN_RULES.firstPost + EARN_RULES.regularPost);
    expect(state.pendingRewards).toBe(EARN_RULES.firstPost + EARN_RULES.regularPost);
    expect(state.earningsBreakdown.posts).toBe(EARN_RULES.firstPost + EARN_RULES.regularPost);

    // Step 3: Add a comment to the first post
    store.addComment(firstPostId, 'This resonates with me!');
    state = useStore.getState();
    expect(state.posts[1].commentCount).toBe(1);
    expect(state.posts[1].comments).toHaveLength(1);
    expect(state.voiceBalance).toBe(
      EARN_RULES.firstPost + EARN_RULES.regularPost + EARN_RULES.comment
    );
    expect(state.earningsBreakdown.comments).toBe(EARN_RULES.comment);

    // Step 4: Bookmark the post
    store.toggleBookmark(firstPostId);
    state = useStore.getState();
    expect(state.bookmarkedPosts).toContain(firstPostId);

    // Step 5: Simulate viral and helpful bonuses
    store.earnVoice(EARN_RULES.viralPost, 'Viral post bonus', 'posts', { postId: firstPostId });
    store.incrementHelpful(firstPostId);
    state = useStore.getState();
    expect(state.voiceBalance).toBe(
      EARN_RULES.firstPost +
        EARN_RULES.regularPost +
        EARN_RULES.comment +
        EARN_RULES.viralPost +
        EARN_RULES.helpfulPost
    );
    expect(state.earningsBreakdown.helpful).toBe(EARN_RULES.helpfulPost);

    // Step 6: Connect wallet and claim rewards
    store.setConnectedAddress('0x1234567890abcdef1234567890abcdef12345678');
    await store.claimRewards();
    state = useStore.getState();
    expect(state.connectedAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(state.pendingRewards).toBe(0);
    expect(state.transactionHistory[0].reason).toBe('Claimed to blockchain');

    // Step 7: Spend VOICE in the marketplace
    const balanceBeforeSpend = state.voiceBalance;
    store.spendVoice(SPEND_RULES.postBoost, 'Post boost');
    state = useStore.getState();
    expect(state.voiceBalance).toBe(balanceBeforeSpend - SPEND_RULES.postBoost);
    expect(state.transactionHistory[0].type).toBe('spend');
    expect(state.transactionHistory[0].reason).toBe('Post boost');
  });

  it('should support streak bonuses and crisis rewards', () => {
    const store = useStore.getState();

    // Start daily login streak
    store.grantDailyLoginBonus();
    let state = useStore.getState();
    expect(state.voiceBalance).toBe(EARN_RULES.dailyLoginBonus);
    expect(state.loginStreak).toBe(1);
    expect(state.earningsBreakdown.streaks).toBe(EARN_RULES.dailyLoginBonus);

    // Simulate consecutive logins up to 7 days
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    useStore.setState({ lastLoginDate: yesterday.toDateString(), loginStreak: 6 });
    store.grantDailyLoginBonus();
    state = useStore.getState();
    expect(state.loginStreak).toBe(7);
    expect(state.voiceBalance).toBe(
      EARN_RULES.dailyLoginBonus * 2 + EARN_RULES.weeklyStreak
    );
    expect(state.earningsBreakdown.streaks).toBe(
      EARN_RULES.dailyLoginBonus * 2 + EARN_RULES.weeklyStreak
    );

    // Simulate crisis flagged post reward
    store.addPost('Supporting a friend in crisis', 'mental-health', '24h', undefined, false, undefined, {
      isCrisisFlagged: true,
      crisisLevel: 'high',
    });
    state = useStore.getState();
    expect(state.posts[0].isCrisisFlagged).toBe(true);
    expect(state.earningsBreakdown.crisis).toBe(EARN_RULES.crisisResponse);
    expect(state.voiceBalance).toBeGreaterThan(0);
  });

  it('should track helpful reactions and reports', () => {
    const store = useStore.getState();

    // Seed store with a post from another student
    const otherPost = {
      id: 'post-other',
      studentId: 'Student#2000',
      content: 'Remember to breathe and take breaks. 🌿',
      category: 'self-care',
      reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
      commentCount: 0,
      comments: [],
      createdAt: Date.now(),
      isEdited: false,
      editedAt: null,
      isPinned: false,
      reportCount: 0,
      helpfulCount: 0,
      expiresAt: null,
      lifetime: 'never' as const,
      customLifetimeHours: null,
      isEncrypted: false,
      encryptionMeta: null,
      warningShown: false,
    };

    useStore.setState((state) => ({
      posts: [otherPost, ...state.posts],
    }));

    // Mark the post as helpful
    store.incrementHelpful('post-other');
    let state = useStore.getState();
    expect(state.posts[0].helpfulCount).toBe(1);
    expect(state.earningsBreakdown.helpful).toBe(EARN_RULES.helpfulPost);
    expect(state.transactionHistory[0].reason).toBe('Post marked as helpful');

    // React to the post
    store.addReaction('post-other', 'heart');
    state = useStore.getState();
    expect(state.posts[0].reactions.heart).toBe(1);
    expect(state.earningsBreakdown.reactions).toBeGreaterThan(0);

    // File a report
    store.addReport({
      postId: 'post-other',
      reportType: 'inappropriate',
      description: 'Contains sensitive content',
      reporterId: 'Student#1000',
    });
    state = useStore.getState();
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0].reportType).toBe('inappropriate');

    // Reward accepted report
    store.earnVoice(EARN_RULES.reportAccepted, 'Report accepted', 'reporting');
    state = useStore.getState();
    expect(state.earningsBreakdown.reporting).toBe(EARN_RULES.reportAccepted);
    
    // Apply penalty scenario - negative amounts are rejected by earnVoice, so balance doesn't change
    const balanceBefore = state.voiceBalance;
    store.earnVoice(EARN_RULES.reportRejected, 'False report penalty', 'reporting');
    state = useStore.getState();
    expect(state.voiceBalance).toBe(balanceBefore); // Balance unchanged due to negative amount rejection
  });

  it('should persist and reload wallet data from storage', () => {
    const store = useStore.getState();

    // Earn and spend tokens
    store.earnVoice(100, 'Initial bonus', 'bonuses');
    store.spendVoice(25, 'Post boost');

    let state = useStore.getState();
    expect(state.voiceBalance).toBe(75);
    expect(state.pendingRewards).toBe(100);
    expect(state.transactionHistory.length).toBe(2);

    // Simulate page reload
    useStore.setState({
      voiceBalance: 0,
      pendingRewards: 0,
      earningsBreakdown: { ...defaultBreakdown },
      transactionHistory: [],
      anonymousWalletAddress: null,
    });

    store.loadWalletData();

    state = useStore.getState();
    expect(state.voiceBalance).toBe(75);
    expect(state.pendingRewards).toBe(100);
    expect(state.transactionHistory.length).toBeGreaterThan(0);
  });
});
