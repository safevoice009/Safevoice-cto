import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CommunityListPanel from '../components/communities/CommunityListPanel';
import CommunityDetailView from '../components/community/CommunityDetailView';
import { useStore } from '../lib/store';

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
  } = useStore();

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

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
