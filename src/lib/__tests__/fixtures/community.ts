import type { Post, Comment, Report, ModeratorAction, Notification, Reaction } from '../../store';

export const createReaction = (overrides?: Partial<Reaction>): Reaction => ({
  heart: 0,
  fire: 0,
  clap: 0,
  sad: 0,
  angry: 0,
  laugh: 0,
  ...overrides,
});

export const createComment = (overrides?: Partial<Comment>): Comment => ({
  id: `comment-${Date.now()}-${Math.random()}`,
  postId: 'post-1',
  parentCommentId: null,
  studentId: 'Student#1234',
  content: 'Test comment content',
  reactions: createReaction(),
  replies: [],
  createdAt: Date.now(),
  isEdited: false,
  editedAt: null,
  helpfulVotes: 0,
  helpfulRewardAwarded: false,
  crisisSupportRewardAwarded: false,
  isVerifiedAdvice: false,
  verifiedAdviceRewardAwarded: false,
  ...overrides,
});

export const createPost = (overrides?: Partial<Post>): Post => ({
  id: `post-${Date.now()}-${Math.random()}`,
  studentId: 'Student#1234',
  content: 'Test post content',
  category: undefined,
  reactions: createReaction(),
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
  expiresAt: null,
  lifetime: 'never',
  customLifetimeHours: null,
  isEncrypted: false,
  encryptionMeta: null,
  imageUrl: null,
  warningShown: false,
  reports: [],
  contentBlurred: false,
  blurReason: null,
  moderationStatus: undefined,
  hiddenReason: undefined,
  moderationIssues: [],
  needsReview: false,
  isCrisisFlagged: false,
  crisisLevel: undefined,
  supportOffered: false,
  flaggedAt: null,
  flaggedForSupport: false,
  pinnedAt: null,
  isHighlighted: false,
  highlightedAt: null,
  highlightedUntil: null,
  extendedLifetimeHours: 0,
  crossCampusBoostedAt: null,
  crossCampusUntil: null,
  crossCampusBoosts: [],
  ...overrides,
});

export const createReport = (overrides?: Partial<Report>): Report => ({
  id: `report-${Date.now()}-${Math.random()}`,
  postId: 'post-1',
  reportType: 'spam',
  description: 'Test report description',
  reporterId: 'Student#reporter',
  reportedAt: Date.now(),
  status: 'pending',
  reviewedBy: undefined,
  reviewedAt: undefined,
  ...overrides,
});

export const createModeratorAction = (overrides?: Partial<ModeratorAction>): ModeratorAction => ({
  id: `action-${Date.now()}-${Math.random()}`,
  moderatorId: 'Student#moderator',
  actionType: 'blur_post',
  targetId: 'post-1',
  timestamp: Date.now(),
  rewardAwarded: false,
  metadata: {},
  ...overrides,
});

export const createNotification = (overrides?: Partial<Notification>): Notification => ({
  id: `notif-${Date.now()}-${Math.random()}`,
  recipientId: 'Student#1234',
  type: 'reaction',
  postId: 'post-1',
  commentId: undefined,
  actorId: 'Student#actor',
  message: 'Someone reacted to your post',
  read: false,
  createdAt: Date.now(),
  ...overrides,
});

export const createViralPost = (): Post =>
  createPost({
    reactions: createReaction({ heart: 120, fire: 50, clap: 30 }),
    isViral: true,
    viralAwardedAt: Date.now(),
    commentCount: 25,
  });

export const createCrisisPost = (): Post =>
  createPost({
    content: 'I need help...',
    isCrisisFlagged: true,
    crisisLevel: 'high',
    supportOffered: true,
    flaggedAt: Date.now(),
    flaggedForSupport: true,
  });

export const createReportedPost = (reportCount: number = 3): Post =>
  createPost({
    reportCount,
    contentBlurred: reportCount >= 3,
    moderationStatus: reportCount >= 5 ? 'hidden' : reportCount >= 3 ? 'under_review' : undefined,
    reports: Array.from({ length: reportCount }, (_, i) =>
      createReport({
        id: `report-${i}`,
        reportType: 'inappropriate',
        description: `Report ${i + 1}`,
        reporterId: `Student#reporter${i}`,
      })
    ),
  });

export const createCommentWithReplies = (replyCount: number = 3): Comment => {
  const parentComment = createComment();
  const replies = Array.from({ length: replyCount }, (_, i) =>
    createComment({
      id: `reply-${i}`,
      parentCommentId: parentComment.id,
      content: `Reply ${i + 1}`,
    })
  );
  return { ...parentComment, replies };
};

export const createHelpfulComment = (votes: number = 5): Comment =>
  createComment({
    helpfulVotes: votes,
    helpfulRewardAwarded: votes >= 5,
  });

export const createVerifiedAdviceComment = (): Comment =>
  createComment({
    isVerifiedAdvice: true,
    verifiedAdviceRewardAwarded: true,
    helpfulVotes: 10,
  });
