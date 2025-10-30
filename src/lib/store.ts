import { create } from 'zustand';
import toast from 'react-hot-toast';
import { createElement } from 'react';

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
  encryptionData?: {
    encrypted: string;
    iv: string;
    keyId: string;
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
  reportCount: number;
  helpfulCount: number;
  expiresAt: number | null;
  lifetime: PostLifetime;
  customLifetimeHours?: number | null;
  isEncrypted: boolean;
  encryptionMeta: EncryptionMeta | null;
  warningShown?: boolean;
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

export interface StoreState {
  studentId: string;
  posts: Post[];
  bookmarkedPosts: string[];
  reports: Report[];
  notifications: Notification[];
  unreadCount: number;
  encryptionKeys: Record<string, JsonWebKey>;
  expiryTimeouts: Record<string, number>;

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
    encryptedData?: { encrypted: string; iv: string; keyId: string }
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
};

// Helper to generate random student ID
const generateStudentId = () => `Student#${Math.floor(Math.random() * 9000 + 1000)}`;

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

export const useStore = create<StoreState>((set, get) => ({
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

      return {
        ...post,
        expiresAt: normalizedExpiresAt,
        lifetime: normalizedLifetime,
        customLifetimeHours: normalizedLifetime === 'custom' ? normalizedCustomHours : null,
        isEncrypted: normalizedMeta ? true : Boolean(post.isEncrypted),
        encryptionMeta: normalizedMeta,
        warningShown: post.warningShown ?? false,
      };
    });

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

    set({ posts: validPosts, bookmarkedPosts, reports, notifications, unreadCount, encryptionKeys });

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
  },

  addPost: (
    content: string,
    category?: string,
    lifetime: PostLifetime = '24h',
    customHours?: number,
    isEncrypted?: boolean,
    encryptedData?: { encrypted: string; iv: string; keyId: string }
  ) => {
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
      studentId: get().studentId,
      content: isEncrypted && encryptedData ? encryptedData.encrypted : content,
      category,
      reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
      commentCount: 0,
      comments: [],
      createdAt: Date.now(),
      isEdited: false,
      editedAt: null,
      isPinned: false,
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
      warningShown: false,
    };

    set((state) => ({
      posts: [newPost, ...state.posts],
    }));
    get().saveToLocalStorage();

    // Schedule expiry if applicable
    if (expiresAt) {
      get().scheduleExpiry(newPost);
    }

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

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              reactions: {
                ...p.reactions,
                [reactionType]: p.reactions[reactionType] + 1,
              },
            }
          : p
      ),
    }));
    get().saveToLocalStorage();

    // Trigger haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Add notification if reacting to someone else's post
    if (post.studentId !== state.studentId) {
      get().addNotification({
        recipientId: post.studentId,
        type: 'reaction',
        postId,
        actorId: state.studentId,
        message: `reacted ${getEmojiForReaction(reactionType)} to your post`,
      });
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
    const newComment: Comment = {
      id: crypto.randomUUID(),
      postId,
      parentCommentId: parentCommentId || null,
      studentId: generateStudentId(),
      content,
      reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
      replies: [],
      createdAt: Date.now(),
      isEdited: false,
      editedAt: null,
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
        } else {
          // Add as root comment
          const updatedComments = [...post.comments, newComment];
          return {
            ...post,
            comments: updatedComments,
            commentCount: countAllComments(updatedComments),
          };
        }
      }),
    }));
    get().saveToLocalStorage();
    toast.success('Comment posted! 💬');

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Add notification to post owner
    const post = get().posts.find((p) => p.id === postId);
    const currentStudentId = get().studentId;

    if (post && post.studentId !== currentStudentId) {
      const notifType = parentCommentId ? 'reply' : 'comment';
      const message = parentCommentId ? 'replied to your post' : 'commented on your post';
      get().addNotification({
        recipientId: post.studentId,
        type: notifType,
        postId,
        commentId: newComment.id,
        actorId: currentStudentId,
        message,
      });
    }

    // Notify parent comment owner if replying
    if (parentCommentId) {
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

    // Increment report count on post
    if (report.postId) {
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === report.postId
            ? { ...post, reportCount: post.reportCount + 1 }
            : post
        ),
      }));
    }

    get().saveToLocalStorage();
    toast.success('Report submitted. Thank you for keeping SafeVoice safe.');
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
}));

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
