import { create } from 'zustand';
import toast from 'react-hot-toast';

// Types
export interface Reaction {
  heart: number;
  fire: number;
  clap: number;
  sad: number;
  angry: number;
  laugh: number;
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

interface StoreState {
  studentId: string;
  posts: Post[];
  bookmarkedPosts: string[];
  reports: Report[];
  notifications: Notification[];
  unreadCount: number;

  // Initialization
  initStudentId: () => void;
  initializeStore: () => void;

  // Post actions
  addPost: (content: string, category?: string) => void;
  updatePost: (postId: string, content: string) => void;
  deletePost: (postId: string) => void;
  togglePin: (postId: string) => void;
  addReaction: (postId: string, reactionType: keyof Reaction) => void;
  incrementHelpful: (postId: string) => void;

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

    const posts = storedPosts ? JSON.parse(storedPosts) : [];
    const bookmarkedPosts = storedBookmarks ? JSON.parse(storedBookmarks) : [];
    const reports = storedReports ? JSON.parse(storedReports) : [];
    const notifications = storedNotifications ? JSON.parse(storedNotifications) : [];

    // Add sample posts if none exist
    if (posts.length === 0) {
      posts.push(
        {
          id: crypto.randomUUID(),
          studentId: generateStudentId(),
          content:
            'Feeling overwhelmed with academics and expectations. Sometimes it feels like no one understands the pressure we face. 😔',
          category: 'Mental Health',
          reactions: { heart: 12, fire: 3, clap: 8, sad: 15, angry: 2, laugh: 0 },
          commentCount: 4,
          comments: [],
          createdAt: Date.now() - 86400000 * 2,
          isEdited: false,
          editedAt: null,
          isPinned: false,
          reportCount: 0,
          helpfulCount: 5,
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
          createdAt: Date.now() - 43200000,
          isEdited: false,
          editedAt: null,
          isPinned: false,
          reportCount: 0,
          helpfulCount: 18,
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
          createdAt: Date.now() - 7200000,
          isEdited: false,
          editedAt: null,
          isPinned: false,
          reportCount: 0,
          helpfulCount: 10,
        }
      );
    }

    const unreadCount = notifications.filter((n: Notification) => !n.read).length;

    set({ posts, bookmarkedPosts, reports, notifications, unreadCount });
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;

    const state = get();
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(state.posts));
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarkedPosts));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(state.reports));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(state.notifications));
  },

  addPost: (content: string, category?: string) => {
    const newPost: Post = {
      id: crypto.randomUUID(),
      studentId: get().studentId,
      content,
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
    };

    set((state) => ({
      posts: [newPost, ...state.posts],
    }));
    get().saveToLocalStorage();
    toast.success('Post created! 🎉');
  },

  updatePost: (postId: string, content: string) => {
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? { ...post, content, isEdited: true, editedAt: Date.now() }
          : post
      ),
    }));
    get().saveToLocalStorage();
    toast.success('Post updated! ✏️');
  },

  deletePost: (postId: string) => {
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== postId),
      bookmarkedPosts: state.bookmarkedPosts.filter((id) => id !== postId),
    }));
    get().saveToLocalStorage();
    toast.success('Post deleted');
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
