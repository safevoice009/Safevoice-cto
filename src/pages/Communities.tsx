import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CommunityListPanel from '../components/communities/CommunityListPanel';
import CommunityDetailView from '../components/community/CommunityDetailView';
import { useStore, type Post, type Comment } from '../lib/store';
import type { StreakData } from '../lib/tokens/RewardEngine';
import type { CommunityMembership } from '../lib/communities/types';

const createNotificationSettings = (communityId: string, studentId: string) => ({
  communityId,
  studentId,
  notifyOnPost: false,
  notifyOnMention: true,
  notifyOnReply: true,
  muteAll: false,
  channelOverrides: {},
  updatedAt: Date.now(),
});

const DAY_MS = 24 * 60 * 60 * 1000;

type AggregatedMemberMetrics = {
  voiceBalance: number;
  streakData: StreakData;
};

type InternalMemberStats = {
  voice: number;
  activityDays: Set<number>;
  lastActive: number;
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const countReactions = (reactions: Post['reactions']): number =>
  reactions.heart + reactions.fire + reactions.clap + reactions.sad + reactions.angry + reactions.laugh;

const buildMemberMetrics = (
  posts: Post[],
  currentStudentId: string,
  currentVoiceBalance: number,
  loginStreak: number,
  postingStreak: number,
  lastLoginDate: string | null,
  lastPostDate: string | null
): Map<string, AggregatedMemberMetrics> => {
  const statsMap = new Map<string, InternalMemberStats>();

  const ensureStats = (studentId: string): InternalMemberStats => {
    const existing = statsMap.get(studentId);
    if (existing) {
      return existing;
    }
    const created: InternalMemberStats = {
      voice: 0,
      activityDays: new Set<number>(),
      lastActive: 0,
    };
    statsMap.set(studentId, created);
    return created;
  };

  const addActivity = (stats: InternalMemberStats, timestamp: number) => {
    if (!Number.isFinite(timestamp)) {
      return;
    }
    stats.activityDays.add(Math.floor(timestamp / DAY_MS));
    stats.lastActive = Math.max(stats.lastActive, timestamp);
  };

  const processComment = (comment: Comment) => {
    const stats = ensureStats(comment.studentId);
    const reactionCount = countReactions(comment.reactions);
    stats.voice += 30 + reactionCount * 3 + comment.helpfulVotes * 20;
    addActivity(stats, comment.createdAt);
    comment.replies.forEach(processComment);
  };

  posts.forEach((post) => {
    const stats = ensureStats(post.studentId);
    const reactionCount = countReactions(post.reactions);
    stats.voice += 80 + reactionCount * 5 + (post.helpfulCount ?? 0) * 25;
    addActivity(stats, post.createdAt);
    post.comments.forEach(processComment);
  });

  const computeStreaks = (activityDays: Set<number>) => {
    if (activityDays.size === 0) {
      return { current: 0, longest: 0 };
    }

    const days = Array.from(activityDays).sort((a, b) => a - b);
    let longest = 1;
    let run = 1;

    for (let index = 1; index < days.length; index += 1) {
      if (days[index] === days[index - 1] + 1) {
        run += 1;
      } else {
        longest = Math.max(longest, run);
        run = 1;
      }
    }
    longest = Math.max(longest, run);

    const todayDay = Math.floor(Date.now() / DAY_MS);
    let current = 0;
    if (activityDays.has(todayDay)) {
      current = 1;
      let pointer = todayDay - 1;
      while (activityDays.has(pointer)) {
        current += 1;
        pointer -= 1;
      }
    }

    return { current, longest };
  };

  const result = new Map<string, AggregatedMemberMetrics>();

  statsMap.forEach((stats, studentId) => {
    const { current, longest } = computeStreaks(stats.activityDays);
    const lastActiveDate = stats.lastActive ? new Date(stats.lastActive).toISOString() : null;

    result.set(studentId, {
      voiceBalance: Math.max(60, Math.round(stats.voice)),
      streakData: {
        currentStreak: current,
        longestStreak: Math.max(longest, current),
        lastLoginDate: lastActiveDate,
        streakBroken: current === 0,
        lastStreakResetDate: null,
        currentPostStreak: current,
        longestPostStreak: Math.max(longest, current),
        lastPostDate: lastActiveDate,
        postStreakBroken: current === 0,
        lastPostStreakResetDate: null,
      },
    });
  });

  if (currentStudentId) {
    result.set(currentStudentId, {
      voiceBalance: currentVoiceBalance,
      streakData: {
        currentStreak: loginStreak,
        longestStreak: Math.max(loginStreak, postingStreak),
        lastLoginDate,
        streakBroken: loginStreak === 0,
        lastStreakResetDate: null,
        currentPostStreak: postingStreak,
        longestPostStreak: Math.max(postingStreak, loginStreak),
        lastPostDate,
        postStreakBroken: postingStreak === 0,
        lastPostStreakResetDate: null,
      },
    });
  }

  return result;
};

const fallbackVoiceBalance = (studentId: string, membership?: CommunityMembership): number => {
  const hash = hashString(studentId);
  const tenureBoost = membership
    ? Math.min(600, Math.max(0, Math.floor((Date.now() - membership.joinedAt) / DAY_MS)) * 4)
    : 0;
  const roleBoost = membership
    ? membership.role === 'admin'
      ? 600
      : membership.role === 'moderator' || membership.isModerator
        ? 320
        : 0
    : 0;

  return 120 + (hash % 500) + tenureBoost + roleBoost;
};

const fallbackStreakData = (studentId: string, membership?: CommunityMembership): StreakData => {
  const hash = hashString(studentId);
  const daysSinceVisit = membership ? Math.floor((Date.now() - membership.lastVisitedAt) / DAY_MS) : 0;
  const isActive = !membership || daysSinceVisit <= 1;
  const base = (hash % 12) + 1;
  const current = isActive ? base : 0;
  const longest = Math.max(base + (hash % 18), current);
  const lastVisit = membership ? new Date(membership.lastVisitedAt).toISOString() : null;

  return {
    currentStreak: current,
    longestStreak: longest,
    lastLoginDate: lastVisit,
    streakBroken: !isActive,
    lastStreakResetDate: null,
    currentPostStreak: current,
    longestPostStreak: longest,
    lastPostDate: lastVisit,
    postStreakBroken: !isActive,
    lastPostStreakResetDate: null,
  };
};

export default function Communities() {
  const {
    communities,
    communityChannels,
    communityPostsMeta,
    communityNotifications,
    communityActivity,
    currentCommunity,
    currentChannel,
    studentId,
    posts,
    communityMemberships,
    setCurrentCommunity,
    setCurrentChannel,
    initializeStore,
    toggleCommunityNotification,
    toggleChannelNotification,
    leaveCommunity,
    voiceBalance,
    loginStreak,
    postingStreak,
    lastLoginDate,
    lastPostDate,
  } = useStore();

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const memberMetrics = useMemo(() => {
    return buildMemberMetrics(
      posts,
      studentId,
      voiceBalance,
      loginStreak,
      postingStreak,
      lastLoginDate,
      lastPostDate
    );
  }, [posts, studentId, voiceBalance, loginStreak, postingStreak, lastLoginDate, lastPostDate]);

  const membershipByStudent = useMemo(() => {
    const map = new Map<string, CommunityMembership>();
    communityMemberships.forEach((membership) => {
      map.set(membership.studentId, membership);
    });
    return map;
  }, [communityMemberships]);

  const getVoiceBalance = useCallback(
    (userId: string) => {
      if (userId === studentId) {
        return voiceBalance;
      }
      const cached = memberMetrics.get(userId);
      if (cached) {
        return cached.voiceBalance;
      }
      const membership = membershipByStudent.get(userId);
      return fallbackVoiceBalance(userId, membership);
    },
    [studentId, voiceBalance, memberMetrics, membershipByStudent]
  );

  const getStreakData = useCallback(
    (userId: string): StreakData => {
      if (userId === studentId) {
        return {
          currentStreak: loginStreak,
          longestStreak: Math.max(loginStreak, postingStreak),
          lastLoginDate,
          streakBroken: loginStreak === 0,
          lastStreakResetDate: null,
          currentPostStreak: postingStreak,
          longestPostStreak: Math.max(postingStreak, loginStreak),
          lastPostDate,
          postStreakBroken: postingStreak === 0,
          lastPostStreakResetDate: null,
        };
      }
      const cached = memberMetrics.get(userId);
      if (cached) {
        return cached.streakData;
      }
      const membership = membershipByStudent.get(userId);
      return fallbackStreakData(userId, membership);
    },
    [studentId, loginStreak, postingStreak, lastLoginDate, lastPostDate, memberMetrics, membershipByStudent]
  );

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  useEffect(() => {
    if (communities.length > 0 || communityChannels.length > 0) {
      setIsLoading(false);
      return;
    }

    const timer = window.setTimeout(() => setIsLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, [communities.length, communityChannels.length]);

  useEffect(() => {
    if (!isLoading && communities.length > 0 && !currentCommunity) {
      setCurrentCommunity(communities[0].id);
    }
  }, [communities, currentCommunity, isLoading, setCurrentCommunity]);

  const activeCommunity = communities.find((c) => c.id === currentCommunity) ?? null;
  const activeChannels = communityChannels.filter((channel) => channel.communityId === currentCommunity);

  useEffect(() => {
    if (!activeCommunity || activeChannels.length === 0) {
      return;
    }

    const hasCurrentChannel = activeChannels.some((channel) => channel.id === currentChannel);
    if (!hasCurrentChannel) {
      const defaultChannel = activeChannels.find((channel) => channel.isDefault) ?? activeChannels[0];
      setCurrentChannel(defaultChannel.id);
    }
  }, [activeCommunity, activeChannels, currentChannel, setCurrentChannel]);

  const handleChannelSelect = (channelId: string) => {
    setCurrentChannel(channelId);
  };

  const handleToggleNotification = (setting: 'notifyOnPost' | 'notifyOnMention' | 'notifyOnReply' | 'muteAll') => {
    if (currentCommunity) {
      toggleCommunityNotification(currentCommunity, setting);
    }
  };

  const handleToggleChannelNotification = (channelId: string) => {
    if (currentCommunity) {
      toggleChannelNotification(currentCommunity, channelId);
    }
  };

  const handleLeaveCommunity = () => {
    if (currentCommunity) {
      leaveCommunity(currentCommunity);
    }
  };

  const handleViewGuidelines = () => {
    navigate('/guidelines');
  };

  // Compute channel unread counts based on posts
  const channelUnreadCounts = activeCommunity
    ? activeChannels.reduce((acc, channel) => {
        // Count posts in this channel that the user hasn't seen (using a simple heuristic)
        const membership = communityMemberships.find(
          (m) => m.communityId === activeCommunity.id && m.studentId === studentId && m.isActive
        );
        
        if (!membership) {
          acc[channel.id] = 0;
          return acc;
        }

        // Count posts created after last visit that aren't from current user
        const channelPosts = posts.filter(
          (p) =>
            p.communityId === activeCommunity.id &&
            p.channelId === channel.id &&
            p.studentId !== studentId &&
            p.createdAt > membership.lastVisitedAt
        );

        acc[channel.id] = channelPosts.length;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const showSkeleton = isLoading && communities.length === 0;

  const notificationSettings = currentCommunity
    ? communityNotifications[currentCommunity] ?? createNotificationSettings(currentCommunity, studentId)
    : createNotificationSettings('', studentId);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
          <section>
            <CommunityListPanel isLoading={showSkeleton} />
          </section>

          <section className="space-y-6">
            {showSkeleton ? (
              <div className="space-y-6">
                <div className="h-64 rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
                <div className="h-56 rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
                <div className="h-60 rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
              </div>
            ) : activeCommunity ? (
              <CommunityDetailView
                community={activeCommunity}
                channels={activeChannels}
                postsMeta={communityPostsMeta}
                notificationSettings={notificationSettings}
                activity={communityActivity}
                activeChannelId={currentChannel}
                onSelectChannel={handleChannelSelect}
                onToggleNotification={handleToggleNotification}
                onToggleChannelNotification={handleToggleChannelNotification}
                channelUnreadCounts={channelUnreadCounts}
                onLeaveCommunity={handleLeaveCommunity}
                onViewGuidelines={handleViewGuidelines}
                memberships={communityMemberships.filter(m => m.communityId === activeCommunity.id && m.isActive)}
                posts={posts}
                getVoiceBalance={getVoiceBalance}
                getStreakData={getStreakData}
                currentUserId={studentId}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
                <h3 className="text-xl font-semibold text-white">Select a community to get started</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Choose a community from the directory to explore channels, posts, and engagement stats.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
