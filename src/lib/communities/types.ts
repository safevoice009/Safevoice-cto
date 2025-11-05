export type CommunityVisibility = 'public' | 'members_only' | 'invite_only';
export type PostVisibility = 'public' | 'campus' | 'private';

export interface Community {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  description: string;
  city: string;
  state: string;
  country: string;
  logoUrl: string;
  bannerUrl: string;
  guidelinesUrl: string;
  memberCount: number;
  postCount: number;
  visibility: CommunityVisibility;
  rules: string[];
  tags: string[];
  createdAt: number;
  lastActivityAt: number;
  isVerified: boolean;
}

export type CommunityChannelKind =
  | 'general'
  | 'announcements'
  | 'academics'
  | 'mental_health'
  | 'events'
  | 'career'
  | 'memes'
  | 'resources'
  | 'support';

export interface CommunityChannel {
  id: string;
  communityId: string;
  kind: CommunityChannelKind;
  name: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
  postCount: number;
  lastActivityAt: number;
  isDefault: boolean;
  isLocked: boolean;
  createdAt: number;
  rules: string[];
  guidelines?: string;
}

export interface CommunityMembership {
  id: string;
  communityId: string;
  studentId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: number;
  lastVisitedAt: number;
  unreadCount: number;
  isMuted: boolean;
  isActive: boolean;
  isModerator: boolean;
  channelUnreadCounts: Record<string, number>;
  channelLastVisitedAt: Record<string, number>;
  bannedUntil?: number | null;
  banReason?: string | null;
  notificationPrefs: {
    posts: boolean;
    mentions: boolean;
    digest: boolean;
  };
}

export interface CommunityNotificationSettings {
  communityId: string;
  studentId: string;
  notifyOnPost: boolean;
  notifyOnMention: boolean;
  notifyOnReply: boolean;
  muteAll: boolean;
  channelOverrides: Record<string, boolean>;
  updatedAt: number;
}

export interface CommunityPostMeta {
  channelId: string;
  communityId: string;
  postCount: number;
  commentCount: number;
  lastPostAt: number;
  lastCommentAt: number;
  pinnedPostCount: number;
  activeMembers: number;
}

export interface CommunityActivity {
  id: string;
  communityId: string;
  channelId: string | null;
  type: 'post' | 'comment' | 'reaction' | 'join' | 'moderation';
  timestamp: number;
  count: number;
}

export interface ExtendedPostMetadata {
  communityId?: string | null;
  channelId?: string | null;
  visibility?: PostVisibility;
  isAnonymous?: boolean;
  archived?: boolean;
  archivedAt?: number | null;
}

export interface CommunitySeed {
  community: Community;
  channels: CommunityChannel[];
  notifications: CommunityNotificationSettings;
  postsMeta: CommunityPostMeta[];
  activity: CommunityActivity[];
}
