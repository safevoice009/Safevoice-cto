import { create } from 'zustand';
import toast from 'react-hot-toast';
import { createElement } from 'react';
import { Wallet } from 'ethers';
import {
  EARN_RULES,
  type EarningsBreakdown,
} from './tokenEconomics';
import { setSecureItem, getSecureItem, clearSecureItem } from './secureStorage';
import { RewardEngine, type Achievement, type PremiumFeatureType, type SubscriptionState } from './tokens/RewardEngine';
import { AchievementService, type RankDefinition } from './tokens/AchievementService';
import { addAchievementToast } from './achievementToastBus';
import type { BridgeStatus, QueuedTransaction } from './web3/types';
import { Web3Bridge } from './web3/bridge';
import { createWeb3Config, getDefaultChainId, isWeb3Enabled } from './web3/config';
import type { ChainBalance, StakingPosition, GovernanceProposal, NFTAchievement } from './wallet/types';

// Re-export premium types and achievement
export type { Achievement, PremiumFeatureType, SubscriptionState };

// Types
export interface Reaction {
  heart: number;
  fire: number;
  clap: number;
  sad: number;
  angry: number;
  laugh: number;
}

export type TipEventType = 'tip' | 'gift';

export interface TipEvent {
  id: string;
  postId: string;
  from: string;
  amount: number;
  timestamp: number;
  type: TipEventType;
  isAnonymous?: boolean;
}

export type PostLifetime = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom' | 'never';

export interface EncryptionMeta {
  iv: string;
  algorithm: 'AES-GCM-256';
  keyId: string;
}

export interface AddPostPayload {
  content: string;
  category?: string;
  expiresAt: number | null;
  lifetime: PostLifetime;
  customLifetimeHours?: number | null;
  isEncrypted?: boolean;
  imageUrl?: string;
  encryptionData?: {
    encrypted: string;
    iv: string;
    keyId: string;
  };
  moderationData?: {
    issues?: PostModerationIssue[];
    needsReview?: boolean;
    contentBlurred?: boolean;
    blurReason?: string | null;
    isCrisisFlagged?: boolean;
    crisisLevel?: 'high' | 'critical';
  };
}

export interface UpdatePostOptions {
  content?: string;
  category?: string;
  expiresAt?: number | null;
  lifetime?: PostLifetime;
  customLifetimeHours?: number | null;
  isEncrypted?: boolean;
  encryptionData?: {
    encrypted: string;
    iv: string;
    keyId: string;
  };
}

export interface Comment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  studentId: string;
  content: string;
  reactions: Reaction;
  replies: Comment[];
  createdAt: number;
  isEdited: boolean;
  editedAt: number | null;
  helpfulVotes: number;
  helpfulRewardAwarded: boolean;
  crisisSupportRewardAwarded: boolean;
  isVerifiedAdvice: boolean;
  verifiedAdviceRewardAwarded: boolean;
}

export interface PostModerationIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'support' | 'blur' | 'flag';
  message: string;
}

export interface Post {
  id: string;
  studentId: string;
  content: string;
  category?: string;
  reactions: Reaction;
  commentCount: number;
  comments: Comment[];
  createdAt: number;
  isEdited: boolean;
  editedAt: number | null;
  isPinned: boolean;
  isViral?: boolean;
  viralAwardedAt?: number | null;
  reportCount: number;
  helpfulCount: number;
  expiresAt: number | null;
  lifetime: PostLifetime;
  customLifetimeHours?: number | null;
  isEncrypted: boolean;
  encryptionMeta: EncryptionMeta | null;
  imageUrl?: string | null;
  warningShown?: boolean;
  reports?: Report[];
  contentBlurred?: boolean;
  blurReason?: string | null;
  moderationStatus?: 'under_review' | 'hidden';
  hiddenReason?: string | null;
  moderationIssues?: PostModerationIssue[];
  needsReview?: boolean;
  isCrisisFlagged?: boolean;
  crisisLevel?: 'high' | 'critical';
  supportOffered?: boolean;
  flaggedAt?: number | null;
  flaggedForSupport?: boolean;
  pinnedAt?: number | null;
  isHighlighted?: boolean;
  highlightedAt?: number | null;
  highlightedUntil?: number | null;
  extendedLifetimeHours?: number;
  crossCampusBoostedAt?: number | null;
  crossCampusUntil?: number | null;
  crossCampusBoosts?: string[];
}

export interface Report {
  id: string;
  postId?: string;
  commentId?: string;
  reportType: string;
  description: string;
  reporterId: string;
  reportedAt: number;
  status: 'pending' | 'valid' | 'invalid';
  reviewedBy?: string;
  reviewedAt?: number;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: 'reaction' | 'comment' | 'reply' | 'award' | 'report';
  postId: string;
  commentId?: string;
  actorId: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface VoiceTransaction {
  id: string;
  type: 'earn' | 'spend' | 'claim';
  amount: number;
  reason: string;
  reasonCode?: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  balance: number;
  pending?: number;
  claimed?: number;
  spent?: number;
}

export interface PendingRewardEntry {
  category: string;
  amount: number;
  timestamp: number;
}

export interface ReferralFriend {
  id: string;
  name: string;
  codeUsed: string;
  joinedAt: number;
  firstPostAt: number | null;
  firstPostRewarded: boolean;
}

export interface MemorialCandle {
  id: string;
  tributeId: string;
  lightedBy: string;
  lightedAt: number;
}

export interface MemorialTribute {
  id: string;
  createdBy: string;
  createdAt: number;
  personName: string;
  message: string;
  candles: MemorialCandle[];
  milestoneRewardAwarded: boolean;
}

export interface ModeratorAction {
  id: string;
  moderatorId: string;
  actionType: 'blur_post' | 'hide_post' | 'verify_advice' | 'review_report' | 'restore_post';
  targetId: string; // postId, commentId, or reportId
  timestamp: number;
  rewardAwarded: boolean;
  metadata?: Record<string, unknown>;
}

export type NFTBadgeTier = 'bronze' | 'silver' | 'gold' | 'lifetime';

export interface NFTBadge {
  id: string;
  tier: NFTBadgeTier;
  purchasedAt: number;
  purchasedBy: string;
  cost: number;
}

export interface StoreState {
  studentId: string;
  isModerator: boolean;
  posts: Post[];
  bookmarkedPosts: string[];
  reports: Report[];
  moderatorActions: ModeratorAction[];
  notifications: Notification[];
  unreadCount: number;
  encryptionKeys: Record<string, JsonWebKey>;
  expiryTimeouts: Record<string, number>;
  boostTimeouts: Record<string, { highlight?: number; crossCampus?: number }>;
  communitySupport: Record<string, number>;

  // Wallet & Token state
  connectedAddress: string | null;
  anonymousWalletAddress: string | null;
  voiceBalance: number;
  pendingRewards: number;
  totalRewardsEarned: number;
  claimedRewards: number;
  spentRewards: number;
  availableBalance: number;
  pendingRewardBreakdown: PendingRewardEntry[];
  earningsBreakdown: EarningsBreakdown;
  transactionHistory: VoiceTransaction[];
  lastLoginDate: string | null;
  loginStreak: number;
  lastPostDate: string | null;
  postingStreak: number;
  premiumSubscriptions: SubscriptionState;
  walletLoading: boolean;
  walletError: string | null;
  achievements: Achievement[];
  achievementProgress: Record<string, { progress: number; total: number; percentage: number }>;
  currentRank: RankDefinition;
  nextRank: RankDefinition | null;
  rankProgressPercentage: number;
  voiceToNextRank: number;

  selectedChainId: number;
  chainBalances: Record<number, ChainBalance>;
  bridgeStatus: BridgeStatus | null;
  bridgeTransactions: QueuedTransaction[];
  stakingPositions: StakingPosition[];
  governanceProposals: GovernanceProposal[];
  governanceVotingPower: number;
  nftAchievements: NFTAchievement[];

  firstPostAwarded: boolean;

  referralCode: string;
  referredByCode: string | null;
  referredFriends: ReferralFriend[];

  setConnectedAddress: (address: string | null) => void;
  setAnonymousWallet: (address: string | null) => void;
  generateAnonymousWallet: (password: string) => Promise<{ address: string; mnemonic: string }>;
  importAnonymousWallet: (mnemonic: string, password: string) => Promise<{ address: string }>;
  loadAnonymousWallet: (password: string) => Promise<Wallet | null>;
  clearAnonymousWallet: () => void;

  earnVoice: (
    amount: number,
    reason: string,
    category?: keyof EarningsBreakdown,
    metadata?: Record<string, unknown>
  ) => void;
  spendVoice: (amount: number, reason: string, metadata?: Record<string, unknown>) => void;
  claimRewards: () => Promise<void>;
  loadWalletData: () => void;
  grantDailyLoginBonus: () => void;
  checkSubscriptionRenewals: () => void;

  // Premium subscriptions
  activatePremium: (feature: PremiumFeatureType, cost?: number) => Promise<boolean>;
  deactivatePremium: (feature: PremiumFeatureType) => Promise<boolean>;
  isPremiumActive: (feature: PremiumFeatureType) => boolean;

  // Crisis support
  showCrisisModal: boolean;
  pendingPost: AddPostPayload | null;
  setShowCrisisModal: (show: boolean) => void;
  setPendingPost: (post: AddPostPayload | null) => void;

  // Saved helplines
  savedHelplines: string[];
  toggleSaveHelpline: (helplineId: string) => void;

  emergencyBannerDismissedUntil: number | null;
  dismissEmergencyBanner: () => void;
  checkEmergencyBannerStatus: () => void;

  // Initialization
  initStudentId: () => void;
  initializeStore: () => void;

  // Post actions
  addPost: (
    content: string,
    category?: string,
    lifetime?: PostLifetime,
    customHours?: number,
    isEncrypted?: boolean,
    encryptedData?: { encrypted: string; iv: string; keyId: string },
    moderationData?: {
      issues?: PostModerationIssue[];
      needsReview?: boolean;
      contentBlurred?: boolean;
      blurReason?: string | null;
      isCrisisFlagged?: boolean;
      crisisLevel?: 'high' | 'critical';
    },
    imageUrl?: string
  ) => void;
  updatePost: (
    postId: string,
    content: string,
    options?: {
      lifetime?: PostLifetime;
      customHours?: number;
      isEncrypted?: boolean;
      encryptedData?: { encrypted: string; iv: string; keyId: string };
    }
  ) => void;
  deletePost: (postId: string, options?: { silent?: boolean }) => void;
  pinPost: (postId: string) => void;
  highlightPost: (postId: string) => void;
  boostToCampuses: (postId: string, campusIds: string[]) => void;
  addReaction: (postId: string, reactionType: keyof Reaction) => void;
  incrementHelpful: (postId: string) => void;

  // Post lifecycle
  scheduleExpiry: (post: Post) => void;
  clearExpiryTimer: (postId: string) => void;
  markWarningShown: (postId: string) => void;
  extendPostLifetime: (postId: string, hours?: number) => void;
  restoreDeletedPost: (post: Post) => void;

  // Encryption
  addEncryptionKey: (keyId: string, key: JsonWebKey) => void;
  getEncryptionKey: (keyId: string) => JsonWebKey | undefined;

  // Comment actions
  addComment: (postId: string, content: string, parentCommentId?: string) => void;
  updateComment: (commentId: string, content: string) => void;
  deleteComment: (commentId: string, postId: string) => void;
  addCommentReaction: (postId: string, commentId: string, reactionType: keyof Reaction) => void;
  markCommentHelpful: (postId: string, commentId: string) => void;
  markCommentAsVerifiedAdvice: (postId: string, commentId: string) => void;

  // Bookmark actions
  toggleBookmark: (postId: string) => void;

  // Report actions
  addReport: (report: Omit<Report, 'id' | 'reportedAt' | 'status'>) => void;
  reviewReport: (reportId: string, status: 'valid' | 'invalid') => void;
  recordModeratorAction: (
    actionType: ModeratorAction['actionType'],
    targetId: string,
    metadata?: Record<string, unknown>
  ) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;

  // Moderator
  toggleModeratorMode: () => void;

  // Memorial Wall
  memorialTributes: MemorialTribute[];
  createTribute: (personName: string, message: string) => boolean;
  lightCandle: (tributeId: string) => void;
  loadMemorialData: () => void;

  // Referral System
  generateReferralCode: () => string;
  simulateReferralJoin: (code: string, friendName: string) => boolean;
  markReferralFirstPost: (friendId: string) => boolean;
  loadReferralData: () => void;

  // Social Spending (tips, gifts, sponsorships)
  tipUser: (userId: string, postId: string, amount: number) => boolean;
  sendAnonymousGift: (userId: string, amount: number) => boolean;
  sponsorHelpline: (amount: number) => boolean;

  // NFT Badges
  nftBadges: NFTBadge[];
  purchaseNFTBadge: (tier: NFTBadgeTier, cost: number) => boolean;
  hasNFTBadge: (tier: NFTBadgeTier) => boolean;
  loadNFTBadges: () => void;

  // Special Utilities
  changeStudentId: (newId: string) => boolean;
  downloadDataBackup: () => void;

  // Achievement & Rank
  getUserRank: () => RankDefinition;
  checkAchievements: () => Promise<void>;
  getAchievementProgress: (achievementId: string) => { progress: number; total: number; percentage: number } | null;

  // Utility
  saveToLocalStorage: () => void;
}

const STORAGE_KEYS = {
  STUDENT_ID: 'studentId',
  POSTS: 'safevoice_posts',
  BOOKMARKS: 'safevoice_bookmarks',
  REPORTS: 'safevoice_reports',
  MODERATOR_ACTIONS: 'safevoice_moderator_actions',
  NOTIFICATIONS: 'safevoice_notifications',
  ENCRYPTION_KEYS: 'safevoice_encryption_keys',
  SAVED_HELPLINES: 'safevoice_saved_helplines',
  EMERGENCY_BANNER: 'emergencyBannerDismissed',
  ANON_WALLET_ADDRESS: 'anonWallet_address',
  ANON_WALLET_ENCRYPTED_KEY: 'anonWallet_encrypted',
  FIRST_POST_AWARDED: 'safevoice_first_post_awarded',
  IS_MODERATOR: 'safevoice_is_moderator',
  MEMORIAL_TRIBUTES: 'safevoice_memorial_tributes',
  REFERRAL_STATE: 'safevoice_referral_state',
  COMMUNITY_SUPPORT: 'safevoice_community_support',
  NFT_BADGES: 'safevoice_nft_badges',
};

const rewardEngine = new RewardEngine();

const DEFAULT_CHAIN_ID = getDefaultChainId();
const WEB3_ENABLED = isWeb3Enabled();
const WEB3_CONFIG = WEB3_ENABLED ? createWeb3Config(DEFAULT_CHAIN_ID) : null;
const web3Bridge = WEB3_ENABLED && WEB3_CONFIG ? new Web3Bridge(WEB3_CONFIG) : null;

const INITIAL_CHAIN_BALANCES: Record<number, ChainBalance> = {
  [DEFAULT_CHAIN_ID]: {
    balance: rewardEngine.getBalance(),
    pending: rewardEngine.getPending(),
    staked: 0,
    rewards: rewardEngine.getPending(),
    lastUpdated: Date.now(),
  },
};

export const NFT_BADGE_TIERS: NFTBadgeTier[] = ['bronze', 'silver', 'gold', 'lifetime'];

export const NFT_BADGE_DEFINITIONS: Record<
  NFTBadgeTier,
  {
    label: string;
    cost: number;
    description: string;
    icon: string;
    gradientFrom: string;
    gradientTo: string;
    accent: string;
  }
> = {
  bronze: {
    label: 'Bronze',
    cost: 500,
    description: 'Show early support with our Bronze badge.',
    icon: '🥉',
    gradientFrom: 'from-amber-600/80',
    gradientTo: 'to-amber-500/40',
    accent: '#c08457',
  },
  silver: {
    label: 'Silver',
    cost: 2000,
    description: 'Celebrate dedication with the Silver badge.',
    icon: '🥈',
    gradientFrom: 'from-slate-400/80',
    gradientTo: 'to-slate-200/40',
    accent: '#d1d5db',
  },
  gold: {
    label: 'Gold',
    cost: 10000,
    description: 'Shine bright with the prestigious Gold badge.',
    icon: '🥇',
    gradientFrom: 'from-yellow-400/90',
    gradientTo: 'to-orange-400/40',
    accent: '#facc15',
  },
  lifetime: {
    label: 'Lifetime',
    cost: 50000,
    description: 'Unlock the ultimate Lifetime supporter badge.',
    icon: '💎',
    gradientFrom: 'from-purple-500/90',
    gradientTo: 'to-blue-500/40',
    accent: '#a855f7',
  },
};

const isNFTBadgeTier = (value: unknown): value is NFTBadgeTier =>
  typeof value === 'string' && NFT_BADGE_TIERS.includes(value as NFTBadgeTier);

const readStoredNFTBadges = (): NFTBadge[] => {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(STORAGE_KEYS.NFT_BADGES);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Array<Partial<NFTBadge>>;
    return parsed
      .map((badge) => {
        const tier = isNFTBadgeTier(badge.tier) ? badge.tier : null;
        if (!tier) return null;
        const definition = NFT_BADGE_DEFINITIONS[tier];
        return {
          id: typeof badge.id === 'string' && badge.id.length > 0 ? badge.id : crypto.randomUUID(),
          tier,
          purchasedAt: typeof badge.purchasedAt === 'number' ? badge.purchasedAt : Date.now(),
          purchasedBy:
            typeof badge.purchasedBy === 'string' && badge.purchasedBy.length > 0
              ? badge.purchasedBy
              : 'UnknownGuardian',
          cost: definition.cost,
        } satisfies NFTBadge;
      })
      .filter((badge): badge is NFTBadge => badge !== null);
  } catch (error) {
    console.error('Failed to parse stored NFT badges', error);
    return [];
  }
};

const persistNFTBadges = (badges: NFTBadge[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NFT_BADGES, JSON.stringify(badges));
  } catch (error) {
    console.error('Failed to persist NFT badges', error);
  }
};

const VIRAL_REACTION_THRESHOLD = 100;
const VIRAL_REWARD_AMOUNT = EARN_RULES.viralPost;
const HELPFUL_COMMENT_THRESHOLD = 5;
const HELPFUL_COMMENT_REWARD_PREFIX = 'helpful_comment';

type BoostType = 'highlight' | 'crossCampus';
const MODERATOR_ACTION_TYPES: ModeratorAction['actionType'][] = [
  'blur_post',
  'hide_post',
  'verify_advice',
  'review_report',
  'restore_post',
];
const MODERATOR_ACTION_REASONS: Record<ModeratorAction['actionType'], string> = {
  blur_post: 'Sensitive content blurred',
  hide_post: 'Harmful content removed',
  verify_advice: 'Verified community advice',
  review_report: 'Community report reviewed',
  restore_post: 'Content restored after review',
};
const VOLUNTEER_MOD_ACTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const MAX_MODERATOR_ACTIONS = 200;

// Helper to generate random student ID
const generateStudentId = () => `Student#${Math.floor(Math.random() * 9000 + 1000)}`;

const getSavedHelplinesFromStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_HELPLINES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse saved helplines', error);
    return [];
  }
};

const getEmergencyBannerDismissedUntil = (): number | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEYS.EMERGENCY_BANNER);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= Date.now()) {
    localStorage.removeItem(STORAGE_KEYS.EMERGENCY_BANNER);
    return null;
  }
  return parsed;
};

type ReferralStorageState = {
  code: string;
  referredByCode: string | null;
  friends: ReferralFriend[];
};

const normalizeInviteCode = (code: string): string => code.trim().toUpperCase();

const normalizeReferralFriend = (friend: Partial<ReferralFriend>): ReferralFriend => {
  const fallbackName = 'New Friend';
  const rawName = typeof friend.name === 'string' ? friend.name.trim() : fallbackName;
  const code = typeof friend.codeUsed === 'string' ? normalizeInviteCode(friend.codeUsed) : '';

  return {
    id: typeof friend.id === 'string' && friend.id.length > 0 ? friend.id : crypto.randomUUID(),
    name: rawName.length > 0 ? rawName : fallbackName,
    codeUsed: code,
    joinedAt: typeof friend.joinedAt === 'number' && Number.isFinite(friend.joinedAt)
      ? friend.joinedAt
      : Date.now(),
    firstPostAt:
      typeof friend.firstPostAt === 'number' && Number.isFinite(friend.firstPostAt)
        ? friend.firstPostAt
        : null,
    firstPostRewarded: Boolean(friend.firstPostRewarded),
  };
};

const generateReferralCodeForStudent = (studentId: string): string => {
  const studentSuffix = studentId.replace(/[^0-9A-Z]/gi, '').slice(-4) || 'SAFE';
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SV${studentSuffix.toUpperCase()}-${randomPart}`;
};

const createDefaultReferralState = (studentId: string): ReferralStorageState => ({
  code: generateReferralCodeForStudent(studentId),
  referredByCode: null,
  friends: [],
});

const readReferralState = (studentId: string): ReferralStorageState => {
  if (typeof window === 'undefined') {
    return createDefaultReferralState(studentId);
  }

  const raw = localStorage.getItem(STORAGE_KEYS.REFERRAL_STATE);
  if (!raw) {
    const fallback = createDefaultReferralState(studentId);
    localStorage.setItem(STORAGE_KEYS.REFERRAL_STATE, JSON.stringify(fallback));
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ReferralStorageState>;
    const code = typeof parsed?.code === 'string' && parsed.code.trim().length > 0
      ? normalizeInviteCode(parsed.code)
      : generateReferralCodeForStudent(studentId);

    const friends = Array.isArray(parsed?.friends)
      ? parsed.friends.map((friend) => normalizeReferralFriend(friend)).sort((a, b) => b.joinedAt - a.joinedAt)
      : [];

    const referredByCode = typeof parsed?.referredByCode === 'string' && parsed.referredByCode.trim().length > 0
      ? normalizeInviteCode(parsed.referredByCode)
      : null;

    const normalized: ReferralStorageState = {
      code,
      referredByCode,
      friends,
    };

    localStorage.setItem(STORAGE_KEYS.REFERRAL_STATE, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.error('Failed to parse referral state', error);
    const fallback = createDefaultReferralState(studentId);
    localStorage.setItem(STORAGE_KEYS.REFERRAL_STATE, JSON.stringify(fallback));
    return fallback;
  }
};

const persistReferralState = (referralState: ReferralStorageState): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.REFERRAL_STATE, JSON.stringify(referralState));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeReport = (report: Partial<Report>): Report => {
  const status: Report['status'] =
    report.status === 'valid' || report.status === 'invalid' ? report.status : 'pending';

  return {
    id: typeof report.id === 'string' ? report.id : crypto.randomUUID(),
    postId: typeof report.postId === 'string' && report.postId.length > 0 ? report.postId : undefined,
    commentId:
      typeof report.commentId === 'string' && report.commentId.length > 0 ? report.commentId : undefined,
    reportType: typeof report.reportType === 'string' ? report.reportType : 'General report',
    description: typeof report.description === 'string' ? report.description : '',
    reporterId: typeof report.reporterId === 'string' ? report.reporterId : 'AnonymousReporter',
    reportedAt: typeof report.reportedAt === 'number' ? report.reportedAt : Date.now(),
    status,
    reviewedBy: typeof report.reviewedBy === 'string' ? report.reviewedBy : undefined,
    reviewedAt: typeof report.reviewedAt === 'number' ? report.reviewedAt : undefined,
  } satisfies Report;
};

const upsertReport = (collection: Map<string, Report>, raw: Partial<Report>): Report => {
  const normalized = normalizeReport(raw);
  const existing = collection.get(normalized.id);
  if (!existing) {
    collection.set(normalized.id, normalized);
    return normalized;
  }

  const merged: Report = {
    ...existing,
    ...normalized,
    status: normalized.status,
    description: normalized.description,
    reporterId: normalized.reporterId,
    reportType: normalized.reportType,
    reviewedBy: normalized.reviewedBy ?? existing.reviewedBy,
    reviewedAt: normalized.reviewedAt ?? existing.reviewedAt,
    reportedAt: normalized.reportedAt ?? existing.reportedAt,
    postId: normalized.postId ?? existing.postId,
    commentId: normalized.commentId ?? existing.commentId,
  };

  collection.set(merged.id, merged);
  return merged;
};

const normalizeModeratorAction = (action: Partial<ModeratorAction>): ModeratorAction | null => {
  const candidateType = action.actionType;
  if (!candidateType || !MODERATOR_ACTION_TYPES.includes(candidateType as ModeratorAction['actionType'])) {
    return null;
  }

  const actionType = candidateType as ModeratorAction['actionType'];
  const targetId = typeof action.targetId === 'string' && action.targetId.length > 0 ? action.targetId : null;
  if (!targetId) {
    return null;
  }

  const metadata = isRecord(action.metadata) ? (action.metadata as Record<string, unknown>) : undefined;

  return {
    id: typeof action.id === 'string' ? action.id : crypto.randomUUID(),
    moderatorId:
      typeof action.moderatorId === 'string' && action.moderatorId.length > 0
        ? action.moderatorId
        : 'UnknownModerator',
    actionType,
    targetId,
    timestamp: typeof action.timestamp === 'number' ? action.timestamp : Date.now(),
    rewardAwarded: Boolean(action.rewardAwarded),
    metadata,
  } satisfies ModeratorAction;
};

// Helpers removed - now handled by RewardEngine

// Helper to find and update a comment recursively
const findAndUpdateComment = (
  comments: Comment[],
  commentId: string,
  updateFn: (comment: Comment) => Comment
): Comment[] => {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return updateFn(comment);
    }
    if (comment.replies.length > 0) {
      return {
        ...comment,
        replies: findAndUpdateComment(comment.replies, commentId, updateFn),
      };
    }
    return comment;
  });
};

// Helper to count all comments including replies
const countAllComments = (comments: Comment[]): number => {
  return comments.reduce((total, comment) => {
    return total + 1 + countAllComments(comment.replies);
  }, 0);
};

// Helper to find comment owner by commentId
const findCommentOwner = (comments: Comment[], commentId: string): string | null => {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return comment.studentId;
    }
    if (comment.replies.length > 0) {
      const found = findCommentOwner(comment.replies, commentId);
      if (found) return found;
    }
  }
  return null;
};

// Helper to find and delete a comment recursively
const findAndDeleteComment = (comments: Comment[], commentId: string): Comment[] => {
  return comments
    .map((comment) => {
      if (comment.id === commentId) {
        // If has replies, replace with [deleted] placeholder
        if (comment.replies.length > 0) {
          return {
            ...comment,
            content: '[deleted]',
            studentId: '[deleted]',
          };
        }
        // Otherwise remove completely
        return null;
      }
      if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: findAndDeleteComment(comment.replies, commentId),
        };
      }
      return comment;
    })
    .filter((comment): comment is Comment => comment !== null);
};

// Helper for normalizing stored comments (for migration)
type StoredComment = Partial<Comment> & {
  id: string;
  postId: string;
  studentId: string;
  content: string;
};

const normalizeStoredComments = (storedComments: StoredComment[]): Comment[] => {
  return storedComments.map((comment) => ({
    ...comment,
    parentCommentId: comment.parentCommentId ?? null,
    reactions: comment.reactions ?? { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
    replies: normalizeStoredComments((comment.replies as StoredComment[] | undefined) ?? []),
    createdAt: comment.createdAt ?? Date.now(),
    isEdited: comment.isEdited ?? false,
    editedAt: comment.editedAt ?? null,
    helpfulVotes: comment.helpfulVotes ?? 0,
    helpfulRewardAwarded: comment.helpfulRewardAwarded ?? false,
    crisisSupportRewardAwarded: comment.crisisSupportRewardAwarded ?? false,
    isVerifiedAdvice: comment.isVerifiedAdvice ?? false,
    verifiedAdviceRewardAwarded: comment.verifiedAdviceRewardAwarded ?? false,
  }));
};

const findCommentById = (comments: Comment[], commentId: string): Comment | null => {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return comment;
    }
    if (comment.replies.length > 0) {
      const found = findCommentById(comment.replies, commentId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

export const useStore = create<StoreState>((set, get) => {
  const syncRewardState = async () => {
    const snapshot = rewardEngine.getWalletSnapshot();
    const { posts, studentId } = get();

    const userPosts = posts.filter((post) => post.studentId === studentId);
    const totalReactionsReceived = userPosts.reduce((sum, post) => {
      const postReactions = Object.values(post.reactions).reduce((acc, value) => acc + value, 0);
      return sum + postReactions;
    }, 0);
    const viralPostCount = userPosts.filter((post) => {
      const reactionCount = Object.values(post.reactions).reduce((acc, value) => acc + value, 0);
      return reactionCount >= 100;
    }).length;

    const achievementContext = {
      posts: userPosts,
      totalReactionsReceived,
      viralPostCount,
    };

    const newlyUnlocked = await rewardEngine.checkAndUnlockAchievements(achievementContext);
    const updatedSnapshot = newlyUnlocked.length > 0 ? rewardEngine.getWalletSnapshot() : snapshot;

    const totalVoice = updatedSnapshot.totalEarned;
    const currentRank = AchievementService.getRank(totalVoice);
    const { nextRank, currentProgress, voiceNeeded } = AchievementService.getNextRank(totalVoice);

    const achievementProgressEntries = AchievementService.getAllAchievementsWithProgress(updatedSnapshot, achievementContext);
    const achievementProgressMap = achievementProgressEntries.reduce<Record<string, { progress: number; total: number; percentage: number }>>(
      (acc, entry) => {
        if (entry.progress) {
          acc[entry.definition.id] = entry.progress;
        }
        return acc;
      },
      {}
    );

    set({
      voiceBalance: updatedSnapshot.balance,
      pendingRewards: updatedSnapshot.pending,
      totalRewardsEarned: updatedSnapshot.totalEarned,
      claimedRewards: updatedSnapshot.claimed,
      spentRewards: updatedSnapshot.spent,
      availableBalance: rewardEngine.getAvailableBalance(),
      pendingRewardBreakdown: rewardEngine.getPendingBreakdown(),
      earningsBreakdown: updatedSnapshot.earningsBreakdown,
      transactionHistory: updatedSnapshot.transactions,
      lastLoginDate: updatedSnapshot.lastLogin,
      loginStreak: updatedSnapshot.streakData.currentStreak,
      lastPostDate: updatedSnapshot.streakData.lastPostDate,
      postingStreak: updatedSnapshot.streakData.currentPostStreak,
      premiumSubscriptions: updatedSnapshot.subscriptions,
      achievements: updatedSnapshot.achievements,
      achievementProgress: achievementProgressMap,
      currentRank,
      nextRank,
      rankProgressPercentage: Math.min(100, Math.max(0, currentProgress)),
      voiceToNextRank: Math.max(0, voiceNeeded),
    });
  };

  rewardEngine.onReward(() => {
    void syncRewardState();
  });

  rewardEngine.onSpend(() => {
    void syncRewardState();
  });

  rewardEngine.onBalanceChange(() => {
    void syncRewardState();
  });

  rewardEngine.onSubscription(() => {
    void syncRewardState();
  });

  rewardEngine.onAchievementUnlocked((achievement) => {
    addAchievementToast(achievement);
    void syncRewardState();
  });

  const initialStudentId = typeof window !== 'undefined'
    ? localStorage.getItem(STORAGE_KEYS.STUDENT_ID) || generateStudentId()
    : generateStudentId();
  
  const initialIsModerator = typeof window !== 'undefined'
    ? localStorage.getItem(STORAGE_KEYS.IS_MODERATOR) === 'true'
    : false;

  const initialNFTBadges = typeof window !== 'undefined' ? readStoredNFTBadges() : [];

  const initialReferralState = readReferralState(initialStudentId);

  const clearBoostTimeout = (postId: string, type: BoostType) => {
    if (typeof window === 'undefined') return;
    const timeoutId = get().boostTimeouts[postId]?.[type];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    set((state) => {
      const existing = state.boostTimeouts[postId] ?? {};
      const updatedEntry = { ...existing };
      delete updatedEntry[type];
      const updatedMap = { ...state.boostTimeouts };
      if (Object.keys(updatedEntry).length === 0) {
        delete updatedMap[postId];
      } else {
        updatedMap[postId] = updatedEntry;
      }
      return { boostTimeouts: updatedMap };
    });
  };

  const handleBoostExpiry = (postId: string, type: BoostType) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    if (type === 'highlight') {
      if (!post.isHighlighted) return;
      clearBoostTimeout(postId, 'highlight');
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, isHighlighted: false, highlightedAt: null, highlightedUntil: null }
            : p
        ),
      }));
      get().saveToLocalStorage();
      toast('Highlight boost expired', { icon: '⏱️' });
    } else if (type === 'crossCampus') {
      const hasActiveBoost = Array.isArray(post.crossCampusBoosts) && post.crossCampusBoosts.length > 0;
      if (!hasActiveBoost) return;
      clearBoostTimeout(postId, 'crossCampus');
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                crossCampusBoosts: [],
                crossCampusBoostedAt: null,
                crossCampusUntil: null,
              }
            : p
        ),
      }));
      get().saveToLocalStorage();
      toast('Cross-campus boost expired', { icon: '⏱️' });
    }
  };

  const scheduleBoostTimeout = (postId: string, type: BoostType, expiresAt: number) => {
    if (typeof window === 'undefined') return;
    const timeLeft = expiresAt - Date.now();
    if (timeLeft <= 0) {
      handleBoostExpiry(postId, type);
      return;
    }

    clearBoostTimeout(postId, type);

    const timeoutId = window.setTimeout(() => {
      handleBoostExpiry(postId, type);
    }, timeLeft);

    set((state) => ({
      boostTimeouts: {
        ...state.boostTimeouts,
        [postId]: {
          ...state.boostTimeouts[postId],
          [type]: timeoutId,
        },
      },
    }));
  };

  const scheduleExistingBoosts = (post: Post) => {
    if (post.highlightedUntil && post.highlightedUntil > Date.now() && post.isHighlighted) {
      scheduleBoostTimeout(post.id, 'highlight', post.highlightedUntil);
    }

    if (
      post.crossCampusUntil &&
      post.crossCampusUntil > Date.now() &&
      Array.isArray(post.crossCampusBoosts) &&
      post.crossCampusBoosts.length > 0
    ) {
      scheduleBoostTimeout(post.id, 'crossCampus', post.crossCampusUntil);
    }
  };

  const initialTotalVoice = rewardEngine.getTotalEarned();
  const initialRank = AchievementService.getRank(initialTotalVoice);
  const initialNextRankData = AchievementService.getNextRank(initialTotalVoice);

  return {
    studentId: initialStudentId,
    isModerator: initialIsModerator,
    posts: [],
    bookmarkedPosts: [],
    reports: [],
    moderatorActions: [],
    notifications: [],
    unreadCount: 0,
    encryptionKeys: {},
    expiryTimeouts: {},
    boostTimeouts: {},
    communitySupport: {},
    showCrisisModal: false,
    pendingPost: null,
    savedHelplines: getSavedHelplinesFromStorage(),
    emergencyBannerDismissedUntil: getEmergencyBannerDismissedUntil(),
    memorialTributes: [],
    nftBadges: initialNFTBadges,

    referralCode: initialReferralState.code,
    referredByCode: initialReferralState.referredByCode,
    referredFriends: initialReferralState.friends,

    toggleModeratorMode: () => {
      set((state) => {
        const next = !state.isModerator;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.IS_MODERATOR, next ? 'true' : 'false');
        }
        if (next) {
          toast.success('Moderator mode enabled');
        } else {
          toast('Moderator mode disabled', { icon: 'ℹ️' });
        }
        return { isModerator: next };
      });
    },

    // Wallet & Token state initialization - now using RewardEngine
    connectedAddress: null,
    anonymousWalletAddress:
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ANON_WALLET_ADDRESS) : null,
    voiceBalance: rewardEngine.getBalance(),
    pendingRewards: rewardEngine.getPending(),
    totalRewardsEarned: rewardEngine.getTotalEarned(),
    claimedRewards: rewardEngine.getClaimed(),
    spentRewards: rewardEngine.getSpent(),
    availableBalance: rewardEngine.getAvailableBalance(),
    pendingRewardBreakdown: rewardEngine.getPendingBreakdown(),
    earningsBreakdown: rewardEngine.getEarningsBreakdown(),
    transactionHistory: rewardEngine.getTransactionHistory(),
    lastLoginDate: rewardEngine.getStreakData().lastLoginDate,
    loginStreak: rewardEngine.getStreakData().currentStreak,
    lastPostDate: rewardEngine.getStreakData().lastPostDate,
    postingStreak: rewardEngine.getStreakData().currentPostStreak,
    premiumSubscriptions: rewardEngine.getSubscriptions(),
    achievements: rewardEngine.getAchievements(),
    achievementProgress: {},
    currentRank: initialRank,
    nextRank: initialNextRankData.nextRank,
    rankProgressPercentage: initialNextRankData.currentProgress,
    voiceToNextRank: initialNextRankData.voiceNeeded,
    walletLoading: false,
    walletError: null,
    firstPostAwarded: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.FIRST_POST_AWARDED) === 'true' : false,

    // Web3 bridge state
    selectedChainId: DEFAULT_CHAIN_ID,
    chainBalances: INITIAL_CHAIN_BALANCES,
    bridgeStatus: web3Bridge ? web3Bridge.getStatus() : null,
    bridgeTransactions: web3Bridge ? web3Bridge.getPendingTransactions() : [],
    stakingPositions: [],
    governanceProposals: [],
    governanceVotingPower: 0,
    nftAchievements: [],

    setShowCrisisModal: (show: boolean) => set({ showCrisisModal: show }),
    setPendingPost: (post: AddPostPayload | null) => set({ pendingPost: post }),

    toggleSaveHelpline: (helplineId: string) => {
      const current = get().savedHelplines;
      const updated = current.includes(helplineId)
        ? current.filter((id) => id !== helplineId)
        : [...current, helplineId];
      set({ savedHelplines: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SAVED_HELPLINES, JSON.stringify(updated));
      }
      toast.success(current.includes(helplineId) ? 'Helpline removed' : 'Helpline saved! 🔖');
    },

  setConnectedAddress: (address: string | null) => {
    set({ connectedAddress: address });
  },

  setAnonymousWallet: (address: string | null) => {
    if (typeof window !== 'undefined') {
      if (address) {
        localStorage.setItem(STORAGE_KEYS.ANON_WALLET_ADDRESS, address);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ANON_WALLET_ADDRESS);
        clearSecureItem(STORAGE_KEYS.ANON_WALLET_ENCRYPTED_KEY);
      }
    }
    set({ anonymousWalletAddress: address });
  },

  generateAnonymousWallet: async (password: string) => {
    const wallet = Wallet.createRandom();
    if (!wallet.privateKey) {
      throw new Error('Failed to generate wallet');
    }

    setSecureItem(STORAGE_KEYS.ANON_WALLET_ENCRYPTED_KEY, { privateKey: wallet.privateKey }, password);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ANON_WALLET_ADDRESS, wallet.address);
    }

    set({ anonymousWalletAddress: wallet.address });
    toast.success('Anonymous wallet created successfully!');

    return {
      address: wallet.address,
      mnemonic: wallet.mnemonic?.phrase ?? '',
    };
  },

  importAnonymousWallet: async (mnemonic: string, password: string) => {
    const wallet = Wallet.fromMnemonic(mnemonic.trim());
    setSecureItem(STORAGE_KEYS.ANON_WALLET_ENCRYPTED_KEY, { privateKey: wallet.privateKey }, password);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ANON_WALLET_ADDRESS, wallet.address);
    }
    set({ anonymousWalletAddress: wallet.address });
    toast.success('Anonymous wallet imported');
    return { address: wallet.address };
  },

  loadAnonymousWallet: async (password: string) => {
    const stored = getSecureItem<{ privateKey: string }>(STORAGE_KEYS.ANON_WALLET_ENCRYPTED_KEY, password);
    if (!stored?.privateKey) {
      return null;
    }
    return new Wallet(stored.privateKey);
  },

  clearAnonymousWallet: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ANON_WALLET_ADDRESS);
    }
    clearSecureItem(STORAGE_KEYS.ANON_WALLET_ENCRYPTED_KEY);
    set({ anonymousWalletAddress: null });
  },

  earnVoice: (
    amount: number,
    reason: string,
    category: keyof EarningsBreakdown = 'bonuses',
    metadata: Record<string, unknown> = {}
  ) => {
    const state = get();
    rewardEngine.awardTokens(state.studentId, amount, reason, category, metadata);
  },

  spendVoice: (amount: number, reason: string, metadata: Record<string, unknown> = {}) => {
    const state = get();
    rewardEngine.spendTokens(state.studentId, amount, reason, metadata);
  },

  claimRewards: async () => {
    set({ walletLoading: true, walletError: null });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const state = get();
    const success = await rewardEngine.claimRewards(state.studentId, state.connectedAddress ?? undefined);
    if (!success) {
      set({ walletLoading: false, walletError: 'Failed to claim rewards. Please try again.' });
      throw new Error('Failed to claim rewards. Please try again.');
    }

    syncRewardState();
    set({ walletLoading: false, walletError: null });
  },

  loadWalletData: () => {
    set({ walletLoading: true, walletError: null });
    const snapshot = rewardEngine.getWalletSnapshot();
    set({
      voiceBalance: snapshot.balance,
      pendingRewards: snapshot.pending,
      totalRewardsEarned: snapshot.totalEarned,
      claimedRewards: snapshot.claimed,
      spentRewards: snapshot.spent,
      availableBalance: rewardEngine.getAvailableBalance(),
      pendingRewardBreakdown: rewardEngine.getPendingBreakdown(),
      earningsBreakdown: snapshot.earningsBreakdown,
      transactionHistory: snapshot.transactions,
      anonymousWalletAddress:
        typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ANON_WALLET_ADDRESS) : null,
      lastLoginDate: snapshot.lastLogin,
      loginStreak: snapshot.streakData.currentStreak,
      lastPostDate: snapshot.streakData.lastPostDate,
      postingStreak: snapshot.streakData.currentPostStreak,
      premiumSubscriptions: snapshot.subscriptions,
      walletLoading: false,
    });

    if (typeof window !== 'undefined') {
      const state = get();
      void rewardEngine.checkSubscriptionRenewals(state.studentId);
    }
  },

  grantDailyLoginBonus: () => {
    if (typeof window === 'undefined') return;
    const state = get();
    rewardEngine.processDailyBonus(state.studentId);
    rewardEngine.checkSubscriptionRenewals(state.studentId);
  },

  checkSubscriptionRenewals: () => {
    if (typeof window === 'undefined') return;
    const state = get();
    rewardEngine.checkSubscriptionRenewals(state.studentId);
  },

  activatePremium: async (feature: PremiumFeatureType, cost?: number) => {
    const state = get();
    return await rewardEngine.activatePremiumFeature(state.studentId, feature, cost);
  },

  deactivatePremium: async (feature: PremiumFeatureType) => {
    return await rewardEngine.deactivatePremiumFeature(feature);
  },

  isPremiumActive: (feature: PremiumFeatureType) => {
    return rewardEngine.isPremiumFeatureActive(feature);
  },

  generateReferralCode: () => {
    const state = get();
    const currentNormalized = normalizeInviteCode(state.referralCode);
    let newCode = generateReferralCodeForStudent(state.studentId);
    let attempts = 0;

    while (normalizeInviteCode(newCode) === currentNormalized && attempts < 5) {
      attempts += 1;
      newCode = generateReferralCodeForStudent(`${state.studentId}-${Math.random().toString(36).slice(2, 4)}`);
    }

    const snapshot: ReferralStorageState = {
      code: normalizeInviteCode(newCode),
      referredByCode: state.referredByCode ? normalizeInviteCode(state.referredByCode) : null,
      friends: state.referredFriends.map((friend) => ({
        ...friend,
        codeUsed: normalizeInviteCode(friend.codeUsed),
      })),
    };

    set({ referralCode: snapshot.code, referredFriends: snapshot.friends });
    persistReferralState(snapshot);
    toast.success('Invite code refreshed!');
    return snapshot.code;
  },

  simulateReferralJoin: (code: string, friendName: string) => {
    const normalizedCode = normalizeInviteCode(code);
    const trimmedName = friendName.trim();

    if (normalizedCode.length === 0) {
      toast.error('Enter an invite code to simulate a join.');
      return false;
    }

    if (trimmedName.length === 0) {
      toast.error('Give your friend a name to track their progress.');
      return false;
    }

    const state = get();
    const userCode = normalizeInviteCode(state.referralCode);

    if (normalizedCode !== userCode) {
      toast.error('That invite code does not match your current referral code.');
      return false;
    }

    const duplicate = state.referredFriends.some(
      (friend) =>
        normalizeInviteCode(friend.codeUsed) === normalizedCode && friend.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      toast.error(`${trimmedName} is already linked to this invite code.`);
      return false;
    }

    const newFriend: ReferralFriend = {
      id: crypto.randomUUID(),
      name: trimmedName,
      codeUsed: normalizedCode,
      joinedAt: Date.now(),
      firstPostAt: null,
      firstPostRewarded: false,
    };

    const updatedFriends = [newFriend, ...state.referredFriends].sort((a, b) => b.joinedAt - a.joinedAt);

    set({ referredFriends: updatedFriends });

    persistReferralState({
      code: userCode,
      referredByCode: state.referredByCode ? normalizeInviteCode(state.referredByCode) : null,
      friends: updatedFriends,
    });

    get().earnVoice(EARN_RULES.referralJoin, 'Friend joined with your invite', 'referrals', {
      referralEvent: 'friend_join',
      friendId: newFriend.id,
      friendName: newFriend.name,
      inviteCode: userCode,
    });

    toast.success(`${newFriend.name} joined! +${EARN_RULES.referralJoin} VOICE earned.`);
    return true;
  },

  markReferralFirstPost: (friendId: string) => {
    const state = get();
    const target = state.referredFriends.find((friend) => friend.id === friendId);

    if (!target) {
      toast.error('Could not find that referral friend.');
      return false;
    }

    if (target.firstPostRewarded) {
      toast('First-post reward already granted for this friend.', { icon: 'ℹ️' });
      return false;
    }

    const updatedFriend: ReferralFriend = {
      ...target,
      firstPostRewarded: true,
      firstPostAt: Date.now(),
    };

    const updatedFriends = state.referredFriends
      .map((friend) => (friend.id === friendId ? updatedFriend : friend))
      .sort((a, b) => b.joinedAt - a.joinedAt);

    set({ referredFriends: updatedFriends });

    persistReferralState({
      code: normalizeInviteCode(state.referralCode),
      referredByCode: state.referredByCode ? normalizeInviteCode(state.referredByCode) : null,
      friends: updatedFriends,
    });

    get().earnVoice(EARN_RULES.referralFirstPost, 'Referred friend shared their first post', 'referrals', {
      referralEvent: 'friend_first_post',
      friendId: updatedFriend.id,
      friendName: updatedFriend.name,
      inviteCode: updatedFriend.codeUsed,
    });

    toast.success(`Celebrating ${updatedFriend.name}'s first post! +${EARN_RULES.referralFirstPost} VOICE earned.`);
    return true;
  },

  loadReferralData: () => {
    const snapshot = readReferralState(get().studentId);
    set({
      referralCode: snapshot.code,
      referredByCode: snapshot.referredByCode,
      referredFriends: snapshot.friends,
    });
  },

  // Social Spending Functions
  tipUser: (userId: string, postId: string, amount: number) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);
    
    if (!post) {
      toast.error('Post not found');
      return false;
    }

    if (post.studentId !== userId) {
      toast.error('User ID does not match post author');
      return false;
    }

    if (userId === state.studentId) {
      toast.error('You cannot tip your own post');
      return false;
    }

    if (amount < 1 || amount > 100) {
      toast.error('Tip amount must be between 1 and 100 VOICE');
      return false;
    }

    if (state.voiceBalance < amount) {
      toast.error(`Insufficient balance. Need ${amount} VOICE to send tip`);
      return false;
    }

    // Deduct from tipper
    get().spendVoice(amount, `Tip for post`, {
      postId,
      recipientId: userId,
      action: 'tip_user',
      tipAmount: amount,
    });

    // Award to recipient
    void rewardEngine.awardTokens(userId, amount, `Received tip from ${state.studentId}`, 'bonuses', {
      postId,
      tipperId: state.studentId,
      action: 'received_tip',
      tipAmount: amount,
    });

    // Notify recipient
    get().addNotification({
      recipientId: userId,
      type: 'award',
      postId,
      actorId: state.studentId,
      message: `Received ${amount} VOICE tip on your post! 💰`,
    });

    toast.success(`Sent ${amount} VOICE tip! 💰`);
    return true;
  },

  sendAnonymousGift: (userId: string, amount: number) => {
    const state = get();

    if (userId === state.studentId) {
      toast.error('You cannot gift yourself');
      return false;
    }

    if (amount !== 10) {
      toast.error('Anonymous gift amount must be 10 VOICE');
      return false;
    }

    if (state.voiceBalance < amount) {
      toast.error(`Insufficient balance. Need ${amount} VOICE to send gift`);
      return false;
    }

    // Deduct from sender
    get().spendVoice(amount, `Anonymous gift sent`, {
      recipientId: userId,
      action: 'anonymous_gift',
      giftAmount: amount,
    });

    // Award to recipient
    void rewardEngine.awardTokens(userId, amount, `Received anonymous gift`, 'bonuses', {
      action: 'received_anonymous_gift',
      giftAmount: amount,
    });

    // Notify recipient
    get().addNotification({
      recipientId: userId,
      type: 'award',
      postId: '',
      actorId: 'anonymous',
      message: `Someone sent you an anonymous gift of ${amount} VOICE! 🎁`,
    });

    toast.success(`Sent ${amount} VOICE anonymous gift! 🎁`);
    return true;
  },

  sponsorHelpline: (amount: number) => {
    const state = get();

    if (amount !== 100) {
      toast.error('Helpline sponsorship amount must be 100 VOICE');
      return false;
    }

    if (state.voiceBalance < amount) {
      toast.error(`Insufficient balance. Need ${amount} VOICE to sponsor helpline`);
      return false;
    }

    // Deduct from sponsor
    get().spendVoice(amount, `Sponsored helpline support`, {
      action: 'sponsor_helpline',
      sponsorshipAmount: amount,
    });

    toast.success(`Sponsored helpline with ${amount} VOICE! 💙 Thank you for supporting mental health resources.`, {
      duration: 5000,
    });
    return true;
  },

  purchaseNFTBadge: (tier, cost) => {
    const definition = NFT_BADGE_DEFINITIONS[tier];
    if (!definition) {
      toast.error('Badge tier unavailable right now.');
      return false;
    }

    if (cost !== definition.cost) {
      toast.error('Badge cost mismatch detected. Please refresh and try again.');
      return false;
    }

    const state = get();

    const ownsBadge = state.nftBadges.some((badge) => badge.tier === tier);
    if (ownsBadge) {
      toast('You already own this NFT badge!', { icon: '✨' });
      return false;
    }

    if (state.voiceBalance < definition.cost) {
      toast.error(`Insufficient balance. Need ${definition.cost} VOICE to purchase ${definition.label}.`);
      return false;
    }

    const purchasedAt = Date.now();
    const badge: NFTBadge = {
      id: crypto.randomUUID(),
      tier,
      purchasedAt,
      purchasedBy: state.studentId,
      cost: definition.cost,
    };

    get().spendVoice(definition.cost, `Purchased ${definition.label} NFT Badge`, {
      action: 'purchase_nft_badge',
      badgeTier: tier,
      badgeName: definition.label,
      badgeCost: definition.cost,
      purchasedAt,
    });

    set((current) => {
      const nextBadges = [...current.nftBadges, badge];
      persistNFTBadges(nextBadges);
      return { nftBadges: nextBadges };
    });

    get().saveToLocalStorage();

    toast.custom(
      (t) =>
        createElement(
          'div',
          {
            className:
              'pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 flex items-center space-x-3 shadow-lg',
            style: { borderColor: definition.accent },
          },
          createElement(
            'div',
            {
              className: `w-12 h-12 rounded-full bg-gradient-to-br ${definition.gradientFrom} ${definition.gradientTo} flex items-center justify-center text-xl shadow-inner`,
              style: { boxShadow: `0 0 18px ${definition.accent}55` },
            },
            definition.icon
          ),
          createElement(
            'div',
            { className: 'flex flex-col text-white text-sm max-w-xs' },
            createElement('span', { className: 'font-semibold' }, `${definition.label} Badge Unlocked!`),
            createElement('span', { className: 'text-xs text-gray-300 mt-1 leading-snug' }, definition.description),
            createElement(
              'span',
              { className: 'text-[11px] text-primary font-semibold mt-2' },
              `-${definition.cost} VOICE`
            )
          ),
          createElement(
            'button',
            {
              className: 'text-xs text-gray-400 hover:text-white transition-colors',
              onClick: () => toast.dismiss(t.id),
              type: 'button',
            },
            'Close'
          )
        ),
      { duration: 5000 }
    );

    if (navigator.vibrate) {
      navigator.vibrate(40);
    }

    return true;
  },

  hasNFTBadge: (tier) => {
    return get().nftBadges.some((badge) => badge.tier === tier);
  },

  loadNFTBadges: () => {
    if (typeof window === 'undefined') return;
    const badges = readStoredNFTBadges();
    set({ nftBadges: badges });
  },

  dismissEmergencyBanner: () => {
    const dismissedUntil = Date.now() + 5 * 60 * 1000;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.EMERGENCY_BANNER, dismissedUntil.toString());
    }
    set({ emergencyBannerDismissedUntil: dismissedUntil });
  },

  checkEmergencyBannerStatus: () => {
    const dismissedUntil = getEmergencyBannerDismissedUntil();
    set({ emergencyBannerDismissedUntil: dismissedUntil });
  },

  initStudentId: () => {
    const id = generateStudentId();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.STUDENT_ID, id);
    }
    set({ studentId: id });
  },

  initializeStore: () => {
    if (typeof window === 'undefined') return;

    const storedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
    const storedBookmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    const storedReports = localStorage.getItem(STORAGE_KEYS.REPORTS);
    const storedModActions = localStorage.getItem(STORAGE_KEYS.MODERATOR_ACTIONS);
    const storedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const storedEncryptionKeys = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEYS);

    const rawPosts = storedPosts ? (JSON.parse(storedPosts) as Post[]) : [];
    const bookmarkedPosts = storedBookmarks ? JSON.parse(storedBookmarks) : [];
    const rawReports = storedReports ? (JSON.parse(storedReports) as Array<Partial<Report>>) : [];
    const rawModActions = storedModActions ? (JSON.parse(storedModActions) as Array<Partial<ModeratorAction>>) : [];
    const notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    const encryptionKeys = storedEncryptionKeys ? JSON.parse(storedEncryptionKeys) : {};

    const reportCollection = new Map<string, Report>();
    rawReports.forEach((rawReport) => {
      upsertReport(reportCollection, rawReport);
    });

    const moderatorActions = rawModActions
      .map(normalizeModeratorAction)
      .filter((action): action is ModeratorAction => action !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_MODERATOR_ACTIONS);

    const studentId = get().studentId;

    let posts: Post[] = rawPosts.map((post) => {
      const normalizedExpiresAt = typeof post.expiresAt === 'number' ? post.expiresAt : null;
      const normalizedLifetime: PostLifetime = post.lifetime ?? (normalizedExpiresAt ? 'custom' : 'never');
      const normalizedCustomHours =
        typeof post.customLifetimeHours === 'number' ? post.customLifetimeHours : null;
      const normalizedMeta =
        post.encryptionMeta && post.encryptionMeta.iv && post.encryptionMeta.keyId
          ? {
              iv: post.encryptionMeta.iv,
              algorithm: 'AES-GCM-256' as const,
              keyId: post.encryptionMeta.keyId,
            }
          : null;

      const normalizedComments = normalizeStoredComments((post.comments as StoredComment[] | undefined) ?? []);
      const normalizedCommentCount = countAllComments(normalizedComments);
      const normalizedReportsForPost = Array.isArray(post.reports)
        ? (post.reports as Array<Partial<Report>>).map((rawReport) => upsertReport(reportCollection, rawReport))
        : [];
      const nowTs = Date.now();
      const rawPinnedAt = typeof post.pinnedAt === 'number' ? post.pinnedAt : null;
      const rawHighlightUntil = typeof post.highlightedUntil === 'number' ? post.highlightedUntil : null;
      const highlightActive = Boolean(post.isHighlighted && rawHighlightUntil && rawHighlightUntil > nowTs);
      const sanitizedHighlightUntil = highlightActive ? rawHighlightUntil : null;
      const rawHighlightAt = typeof post.highlightedAt === 'number' ? post.highlightedAt : null;
      const normalizedExtendedHours =
        typeof post.extendedLifetimeHours === 'number' && Number.isFinite(post.extendedLifetimeHours)
          ? Math.max(0, Math.round(post.extendedLifetimeHours))
          : 0;
      const rawCrossUntil = typeof post.crossCampusUntil === 'number' ? post.crossCampusUntil : null;
      const crossCampuses = Array.isArray(post.crossCampusBoosts)
        ? (post.crossCampusBoosts as string[])
            .map((id) => (typeof id === 'string' ? id.trim() : String(id || '')).trim())
            .filter((id) => id.length > 0)
        : [];
      const crossActive = Boolean(rawCrossUntil && rawCrossUntil > nowTs && crossCampuses.length > 0);
      const rawCrossBoostedAt = typeof post.crossCampusBoostedAt === 'number' ? post.crossCampusBoostedAt : null;

      return {
        ...post,
        comments: normalizedComments,
        commentCount: normalizedCommentCount,
        expiresAt: normalizedExpiresAt,
        lifetime: normalizedLifetime,
        customLifetimeHours: normalizedLifetime === 'custom' ? normalizedCustomHours : null,
        isEncrypted: normalizedMeta ? true : Boolean(post.isEncrypted),
        encryptionMeta: normalizedMeta,
        imageUrl: typeof post.imageUrl === 'string' ? post.imageUrl : null,
        warningShown: post.warningShown ?? false,
        isViral: post.isViral ?? false,
        viralAwardedAt: post.viralAwardedAt ?? null,
        reports: normalizedReportsForPost,
        reportCount:
          typeof post.reportCount === 'number' ? Math.max(post.reportCount, normalizedReportsForPost.length) : normalizedReportsForPost.length,
        pinnedAt: rawPinnedAt ?? (post.isPinned ? (typeof post.createdAt === 'number' ? post.createdAt : nowTs) : null),
        isHighlighted: highlightActive,
        highlightedAt: highlightActive ? (rawHighlightAt ?? nowTs) : null,
        highlightedUntil: sanitizedHighlightUntil,
        extendedLifetimeHours: normalizedExtendedHours,
        crossCampusBoosts: crossActive ? crossCampuses : [],
        crossCampusBoostedAt: crossActive ? (rawCrossBoostedAt ?? nowTs) : null,
        crossCampusUntil: crossActive ? rawCrossUntil : null,
      };
    });

    const reports = Array.from(reportCollection.values()).sort((a, b) => b.reportedAt - a.reportedAt);


    const storedFirstPostFlag = localStorage.getItem(STORAGE_KEYS.FIRST_POST_AWARDED) === 'true';
    const hasExistingPosts = rawPosts.some((post) => post.studentId === studentId);
    const firstPostAwarded = storedFirstPostFlag || hasExistingPosts;

    if (firstPostAwarded && !storedFirstPostFlag) {
      localStorage.setItem(STORAGE_KEYS.FIRST_POST_AWARDED, 'true');
    }

    if (posts.length === 0) {
      const nowStamp = Date.now();
      posts = [
        {
          id: crypto.randomUUID(),
          studentId: generateStudentId(),
          content:
            'Feeling overwhelmed with academics and expectations. Sometimes it feels like no one understands the pressure we face. 😔',
          category: 'Mental Health',
          reactions: { heart: 12, fire: 3, clap: 8, sad: 15, angry: 2, laugh: 0 },
          commentCount: 4,
          comments: [],
          createdAt: nowStamp - 86400000 * 2,
          isEdited: false,
          editedAt: null,
          isPinned: false,
          isViral: false,
          viralAwardedAt: null,
          reportCount: 0,
          helpfulCount: 5,
          expiresAt: null,
          lifetime: 'never',
          customLifetimeHours: null,
          isEncrypted: false,
          encryptionMeta: null,
          warningShown: false,
          pinnedAt: null,
          isHighlighted: false,
          highlightedAt: null,
          highlightedUntil: null,
          extendedLifetimeHours: 0,
          crossCampusBoosts: [],
          crossCampusBoostedAt: null,
          crossCampusUntil: null,
        },
        {
          id: crypto.randomUUID(),
          studentId: generateStudentId(),
          content:
            'To anyone struggling: You are not alone. Reached out to a counselor today and it made such a difference. Please take that first step. 💜',
          category: 'Support',
          reactions: { heart: 45, fire: 12, clap: 23, sad: 2, angry: 0, laugh: 1 },
          commentCount: 8,
          comments: [],
          createdAt: nowStamp - 43200000,
          isEdited: false,
          editedAt: null,
          isPinned: false,
          isViral: false,
          viralAwardedAt: null,
          reportCount: 0,
          helpfulCount: 18,
          expiresAt: nowStamp + 24 * 60 * 60 * 1000,
          lifetime: '24h',
          customLifetimeHours: null,
          isEncrypted: false,
          encryptionMeta: null,
          warningShown: false,
          pinnedAt: null,
          isHighlighted: false,
          highlightedAt: null,
          highlightedUntil: null,
          extendedLifetimeHours: 0,
          crossCampusBoosts: [],
          crossCampusBoostedAt: null,
          crossCampusUntil: null,
        },
        {
          id: crypto.randomUUID(),
          studentId: generateStudentId(),
          content:
            'Exam season is here and the anxiety is real. Let\'s support each other through this! Drop your coping strategies below 👇',
          category: 'Academic Stress',
          reactions: { heart: 23, fire: 8, clap: 15, sad: 7, angry: 1, laugh: 3 },
          commentCount: 12,
          comments: [],
          createdAt: nowStamp - 7200000,
          isEdited: false,
          editedAt: null,
          isPinned: false,
          isViral: false,
          viralAwardedAt: null,
          reportCount: 0,
          helpfulCount: 10,
          expiresAt: nowStamp + 7 * 24 * 60 * 60 * 1000,
          lifetime: '7d',
          customLifetimeHours: null,
          isEncrypted: false,
          encryptionMeta: null,
          warningShown: false,
          pinnedAt: null,
          isHighlighted: false,
          highlightedAt: null,
          highlightedUntil: null,
          extendedLifetimeHours: 0,
          crossCampusBoosts: [],
          crossCampusBoostedAt: null,
          crossCampusUntil: null,
        },
      ];
    }

    // Remove already-expired posts
    const now = Date.now();
    const validPosts = posts.filter((post: Post) => !post.expiresAt || post.expiresAt > now);

    const unreadCount = notifications.filter((n: Notification) => !n.read).length;

    set({ posts: validPosts, bookmarkedPosts, reports, moderatorActions, notifications, unreadCount, encryptionKeys, firstPostAwarded });

    // Schedule expiry for posts
    validPosts.forEach((post: Post) => {
      if (post.expiresAt) {
        get().scheduleExpiry(post);
      }
      scheduleExistingBoosts(post);
    });

    get().loadMemorialData();
    get().loadNFTBadges();
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;

    const state = get();
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(state.posts));
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarkedPosts));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(state.reports));
    localStorage.setItem(STORAGE_KEYS.MODERATOR_ACTIONS, JSON.stringify(state.moderatorActions));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(state.notifications));
    localStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEYS, JSON.stringify(state.encryptionKeys));
    localStorage.setItem(STORAGE_KEYS.SAVED_HELPLINES, JSON.stringify(state.savedHelplines));
    localStorage.setItem(STORAGE_KEYS.FIRST_POST_AWARDED, state.firstPostAwarded ? 'true' : 'false');
    localStorage.setItem(STORAGE_KEYS.MEMORIAL_TRIBUTES, JSON.stringify(state.memorialTributes));
    persistNFTBadges(state.nftBadges);
  },

  addPost: (
    content: string,
    category?: string,
    lifetime: PostLifetime = '24h',
    customHours?: number,
    isEncrypted?: boolean,
    encryptedData?: { encrypted: string; iv: string; keyId: string },
    moderationData?: {
      issues?: PostModerationIssue[];
      needsReview?: boolean;
      contentBlurred?: boolean;
      blurReason?: string | null;
      isCrisisFlagged?: boolean;
      crisisLevel?: 'high' | 'critical';
    },
    imageUrl?: string
  ) => {
    const storeState = get();
    const isFirstPost = !storeState.firstPostAwarded;
    const hasImage = Boolean(imageUrl);
    
    const lifetimeMap: Record<PostLifetime, number | null> = {
      '1h': 1 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      custom: customHours ? customHours * 60 * 60 * 1000 : null,
      never: null,
    };

    const duration = lifetimeMap[lifetime];
    const expiresAt = duration !== null ? Date.now() + duration : null;

    const newPost: Post = {
      id: crypto.randomUUID(),
      studentId: storeState.studentId,
      content: isEncrypted && encryptedData ? encryptedData.encrypted : content,
      category,
      reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
      commentCount: 0,
      comments: [],
      createdAt: Date.now(),
      isEdited: false,
      editedAt: null,
      isPinned: false,
      isViral: false,
      viralAwardedAt: null,
      reportCount: 0,
      helpfulCount: 0,
      expiresAt,
      lifetime,
      customLifetimeHours: lifetime === 'custom' ? customHours ?? null : null,
      isEncrypted: Boolean(isEncrypted),
      encryptionMeta: isEncrypted && encryptedData
        ? {
            iv: encryptedData.iv,
            algorithm: 'AES-GCM-256' as const,
            keyId: encryptedData.keyId,
          }
        : null,
      imageUrl: imageUrl || null,
      warningShown: false,
      reports: [],
      moderationIssues: moderationData?.issues || [],
      needsReview: moderationData?.needsReview ?? false,
      contentBlurred: moderationData?.contentBlurred ?? false,
      blurReason: moderationData?.blurReason || null,
      isCrisisFlagged: moderationData?.isCrisisFlagged ?? false,
      crisisLevel: moderationData?.crisisLevel,
      supportOffered: moderationData?.isCrisisFlagged ?? false,
      flaggedAt: moderationData?.isCrisisFlagged ? Date.now() : null,
      flaggedForSupport: moderationData?.isCrisisFlagged ?? false,
    };

    set((state) => ({
      posts: [newPost, ...state.posts],
    }));

    if (isFirstPost && !storeState.firstPostAwarded) {
      set({ firstPostAwarded: true });
    }

    get().saveToLocalStorage();

    // Schedule expiry if applicable
    if (expiresAt) {
      get().scheduleExpiry(newPost);
    }

    // Calculate post reward using RewardEngine
    const rewardBreakdown = rewardEngine.calculatePostReward({
      isFirstPost,
      hasImage,
      reactions: newPost.reactions,
      helpfulCount: newPost.helpfulCount,
      isCrisisFlagged: moderationData?.isCrisisFlagged,
    });

    const postRewardTotal = rewardBreakdown.base + rewardBreakdown.firstPost + rewardBreakdown.image;

    const postRewardMetadata = {
      postId: newPost.id,
      breakdown: rewardBreakdown,
      hasImage,
      imageUrl: imageUrl ?? null,
      isFirstPost,
      components: {
        base: rewardBreakdown.base,
        firstPost: rewardBreakdown.firstPost,
        image: rewardBreakdown.image,
      },
      isCrisis: moderationData?.isCrisisFlagged ?? false,
    };

    if (postRewardTotal > 0) {
      const reason = isFirstPost ? 'First post reward' : 'Post reward';
      rewardEngine.awardTokens(storeState.studentId, postRewardTotal, reason, 'posts', postRewardMetadata);
    }

    if (rewardBreakdown.crisis > 0) {
      const crisisMetadata = {
        postId: newPost.id,
        breakdown: rewardBreakdown,
        isCrisis: true,
        components: {
          crisis: rewardBreakdown.crisis,
        },
        imageUrl: imageUrl ?? null,
      };

      const delay = postRewardTotal > 0 ? 150 : 0;
      setTimeout(() => {
        rewardEngine.awardTokens(
          storeState.studentId,
          rewardBreakdown.crisis,
          'Crisis response support',
          'crisis',
          crisisMetadata
        );
      }, delay);
    }

    // Process daily posting streak
    const postStreakDelay = (postRewardTotal > 0 ? 150 : 0) + (rewardBreakdown.crisis > 0 ? 150 : 0);
    setTimeout(() => {
      rewardEngine
        .processPostingStreak(storeState.studentId)
        .then(() => {
          syncRewardState();
        })
        .catch((error) => {
          console.error('Failed to process posting streak', error);
        });
    }, postStreakDelay);

    toast.success('Post created! 🎉');
  },

  updatePost: (
    postId: string,
    content: string,
    options?: {
      lifetime?: PostLifetime;
      customHours?: number;
      isEncrypted?: boolean;
      encryptedData?: { encrypted: string; iv: string; keyId: string };
    }
  ) => {
    const lifetimeMap: Record<PostLifetime, number | null> = {
      '1h': 1 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      custom: options?.customHours ? options.customHours * 60 * 60 * 1000 : null,
      never: null,
    };

    const lifetime = options?.lifetime;
    const duration = lifetime ? lifetimeMap[lifetime] : undefined;
    const newExpiresAt = duration !== undefined ? (duration !== null ? Date.now() + duration : null) : undefined;

    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId) return post;

        // Clear existing timeout if changing expiry
        if (newExpiresAt !== undefined && post.expiresAt) {
          get().clearExpiryTimer(postId);
        }

        const updatedPost = {
          ...post,
          content: options?.isEncrypted && options.encryptedData ? options.encryptedData.encrypted : content,
          isEdited: true,
          editedAt: Date.now(),
          ...(newExpiresAt !== undefined && {
            expiresAt: newExpiresAt,
            warningShown: false,
          }),
          ...(lifetime && {
            lifetime,
            customLifetimeHours: lifetime === 'custom' ? options?.customHours ?? post.customLifetimeHours ?? null : null,
          }),
          ...(
            options?.customHours !== undefined && !lifetime && post.lifetime === 'custom'
              ? { customLifetimeHours: options.customHours }
              : {}
          ),
          ...(options?.isEncrypted !== undefined && { isEncrypted: Boolean(options.isEncrypted) }),
          ...(options?.isEncrypted && options.encryptedData
            ? {
                encryptionMeta: {
                  iv: options.encryptedData.iv,
                  algorithm: 'AES-GCM-256' as const,
                  keyId: options.encryptedData.keyId,
                } as EncryptionMeta,
              }
            : options?.isEncrypted === false
            ? { encryptionMeta: null }
            : {}),
        } as Post;

        // Schedule new expiry if applicable
        if (newExpiresAt && newExpiresAt > Date.now()) {
          get().scheduleExpiry(updatedPost);
        }

        return updatedPost;
      }),
    }));
    get().saveToLocalStorage();
    toast.success('Post updated! ✏️');
  },

  deletePost: (postId: string, options?: { silent?: boolean }) => {
    const post = get().posts.find((p) => p.id === postId);

    // Clear expiry timer
    if (post?.expiresAt) {
      get().clearExpiryTimer(postId);
    }

    set((state) => ({
      posts: state.posts.filter((post) => post.id !== postId),
      bookmarkedPosts: state.bookmarkedPosts.filter((id) => id !== postId),
    }));
    get().saveToLocalStorage();

    if (!options?.silent) {
      toast.success('Post deleted');
    }
  },

  togglePin: (postId: string) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;

    // Check if user owns the post
    if (post.studentId !== state.studentId) {
      toast.error('You can only pin your own posts');
      return;
    }

    // Count current pinned posts
    const pinnedCount = state.posts.filter((p) => p.isPinned && p.studentId === state.studentId).length;

    // If trying to pin and already have 3
    if (!post.isPinned && pinnedCount >= 3) {
      toast.error('Maximum 3 pinned posts allowed');
      return;
    }

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, isPinned: !p.isPinned } : p
      ),
    }));
    get().saveToLocalStorage();
    toast.success(post.isPinned ? 'Post unpinned' : 'Post pinned to top! 📌');
  },

  addReaction: (postId: string, reactionType: keyof Reaction) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;

    const actorId = state.studentId;
    const oldTotalReactions = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);
    const newTotalReactions = oldTotalReactions + 1;
    const crossedThreshold =
      !post.isViral &&
      oldTotalReactions < VIRAL_REACTION_THRESHOLD &&
      newTotalReactions >= VIRAL_REACTION_THRESHOLD;

    const awardTimestamp = crossedThreshold ? Date.now() : null;

    // Update post with reaction
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              reactions: {
                ...p.reactions,
                [reactionType]: p.reactions[reactionType] + 1,
              },
              ...(crossedThreshold
                ? {
                    isViral: true,
                    viralAwardedAt: awardTimestamp,
                  }
                : {}),
            }
          : p
      ),
    }));
    get().saveToLocalStorage();

    // Trigger haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const reactionRewardId = `reaction:${postId}:${actorId}`;
    const transactionHistory = rewardEngine.getTransactionHistory();

    type ReactionRewardMetadata = {
      rewardId?: string;
      recipientRole?: 'giver' | 'receiver';
      userId?: string;
      [key: string]: unknown;
    };

    const hasReward = (role: ReactionRewardMetadata['recipientRole'], userId: string) =>
      transactionHistory.some((tx) => {
        if (tx.type !== 'earn' || !tx.metadata) {
          return false;
        }
        const metadata = tx.metadata as ReactionRewardMetadata;
        return (
          metadata.rewardId === reactionRewardId &&
          metadata.recipientRole === role &&
          metadata.userId === userId
        );
      });

    if (!hasReward('giver', actorId)) {
      get().earnVoice(EARN_RULES.reactionGiven, 'Reaction given', 'reactions', {
        rewardId: reactionRewardId,
        recipientRole: 'giver',
        postId,
        reactionType,
        reactionEmoji: getEmojiForReaction(reactionType),
      });
    }

    if (post.studentId !== actorId && !hasReward('receiver', post.studentId)) {
      void rewardEngine.awardTokens(post.studentId, EARN_RULES.reactionReceived, 'Reaction received', 'reactions', {
        rewardId: reactionRewardId,
        recipientRole: 'receiver',
        postId,
        reactionType,
        reactionEmoji: getEmojiForReaction(reactionType),
        fromUser: actorId,
      });
    }

    // Add notification if reacting to someone else's post
    if (post.studentId !== actorId) {
      get().addNotification({
        recipientId: post.studentId,
        type: 'reaction',
        postId,
        actorId,
        message: `reacted ${getEmojiForReaction(reactionType)} to your post`,
      });
    }

    // Handle viral post reward
    if (crossedThreshold && awardTimestamp) {
      rewardEngine.awardTokens(post.studentId, VIRAL_REWARD_AMOUNT, 'Viral post reward', 'posts', {
        postId,
        totalReactions: newTotalReactions,
        viralThreshold: VIRAL_REACTION_THRESHOLD,
        awardedAt: awardTimestamp,
        triggeringReaction: reactionType,
        triggeredBy: actorId,
        rewardAmount: VIRAL_REWARD_AMOUNT,
        event: 'viral_post_reward',
      });

      const isOwner = post.studentId === actorId;
      toast.success(
        isOwner
          ? 'Your post just went viral! +150 VOICE 🎉'
          : 'Post went viral! +150 VOICE awarded to the creator 🎉'
      );
    }
  },

  incrementHelpful: (postId: string) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, helpfulCount: p.helpfulCount + 1 } : p
      ),
    }));
    get().saveToLocalStorage();
    toast.success('You awarded this post! 🌟');

    get().earnVoice(EARN_RULES.helpfulPost, 'Post marked as helpful', 'helpful', {
      postId,
    });

    // Add notification
    if (post.studentId !== get().studentId) {
      get().addNotification({
        recipientId: post.studentId,
        type: 'award',
        postId,
        actorId: get().studentId,
        message: 'marked your post as helpful! +50 VOICE',
      });
    }
  },

  addComment: (postId: string, content: string, parentCommentId?: string) => {
    const currentStudentId = get().studentId;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      postId,
      parentCommentId: parentCommentId || null,
      studentId: currentStudentId,
      content,
      reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
      replies: [],
      createdAt: Date.now(),
      isEdited: false,
      editedAt: null,
      helpfulVotes: 0,
      helpfulRewardAwarded: false,
      crisisSupportRewardAwarded: false,
      isVerifiedAdvice: false,
      verifiedAdviceRewardAwarded: false,
    };

    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId) return post;

        if (parentCommentId) {
          // Add as reply to parent comment
          const updatedComments = findAndUpdateComment(
            post.comments,
            parentCommentId,
            (comment) => ({
              ...comment,
              replies: [...comment.replies, newComment],
            })
          );
          return {
            ...post,
            comments: updatedComments,
            commentCount: countAllComments(updatedComments),
          };
        }

        // Add as root comment
        const updatedComments = [...post.comments, newComment];
        return {
          ...post,
          comments: updatedComments,
          commentCount: countAllComments(updatedComments),
        };
      }),
    }));
    get().saveToLocalStorage();
    toast.success('Comment posted! 💬');

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const post = get().posts.find((p) => p.id === postId);

    const commentRewardId = `comment:${newComment.id}`;
    const transactionHistory = rewardEngine.getTransactionHistory();

    type CommentRewardMetadata = {
      rewardId?: string;
      recipientRole?: 'author' | 'postOwner';
      userId?: string;
      [key: string]: unknown;
    };

    const hasReward = (role: CommentRewardMetadata['recipientRole'], userId: string) =>
      transactionHistory.some((tx) => {
        if (tx.type !== 'earn' || !tx.metadata) {
          return false;
        }
        const metadata = tx.metadata as CommentRewardMetadata;
        return (
          metadata.rewardId === commentRewardId &&
          metadata.recipientRole === role &&
          metadata.userId === userId
        );
      });

    if (parentCommentId) {
      if (!hasReward('author', currentStudentId)) {
        rewardEngine.awardTokens(
          currentStudentId,
          EARN_RULES.reply,
          'Reply posted',
          'comments',
          {
            rewardId: commentRewardId,
            recipientRole: 'author',
            postId,
            commentId: newComment.id,
            parentCommentId,
            userId: currentStudentId,
          }
        );
      }

      if (post && post.studentId !== currentStudentId && !hasReward('postOwner', post.studentId)) {
        rewardEngine.awardTokens(
          post.studentId,
          EARN_RULES.replyReceived,
          'Reply received on post',
          'comments',
          {
            rewardId: commentRewardId,
            recipientRole: 'postOwner',
            postId,
            commentId: newComment.id,
            parentCommentId,
            fromUser: currentStudentId,
            userId: post.studentId,
          }
        );
      }

      if (post && post.studentId !== currentStudentId) {
        get().addNotification({
          recipientId: post.studentId,
          type: 'reply',
          postId,
          commentId: newComment.id,
          actorId: currentStudentId,
          message: 'replied to your post',
        });
      }

      const parentCommentOwner = findCommentOwner(post?.comments || [], parentCommentId);
      if (parentCommentOwner && parentCommentOwner !== currentStudentId) {
        get().addNotification({
          recipientId: parentCommentOwner,
          type: 'reply',
          postId,
          commentId: newComment.id,
          actorId: currentStudentId,
          message: 'replied to your comment',
        });
      }
    } else {
      if (!hasReward('author', currentStudentId)) {
        rewardEngine.awardTokens(
          currentStudentId,
          EARN_RULES.comment,
          'Comment posted',
          'comments',
          {
            rewardId: commentRewardId,
            recipientRole: 'author',
            postId,
            commentId: newComment.id,
            parentCommentId: null,
            userId: currentStudentId,
          }
        );
      }

      if (post && post.studentId !== currentStudentId && !hasReward('postOwner', post.studentId)) {
        rewardEngine.awardTokens(
          post.studentId,
          EARN_RULES.replyReceived,
          'Comment received',
          'comments',
          {
            rewardId: commentRewardId,
            recipientRole: 'postOwner',
            postId,
            commentId: newComment.id,
            fromUser: currentStudentId,
            userId: post.studentId,
          }
        );
      }

      if (post && post.studentId !== currentStudentId) {
        get().addNotification({
          recipientId: post.studentId,
          type: 'comment',
          postId,
          commentId: newComment.id,
          actorId: currentStudentId,
          message: 'commented on your post',
        });
      }
    }

    // Crisis support reward - Award +100 VOICE for commenting on crisis-flagged posts
    if (post && post.isCrisisFlagged) {
      const crisisSupportRewardId = `crisis_support:${newComment.id}`;
      const hasCrisisSupportReward = transactionHistory.some((tx) => {
        if (tx.type !== 'earn' || !tx.metadata) return false;
        const metadata = tx.metadata as { rewardId?: string };
        return metadata.rewardId === crisisSupportRewardId;
      });

      if (!hasCrisisSupportReward) {
        void rewardEngine
          .awardTokens(
            currentStudentId,
            EARN_RULES.crisisResponse,
            'Crisis support comment',
            'crisis',
            {
              rewardId: crisisSupportRewardId,
              postId,
              commentId: newComment.id,
              parentCommentId: parentCommentId ?? null,
              userId: currentStudentId,
              crisisLevel: post.crisisLevel ?? 'unknown',
            }
          )
          .then((awarded) => {
            if (!awarded) return;
            set((state) => ({
              posts: state.posts.map((p) => {
                if (p.id !== postId) return p;
                return {
                  ...p,
                  comments: findAndUpdateComment(p.comments, newComment.id, (comment) => ({
                    ...comment,
                    crisisSupportRewardAwarded: true,
                  })),
                };
              }),
            }));
            get().saveToLocalStorage();
          });
      }
    }
  },

  updateComment: (commentId: string, content: string) => {
    set((state) => ({
      posts: state.posts.map((post) => ({
        ...post,
        comments: findAndUpdateComment(post.comments, commentId, (comment) => ({
          ...comment,
          content,
          isEdited: true,
          editedAt: Date.now(),
        })),
      })),
    }));
    get().saveToLocalStorage();
    toast.success('Comment updated! ✏️');
  },

  deleteComment: (commentId: string, postId: string) => {
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId) return post;

        const updatedComments = findAndDeleteComment(post.comments, commentId);

        return {
          ...post,
          comments: updatedComments,
          commentCount: countAllComments(updatedComments),
        };
      }),
    }));
    get().saveToLocalStorage();
    toast.success('Comment deleted');
  },

  addCommentReaction: (postId: string, commentId: string, reactionType: keyof Reaction) => {
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId) return post;

        return {
          ...post,
          comments: findAndUpdateComment(post.comments, commentId, (comment) => ({
            ...comment,
            reactions: {
              ...comment.reactions,
              [reactionType]: comment.reactions[reactionType] + 1,
            },
          })),
        };
      }),
    }));
    get().saveToLocalStorage();

    // Trigger haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  },

  markCommentHelpful: (postId: string, commentId: string) => {
    const { posts, studentId } = get();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const targetComment = findCommentById(post.comments, commentId);
    if (!targetComment) return;

    let updatedHelpfulVotes = targetComment.helpfulVotes;

    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id !== postId) return p;

        return {
          ...p,
          comments: findAndUpdateComment(p.comments, commentId, (comment) => {
            const nextHelpfulVotes = comment.helpfulVotes + 1;
            updatedHelpfulVotes = nextHelpfulVotes;

            return {
              ...comment,
              helpfulVotes: nextHelpfulVotes,
              helpfulRewardAwarded:
                comment.helpfulRewardAwarded || nextHelpfulVotes >= HELPFUL_COMMENT_THRESHOLD,
            };
          }),
        };
      }),
    }));
    get().saveToLocalStorage();

    toast.success('Marked comment as helpful! 🌟');

    const rewardId = `${HELPFUL_COMMENT_REWARD_PREFIX}:${commentId}`;
    const transactionHistory = rewardEngine.getTransactionHistory();
    const hasExistingReward = transactionHistory.some((tx) => {
      if (tx.type !== 'earn' || !tx.metadata) return false;
      const metadata = tx.metadata as { rewardId?: string };
      return metadata.rewardId === rewardId;
    });

    if (updatedHelpfulVotes >= HELPFUL_COMMENT_THRESHOLD && !hasExistingReward) {
      rewardEngine.awardTokens(
        targetComment.studentId,
        EARN_RULES.helpfulComment,
        'Helpful comment milestone',
        'helpful',
        {
          rewardId,
          postId,
          commentId,
          helpfulVotes: updatedHelpfulVotes,
          threshold: HELPFUL_COMMENT_THRESHOLD,
          userId: targetComment.studentId,
        }
      );

      if (targetComment.studentId !== studentId) {
        get().addNotification({
          recipientId: targetComment.studentId,
          type: 'award',
          postId,
          commentId,
          actorId: studentId,
          message: `your comment reached ${HELPFUL_COMMENT_THRESHOLD} helpful votes! +${EARN_RULES.helpfulComment} VOICE`,
        });
      }
    }

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  },

  markCommentAsVerifiedAdvice: (postId: string, commentId: string) => {
    const { posts, isModerator, studentId } = get();
    if (!isModerator) {
      toast.error('Moderator access required to verify advice.');
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const targetComment = findCommentById(post.comments, commentId);
    if (!targetComment) return;

    const shouldVerify = !targetComment.isVerifiedAdvice;

    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: findAndUpdateComment(p.comments, commentId, (comment) => ({
            ...comment,
            isVerifiedAdvice: shouldVerify,
          })),
        };
      }),
    }));
    get().saveToLocalStorage();

    if (!shouldVerify) {
      toast('Verified advice removed.', { icon: 'ℹ️' });
      return;
    }

    const rewardId = `verified_advice:${commentId}`;
    const transactionHistory = rewardEngine.getTransactionHistory();
    const hasVerifiedReward = transactionHistory.some((tx) => {
      if (tx.type !== 'earn' || !tx.metadata) return false;
      const metadata = tx.metadata as { rewardId?: string };
      return metadata.rewardId === rewardId;
    });

    if (!targetComment.verifiedAdviceRewardAwarded && !hasVerifiedReward) {
      void rewardEngine
        .awardTokens(
          targetComment.studentId,
          EARN_RULES.verifiedAdvice,
          'Verified mentorship advice',
          'crisis',
          {
            rewardId,
            postId,
            commentId,
            moderatorId: studentId,
            userId: targetComment.studentId,
          }
        )
        .then((awarded) => {
          if (!awarded) return;
          set((state) => ({
            posts: state.posts.map((p) => {
              if (p.id !== postId) return p;
              return {
                ...p,
                comments: findAndUpdateComment(p.comments, commentId, (comment) => ({
                  ...comment,
                  verifiedAdviceRewardAwarded: true,
                })),
              };
            }),
          }));
          get().saveToLocalStorage();
        });
    }

    toast.success('Comment marked as verified advice.');
  },

  toggleBookmark: (postId: string) => {
    const isBookmarked = get().bookmarkedPosts.includes(postId);

    set((state) => ({
      bookmarkedPosts: isBookmarked
        ? state.bookmarkedPosts.filter((id) => id !== postId)
        : [...state.bookmarkedPosts, postId],
    }));
    get().saveToLocalStorage();
    toast.success(isBookmarked ? 'Bookmark removed' : 'Post saved! 🔖');

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  },

  addReport: (report: Omit<Report, 'id' | 'reportedAt' | 'status'>) => {
    const newReport: Report = {
      ...report,
      id: crypto.randomUUID(),
      reportedAt: Date.now(),
      status: 'pending',
    };

    set((state) => ({
      reports: [newReport, ...state.reports],
    }));

    let updatedReportCount = 0;
    let thresholdReached: 'blur' | 'hide' | 'delete' | null = null;

    if (report.postId) {
      set((state) => {
        const posts = state.posts.map((post) => {
          if (post.id !== report.postId) return post;

          const reportsForPost = [newReport, ...(post.reports || []).filter((existing) => existing.id !== newReport.id)];
          updatedReportCount = reportsForPost.length;

          let updated: Post = {
            ...post,
            reports: reportsForPost,
            reportCount: updatedReportCount,
          };

          if (report.reportType === 'self_harm') {
            updated = {
              ...updated,
              isCrisisFlagged: true,
              flaggedForSupport: true,
              supportOffered: true,
              flaggedAt: Date.now(),
            };
          }

          if (updatedReportCount === 3) {
            updated = {
              ...updated,
              contentBlurred: true,
              blurReason: '⚠️ This content has been reported multiple times',
              moderationStatus: 'under_review',
            };
            thresholdReached = 'blur';
          } else if (updatedReportCount === 5) {
            updated = {
              ...updated,
              moderationStatus: 'hidden',
              hiddenReason: 'Multiple reports received',
            };
            thresholdReached = 'hide';
          } else if (updatedReportCount >= 10) {
            thresholdReached = 'delete';
          }

          return updated;
        });
        return { posts };
      });
    }

    get().saveToLocalStorage();

    toast.success('Thank you for keeping SafeVoice safe! 💙');

    if (thresholdReached === 'blur') {
      toast('⚠️ This content has been reported multiple times and is now blurred.', {
        icon: '⚠️',
      });
    } else if (thresholdReached === 'hide') {
      toast('🚫 This post has been temporarily hidden due to multiple reports.', {
        icon: '🚫',
      });
    } else if (thresholdReached === 'delete' && report.postId) {
      get().deletePost(report.postId, { silent: true });
      toast('A reported post was removed', { icon: 'ℹ️' });
    }

    if (report.reportType === 'self_harm') {
      get().setShowCrisisModal(true);
    }
  },

  reviewReport: (reportId: string, status: 'valid' | 'invalid') => {
    const { isModerator, studentId } = get();
    if (!isModerator) {
      toast.error('Moderator access is required to review reports.');
      return;
    }

    const existingReport = get().reports.find((report) => report.id === reportId);
    if (!existingReport) {
      toast.error('Report not found or already removed.');
      return;
    }

    const now = Date.now();

    set((state) => {
      const updatedReport: Report = {
        ...existingReport,
        status,
        reviewedBy: studentId,
        reviewedAt: now,
      };

      const updatedReports = state.reports.map((report) => (report.id === reportId ? updatedReport : report));

      const updatedPosts = state.posts.map((post) => {
        if (!post.reports || post.reports.length === 0) return post;
        if (!post.reports.some((report) => report.id === reportId)) return post;

        const postReports = post.reports.map((report) => (report.id === reportId ? updatedReport : report));

        let updatedPost: Post = {
          ...post,
          reports: postReports,
          reportCount: postReports.length,
        };

        if (!existingReport.commentId) {
          if (status === 'valid') {
            updatedPost = {
              ...updatedPost,
              contentBlurred: true,
              moderationStatus: 'hidden',
              hiddenReason: 'Report validated by moderators',
              needsReview: false,
            };
          } else {
            updatedPost = {
              ...updatedPost,
              contentBlurred: false,
              moderationStatus: undefined,
              hiddenReason: null,
              needsReview: false,
            };
          }
        }

        return updatedPost;
      });

      return {
        reports: updatedReports,
        posts: updatedPosts,
      };
    });

    get().saveToLocalStorage();

    const rewardKey = `report_validation:${reportId}`;

    if (status === 'valid') {
      const reporterId = existingReport.reporterId;
      const transactionHistory = rewardEngine.getTransactionHistory();
      const alreadyRewarded = transactionHistory.some((tx) => {
        if (tx.type !== 'earn' || !tx.metadata) return false;
        const metadata = tx.metadata as Record<string, unknown>;
        return metadata.rewardId === rewardKey;
      });

      if (!alreadyRewarded) {
        void rewardEngine.awardTokens(
          reporterId,
          EARN_RULES.validReportReward,
          'Report confirmed by moderators',
          'reporting',
          {
            rewardId: rewardKey,
            reportId,
            moderatorId: studentId,
            status,
            targetPostId: existingReport.postId,
            targetCommentId: existingReport.commentId,
            reporterId,
          }
        );
      }

      toast.success('Report marked valid. Reporter rewarded +10 VOICE.');
    } else {
      toast('Report marked as invalid.', { icon: 'ℹ️' });
    }

    get().recordModeratorAction('review_report', reportId, {
      status,
      reporterId: existingReport.reporterId,
      postId: existingReport.postId,
      commentId: existingReport.commentId,
    });
  },

  recordModeratorAction: (
    actionType: ModeratorAction['actionType'],
    targetId: string,
    metadata?: Record<string, unknown>
  ) => {
    const { isModerator, studentId } = get();

    if (!isModerator) {
      toast.error('Enable moderator mode to perform this action.');
      return;
    }

    if (!targetId) {
      console.warn('Moderator action requires a valid target identifier.');
      return;
    }

    if (!MODERATOR_ACTION_TYPES.includes(actionType)) {
      console.warn('Unsupported moderator action type:', actionType);
      return;
    }

    const now = Date.now();
    const clonedMetadata = metadata ? { ...metadata } : undefined;

    const action: ModeratorAction = {
      id: crypto.randomUUID(),
      moderatorId: studentId,
      actionType,
      targetId,
      timestamp: now,
      rewardAwarded: false,
      metadata: clonedMetadata,
    };

    set((state) => {
      const nextActions = [action, ...state.moderatorActions].slice(0, MAX_MODERATOR_ACTIONS);
      return { moderatorActions: nextActions };
    });
    get().saveToLocalStorage();

    const rewardKey = `moderator:${studentId}:${actionType}`;
    const transactionHistory = rewardEngine.getTransactionHistory();
    const lastRewardTx = transactionHistory.find((tx) => {
      if (tx.type !== 'earn' || !tx.metadata) return false;
      const metadataRecord = tx.metadata as Record<string, unknown>;
      return metadataRecord.rewardId === rewardKey;
    });

    if (lastRewardTx && now - lastRewardTx.timestamp < VOLUNTEER_MOD_ACTION_COOLDOWN_MS) {
      toast('Volunteer moderator cooldown active. Try again soon.', { icon: '⏱️' });
      return;
    }

    const rewardMetadata: Record<string, unknown> = {
      rewardId: rewardKey,
      moderatorId: studentId,
      actionType,
      targetId,
      cooldownMs: VOLUNTEER_MOD_ACTION_COOLDOWN_MS,
      ...(clonedMetadata ?? {}),
    };

    const reason = MODERATOR_ACTION_REASONS[actionType] ?? 'Volunteer moderation action';

    void rewardEngine
      .awardTokens(studentId, EARN_RULES.volunteerModAction, reason, 'reporting', rewardMetadata)
      .then((awarded) => {
        if (!awarded) {
          return;
        }

        set((state) => ({
          moderatorActions: state.moderatorActions.map((existing) =>
            existing.id === action.id ? { ...existing, rewardAwarded: true } : existing
          ),
        }));
        get().saveToLocalStorage();
      });
  },

  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      read: false,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep max 50
      unreadCount: state.unreadCount + 1,
    }));
    get().saveToLocalStorage();
  },

  markAsRead: (notificationId: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(
        0,
        state.unreadCount -
          (state.notifications.find((n) => n.id === notificationId && !n.read) ? 1 : 0)
      ),
    }));
    get().saveToLocalStorage();
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    get().saveToLocalStorage();
  },

  // Post lifecycle methods
  scheduleExpiry: (post: Post) => {
    if (!post.expiresAt) return;

    const timeLeft = post.expiresAt - Date.now();

    if (timeLeft <= 0) {
      // Already expired
      get().clearExpiryTimer(post.id);
      get().deletePost(post.id, { silent: true });
      toast.success('Post expired and deleted 🔥', {
        icon: '⏳',
        duration: 4000,
      });
      return;
    }

    const handleExpiry = () => {
      const currentPost = get().posts.find((p) => p.id === post.id);
      if (!currentPost) return;

      get().clearExpiryTimer(post.id);
      get().deletePost(post.id, { silent: true });

      toast.success('Post expired and deleted 🔥', {
        icon: '⏳',
        duration: 4000,
      });

      toast.custom(
        (t) =>
          createElement(
            'div',
            {
              className:
                'pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 flex items-center space-x-3 shadow-lg',
            },
            createElement('span', { className: 'text-sm text-white' }, 'Undo restore coming soon'),
            createElement(
              'button',
              {
                className:
                  'text-xs font-semibold text-primary hover:text-purple-300 transition-colors duration-200',
                onClick: () => {
                  toast.dismiss(t.id);
                  toast('Restore feature coming soon!');
                },
              },
              'Undo'
            )
          ),
        {
          duration: 6000,
        }
      );

      if (currentPost.studentId === get().studentId) {
        toast('Your post has expired and been deleted', {
          icon: '⏳',
          duration: 4000,
        });
      }
    };

    // Schedule deletion
    const timeoutId = window.setTimeout(handleExpiry, timeLeft);

    // Store timeout ID
    set((state) => ({
      expiryTimeouts: {
        ...state.expiryTimeouts,
        [post.id]: timeoutId,
      },
    }));
  },

  clearExpiryTimer: (postId: string) => {
    const state = get();
    const timeoutId = state.expiryTimeouts[postId];

    if (timeoutId) {
      window.clearTimeout(timeoutId);

      set((state) => {
        const newTimeouts = { ...state.expiryTimeouts };
        delete newTimeouts[postId];
        return { expiryTimeouts: newTimeouts };
      });
    }
  },

  markWarningShown: (postId: string) => {
    set((state) => ({
      posts: state.posts.map((p) => (p.id === postId ? { ...p, warningShown: true } : p)),
    }));
    get().saveToLocalStorage();
  },

  extendPostLifetime: (postId: string, hours: number = 24) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.studentId !== state.studentId) {
      toast.error('You can only extend your own posts');
      return;
    }

    if (!post.expiresAt) {
      toast.error('This post has no expiration date');
      return;
    }

    const extendCost = 10;
    if (state.voiceBalance < extendCost) {
      toast.error(`Insufficient balance. Need ${extendCost} VOICE to extend post lifetime`);
      return;
    }

    get().spendVoice(extendCost, `Extend post lifetime by ${hours}h`, {
      postId,
      action: 'extend_lifetime',
      hours,
    });

    const duration = hours * 60 * 60 * 1000;
    const extendedHours = (post.extendedLifetimeHours || 0) + hours;

    get().clearExpiryTimer(postId);

    const newExpiresAt = post.expiresAt + duration;

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              expiresAt: newExpiresAt,
              extendedLifetimeHours: extendedHours,
              warningShown: false,
            }
          : p
      ),
    }));
    get().saveToLocalStorage();

    const updatedPost = get().posts.find((p) => p.id === postId);
    if (updatedPost && updatedPost.expiresAt) {
      get().scheduleExpiry(updatedPost);
    }

    toast.success(`Post lifetime extended by ${hours} hours! ⏱️`);
  },

  restoreDeletedPost: (post: Post) => {
    const newExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const restoredPost: Post = {
      ...post,
      expiresAt: newExpiresAt,
      lifetime: '24h',
      warningShown: false,
    };

    set((state) => ({
      posts: [restoredPost, ...state.posts],
    }));
    get().saveToLocalStorage();

    // Schedule expiry
    get().scheduleExpiry(restoredPost);

    toast.success('Post restored! 🔓', {
      duration: 3000,
    });
  },

  // Post boost actions
  pinPost: (postId: string) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.studentId !== state.studentId) {
      toast.error('You can only pin your own posts');
      return;
    }

    if (post.isPinned) {
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, isPinned: false } : p
        ),
      }));
      get().saveToLocalStorage();
      toast.success('Post unpinned');
      return;
    }

    const pinnedCount = state.posts.filter((p) => p.isPinned && p.studentId === state.studentId).length;

    if (pinnedCount >= 3) {
      toast.error('Maximum 3 pinned posts allowed');
      return;
    }

    const pinCost = 25;
    if (state.voiceBalance < pinCost) {
      toast.error(`Insufficient balance. Need ${pinCost} VOICE to pin post`);
      return;
    }

    get().spendVoice(pinCost, 'Pin post to profile', { postId, action: 'pin_post' });

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, isPinned: true } : p
      ),
    }));
    get().saveToLocalStorage();
    toast.success('Post pinned to top! 📌');
  },

  highlightPost: (postId: string) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.studentId !== state.studentId) {
      toast.error('You can only highlight your own posts');
      return;
    }

    if (post.isHighlighted && post.highlightedUntil && post.highlightedUntil > Date.now()) {
      toast.error('Post is already highlighted');
      return;
    }

    const highlightCost = 15;
    if (state.voiceBalance < highlightCost) {
      toast.error(`Insufficient balance. Need ${highlightCost} VOICE to highlight post`);
      return;
    }

    get().spendVoice(highlightCost, 'Highlight post', { postId, action: 'highlight_post' });

    const now = Date.now();
    const highlightedUntil = now + 24 * 60 * 60 * 1000; // 24 hours

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, isHighlighted: true, highlightedAt: now, highlightedUntil }
          : p
      ),
    }));
    get().saveToLocalStorage();

    scheduleBoostTimeout(postId, 'highlight', highlightedUntil);

    toast.success('Post highlighted for 24 hours! ✨');
  },

  boostToCampuses: (postId: string, campusIds: string[]) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.studentId !== state.studentId) {
      toast.error('You can only boost your own posts');
      return;
    }

    if (!campusIds || campusIds.length === 0) {
      toast.error('Please select at least one campus');
      return;
    }

    const uniqueCampuses = Array.from(new Set(campusIds.map((id) => id.trim()).filter((id) => id.length > 0)));
    if (uniqueCampuses.length === 0) {
      toast.error('No valid campuses selected');
      return;
    }

    const boostCost = 50;
    if (state.voiceBalance < boostCost) {
      toast.error(`Insufficient balance. Need ${boostCost} VOICE to boost cross-campus`);
      return;
    }

    get().spendVoice(boostCost, `Cross-campus boost`, {
      postId,
      action: 'cross_campus_boost',
      campusIds: uniqueCampuses,
    });

    const now = Date.now();
    const crossCampusUntil = now + 24 * 60 * 60 * 1000;

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              crossCampusBoosts: uniqueCampuses,
              crossCampusBoostedAt: now,
              crossCampusUntil,
            }
          : p
      ),
    }));
    get().saveToLocalStorage();

    scheduleBoostTimeout(postId, 'crossCampus', crossCampusUntil);

    toast.success(`Post boosted to ${uniqueCampuses.length} campus${uniqueCampuses.length === 1 ? '' : 'es'}! 🚀`);
  },

  // Encryption methods
  addEncryptionKey: (keyId: string, key: JsonWebKey) => {
    set((state) => ({
      encryptionKeys: { ...state.encryptionKeys, [keyId]: key },
    }));
    get().saveToLocalStorage();
  },

  getEncryptionKey: (keyId: string) => {
    return get().encryptionKeys[keyId];
  },

  loadMemorialData: () => {
    if (typeof window === 'undefined') return;

    const storedTributes = localStorage.getItem(STORAGE_KEYS.MEMORIAL_TRIBUTES);

    if (!storedTributes) {
      set({ memorialTributes: [] });
      return;
    }

    try {
      const parsed = JSON.parse(storedTributes) as Array<Partial<MemorialTribute>>;
      const normalized = parsed.map((rawTribute) => {
        const tributeId = rawTribute.id ?? crypto.randomUUID();
        const candles = Array.isArray(rawTribute.candles)
          ? rawTribute.candles.map((candle) => {
              const partial = candle as Partial<MemorialCandle>;
              return {
                id: partial.id ?? crypto.randomUUID(),
                tributeId,
                lightedBy: typeof partial.lightedBy === 'string' ? partial.lightedBy : 'Anonymous',
                lightedAt:
                  typeof partial.lightedAt === 'number' ? partial.lightedAt : Date.now(),
              } satisfies MemorialCandle;
            })
          : [];

        return {
          id: tributeId,
          createdBy: typeof rawTribute.createdBy === 'string' ? rawTribute.createdBy : 'UnknownGuardian',
          createdAt: typeof rawTribute.createdAt === 'number' ? rawTribute.createdAt : Date.now(),
          personName: rawTribute.personName?.toString() ?? 'Beloved Soul',
          message: rawTribute.message?.toString() ?? '',
          candles,
          milestoneRewardAwarded: Boolean(rawTribute.milestoneRewardAwarded),
        } satisfies MemorialTribute;
      });

      set({ memorialTributes: normalized });
    } catch (error) {
      console.error('Failed to load memorial tributes:', error);
      set({ memorialTributes: [] });
    }
  },

  createTribute: (personName: string, message: string) => {
    const currentStudentId = get().studentId;
    const trimmedName = personName.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedMessage) {
      toast.error('Please provide both a name and a tribute message.');
      return false;
    }

    if (trimmedMessage.length > 600) {
      toast.error('Tribute message is too long. Please keep it under 600 characters.');
      return false;
    }

    const newTribute: MemorialTribute = {
      id: crypto.randomUUID(),
      createdBy: currentStudentId,
      createdAt: Date.now(),
      personName: trimmedName,
      message: trimmedMessage,
      candles: [],
      milestoneRewardAwarded: false,
    };

    set((state) => ({
      memorialTributes: [newTribute, ...state.memorialTributes],
    }));
    get().saveToLocalStorage();

    get().earnVoice(EARN_RULES.memorialTribute, `Tribute created for ${trimmedName} 🕊️`, 'bonuses', {
      tributeId: newTribute.id,
      personName: newTribute.personName,
      action: 'create_tribute',
      feature: 'memorial_wall',
    });

    return true;
  },

  lightCandle: (tributeId: string) => {
    const currentStudentId = get().studentId;
    const tribute = get().memorialTributes.find((t) => t.id === tributeId);

    if (!tribute) {
      toast.error('Tribute not found');
      return;
    }

    const newCandle: MemorialCandle = {
      id: crypto.randomUUID(),
      tributeId,
      lightedBy: currentStudentId,
      lightedAt: Date.now(),
    };

    let milestoneAwardedNow = false;

    const updatedTributes = get().memorialTributes.map((t) => {
      if (t.id !== tributeId) {
        return t;
      }

      const updatedCandles = [...t.candles, newCandle];
      const hitMilestone = !t.milestoneRewardAwarded && updatedCandles.length >= 50;

      if (hitMilestone) {
        milestoneAwardedNow = true;
      }

      return {
        ...t,
        candles: updatedCandles,
        milestoneRewardAwarded: t.milestoneRewardAwarded || hitMilestone,
      };
    });

    set({ memorialTributes: updatedTributes });
    get().saveToLocalStorage();

    get().earnVoice(EARN_RULES.memorialCandle, `Candle lit for ${tribute.personName} 🕯️`, 'bonuses', {
      tributeId,
      personName: tribute.personName,
      action: 'light_candle',
      feature: 'memorial_wall',
    });

    if (milestoneAwardedNow) {
      void rewardEngine.awardTokens(
        tribute.createdBy,
        EARN_RULES.memorialMilestone,
        `${tribute.personName} reached 50 candles 🎉`,
        'bonuses',
        {
          tributeId: tribute.id,
          personName: tribute.personName,
          action: 'candle_milestone',
          feature: 'memorial_wall',
          candleCount: 50,
        }
      );

      toast.success(`${tribute.personName} has been honored with 50 candles! +100 VOICE to the tribute creator ✨`, {
        duration: 5000,
      });
    }
  },

  changeStudentId: (newId: string) => {
    const state = get();
    const trimmedId = newId.trim();

    if (!trimmedId || trimmedId.length < 3) {
      toast.error('Please enter a valid Student ID (at least 3 characters)');
      return false;
    }

    if (trimmedId === state.studentId) {
      toast.error('New ID must be different from current ID');
      return false;
    }

    const changeCost = 50;
    if (state.voiceBalance < changeCost) {
      toast.error(`Insufficient balance. Need ${changeCost} VOICE to change Student ID`);
      return false;
    }

    get().spendVoice(changeCost, `Changed Student ID`, {
      oldId: state.studentId,
      newId: trimmedId,
      action: 'change_student_id',
    });

    const oldId = state.studentId;
    set({ studentId: trimmedId });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.STUDENT_ID, trimmedId);
    }

    get().saveToLocalStorage();

    toast.success(`Student ID changed successfully! 🎉\nOld: ${oldId}\nNew: ${trimmedId}`, {
      duration: 5000,
    });

    return true;
  },

  getUserRank: () => get().currentRank,

  checkAchievements: async () => {
    await syncRewardState();
  },

  getAchievementProgress: (achievementId: string) => {
    return get().achievementProgress[achievementId] ?? null;
  },

  downloadDataBackup: () => {
    const state = get();

    const backupData = {
      studentId: state.studentId,
      posts: state.posts,
      bookmarkedPosts: state.bookmarkedPosts,
      reports: state.reports,
      notifications: state.notifications,
      transactionHistory: state.transactionHistory,
      voiceBalance: state.voiceBalance,
      pendingRewards: state.pendingRewards,
      earningsBreakdown: state.earningsBreakdown,
      memorialTributes: state.memorialTributes,
      nftBadges: state.nftBadges,
      referralCode: state.referralCode,
      referredFriends: state.referredFriends,
      premiumSubscriptions: state.premiumSubscriptions,
      exportedAt: Date.now(),
      exportVersion: '1.0.0',
    };

    get().spendVoice(0, 'Downloaded data backup', {
      action: 'download_data_backup',
      recordCount: {
        posts: state.posts.length,
        bookmarks: state.bookmarkedPosts.length,
        transactions: state.transactionHistory.length,
        tributes: state.memorialTributes.length,
        badges: state.nftBadges.length,
      },
    });

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `safevoice-backup-${state.studentId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Data backup downloaded successfully! 💾', {
      duration: 4000,
    });
  },
};
});

// Helper function to get emoji for reaction type
function getEmojiForReaction(reactionType: keyof Reaction): string {
  const emojiMap: Record<keyof Reaction, string> = {
    heart: '❤️',
    fire: '🔥',
    clap: '👏',
    sad: '😢',
    angry: '😠',
    laugh: '😂',
  };
  return emojiMap[reactionType];
}
