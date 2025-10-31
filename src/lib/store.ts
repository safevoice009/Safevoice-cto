import { create } from 'zustand';
import toast from 'react-hot-toast';
import { createElement } from 'react';
import { Wallet } from 'ethers';
import {
  EARN_RULES,
  type EarningsBreakdown,
} from './tokenEconomics';
import { setSecureItem, getSecureItem, clearSecureItem } from './secureStorage';
import { RewardEngine } from './tokens/RewardEngine';

// Types
export interface Reaction {
  heart: number;
  fire: number;
  clap: number;
  sad: number;
  angry: number;
  laugh: number;
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
}

export interface Report {
  id: string;
  postId?: string;
  commentId?: string;
  reportType: string;
  description: string;
  reporterId: string;
  reportedAt: number;
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

export interface StoreState {
  studentId: string;
  posts: Post[];
  bookmarkedPosts: string[];
  reports: Report[];
  notifications: Notification[];
  unreadCount: number;
  encryptionKeys: Record<string, JsonWebKey>;
  expiryTimeouts: Record<string, number>;

  // Wallet & Token state
  connectedAddress: string | null;
  anonymousWalletAddress: string | null;
  voiceBalance: number;
  pendingRewards: number;
  earningsBreakdown: EarningsBreakdown;
  transactionHistory: VoiceTransaction[];
  lastLoginDate: string | null;
  loginStreak: number;
  lastPostDate: string | null;
  postingStreak: number;

  firstPostAwarded: boolean;

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
  togglePin: (postId: string) => void;
  addReaction: (postId: string, reactionType: keyof Reaction) => void;
  incrementHelpful: (postId: string) => void;

  // Post lifecycle
  scheduleExpiry: (post: Post) => void;
  clearExpiryTimer: (postId: string) => void;
  markWarningShown: (postId: string) => void;
  extendPostLifetime: (postId: string, duration: number) => void;
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

  // Bookmark actions
  toggleBookmark: (postId: string) => void;

  // Report actions
  addReport: (report: Omit<Report, 'id' | 'reportedAt'>) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;

  // Utility
  saveToLocalStorage: () => void;
}

const STORAGE_KEYS = {
  STUDENT_ID: 'studentId',
  POSTS: 'safevoice_posts',
  BOOKMARKS: 'safevoice_bookmarks',
  REPORTS: 'safevoice_reports',
  NOTIFICATIONS: 'safevoice_notifications',
  ENCRYPTION_KEYS: 'safevoice_encryption_keys',
  SAVED_HELPLINES: 'safevoice_saved_helplines',
  EMERGENCY_BANNER: 'emergencyBannerDismissed',
  ANON_WALLET_ADDRESS: 'anonWallet_address',
  ANON_WALLET_ENCRYPTED_KEY: 'anonWallet_encrypted',
  FIRST_POST_AWARDED: 'safevoice_first_post_awarded',
};

const rewardEngine = new RewardEngine();

const VIRAL_REACTION_THRESHOLD = 100;
const VIRAL_REWARD_AMOUNT = EARN_RULES.viralPost;
const HELPFUL_COMMENT_THRESHOLD = 5;
const HELPFUL_COMMENT_REWARD_PREFIX = 'helpful_comment';

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
  const syncRewardState = () => {
    const snapshot = rewardEngine.getWalletSnapshot();
    set({
      voiceBalance: snapshot.balance,
      pendingRewards: snapshot.pending,
      earningsBreakdown: snapshot.earningsBreakdown,
      transactionHistory: snapshot.transactions,
      lastLoginDate: snapshot.lastLogin,
      loginStreak: snapshot.streakData.currentStreak,
      lastPostDate: snapshot.streakData.lastPostDate,
      postingStreak: snapshot.streakData.currentPostStreak,
    });
  };

  rewardEngine.onReward(() => {
    syncRewardState();
  });

  rewardEngine.onSpend(() => {
    syncRewardState();
  });

  rewardEngine.onBalanceChange(() => {
    syncRewardState();
  });

  return {
    studentId:
      typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEYS.STUDENT_ID) || generateStudentId()
        : generateStudentId(),
    posts: [],
    bookmarkedPosts: [],
    reports: [],
    notifications: [],
    unreadCount: 0,
    encryptionKeys: {},
    expiryTimeouts: {},
    showCrisisModal: false,
    pendingPost: null,
    savedHelplines: getSavedHelplinesFromStorage(),
    emergencyBannerDismissedUntil: getEmergencyBannerDismissedUntil(),

    // Wallet & Token state initialization - now using RewardEngine
    connectedAddress: null,
    anonymousWalletAddress:
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ANON_WALLET_ADDRESS) : null,
    voiceBalance: rewardEngine.getBalance(),
    pendingRewards: rewardEngine.getPending(),
    earningsBreakdown: rewardEngine.getEarningsBreakdown(),
    transactionHistory: rewardEngine.getTransactionHistory(),
    lastLoginDate: rewardEngine.getStreakData().lastLoginDate,
    loginStreak: rewardEngine.getStreakData().currentStreak,
    lastPostDate: rewardEngine.getStreakData().lastPostDate,
    postingStreak: rewardEngine.getStreakData().currentPostStreak,
    firstPostAwarded: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.FIRST_POST_AWARDED) === 'true' : false,

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
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const state = get();
    await rewardEngine.claimRewards(state.studentId, state.connectedAddress ?? undefined);
  },

  loadWalletData: () => {
    const snapshot = rewardEngine.getWalletSnapshot();
    set({
      voiceBalance: snapshot.balance,
      pendingRewards: snapshot.pending,
      earningsBreakdown: snapshot.earningsBreakdown,
      transactionHistory: snapshot.transactions,
      anonymousWalletAddress:
        typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ANON_WALLET_ADDRESS) : null,
      lastLoginDate: snapshot.lastLogin,
      loginStreak: snapshot.streakData.currentStreak,
      lastPostDate: snapshot.streakData.lastPostDate,
      postingStreak: snapshot.streakData.currentPostStreak,
    });
  },

  grantDailyLoginBonus: () => {
    if (typeof window === 'undefined') return;
    const state = get();
    rewardEngine.processDailyBonus(state.studentId);
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
    const storedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const storedEncryptionKeys = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEYS);

    const rawPosts = storedPosts ? (JSON.parse(storedPosts) as Post[]) : [];
    const bookmarkedPosts = storedBookmarks ? JSON.parse(storedBookmarks) : [];
    const reports = storedReports ? JSON.parse(storedReports) : [];
    const notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    const encryptionKeys = storedEncryptionKeys ? JSON.parse(storedEncryptionKeys) : {};
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
      };
    });

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
        },
      ];
    }

    // Remove already-expired posts
    const now = Date.now();
    const validPosts = posts.filter((post: Post) => !post.expiresAt || post.expiresAt > now);

    const unreadCount = notifications.filter((n: Notification) => !n.read).length;

    set({ posts: validPosts, bookmarkedPosts, reports, notifications, unreadCount, encryptionKeys, firstPostAwarded });

    // Schedule expiry for posts
    validPosts.forEach((post: Post) => {
      if (post.expiresAt) {
        get().scheduleExpiry(post);
      }
    });
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;

    const state = get();
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(state.posts));
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarkedPosts));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(state.reports));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(state.notifications));
    localStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEYS, JSON.stringify(state.encryptionKeys));
    localStorage.setItem(STORAGE_KEYS.SAVED_HELPLINES, JSON.stringify(state.savedHelplines));
    localStorage.setItem(STORAGE_KEYS.FIRST_POST_AWARDED, state.firstPostAwarded ? 'true' : 'false');
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

  addReport: (report: Omit<Report, 'id' | 'reportedAt'>) => {
    const newReport: Report = {
      ...report,
      id: crypto.randomUUID(),
      reportedAt: Date.now(),
    };

    set((state) => ({
      reports: [...state.reports, newReport],
    }));

    let updatedReportCount = 0;
    let thresholdReached: 'blur' | 'hide' | 'delete' | null = null;

    if (report.postId) {
      set((state) => {
        const posts = state.posts.map((post) => {
          if (post.id !== report.postId) return post;

          const reportsForPost = [...(post.reports || []), newReport];
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

  extendPostLifetime: (postId: string, duration: number) => {
    const state = get();
    const post = state.posts.find((p) => p.id === postId);
    if (!post || !post.expiresAt) return;

    // Clear existing timer
    get().clearExpiryTimer(postId);

    const newExpiresAt = post.expiresAt + duration;

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              expiresAt: newExpiresAt,
              warningShown: false,
            }
          : p
      ),
    }));
    get().saveToLocalStorage();

    // Schedule new expiry
    const updatedPost = get().posts.find((p) => p.id === postId);
    if (updatedPost && updatedPost.expiresAt) {
      get().scheduleExpiry(updatedPost);
    }

    toast.success('Post lifetime extended! ⏳', {
      icon: '⏱️',
    });
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
