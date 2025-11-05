import { useMemo } from 'react';
import type {
  Community,
  CommunityChannel,
  CommunityPostMeta,
  CommunityNotificationSettings,
  CommunityActivity,
} from '../../lib/communities/types';
import CommunityHeader from './CommunityHeader';
import CommunityChannelTabs from './CommunityChannelTabs';
import CommunitySidebar from './CommunitySidebar';
import CommunityCreatePost from './CommunityCreatePost';
import ChannelRules from './ChannelRules';
import CommunityFeed from './CommunityFeed';
import ActivityHeatmap from './ActivityHeatmap';

interface CommunityDetailViewProps {
  community: Community;
  channels: CommunityChannel[];
  postsMeta: Record<string, CommunityPostMeta>;
  notificationSettings: CommunityNotificationSettings;
  activity: CommunityActivity[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onToggleNotification: (setting: 'notifyOnPost' | 'notifyOnMention' | 'notifyOnReply' | 'muteAll') => void;
  onToggleChannelNotification?: (channelId: string) => void;
  channelUnreadCounts?: Record<string, number>;
  onLeaveCommunity: () => void;
  onViewGuidelines: () => void;
}

export default function CommunityDetailView({
  community,
  channels,
  postsMeta,
  notificationSettings,
  activity,
  activeChannelId,
  onSelectChannel,
  onToggleNotification,
  onToggleChannelNotification,
  channelUnreadCounts,
  onLeaveCommunity,
  onViewGuidelines,
}: CommunityDetailViewProps) {
  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? null;
  const channelMeta = activeChannelId ? postsMeta[activeChannelId] : null;

  const communityActivity = useMemo(
    () => activity.filter((item) => item.communityId === community.id),
    [activity, community.id]
  );

  return (
    <div className="space-y-6">
      <CommunityHeader
        community={community}
        notificationSettings={notificationSettings}
        onToggleNotification={onToggleNotification}
        onLeaveCommunity={onLeaveCommunity}
        onViewGuidelines={onViewGuidelines}
      />

      <CommunityChannelTabs
        channels={channels}
        postsMeta={postsMeta}
        activeChannelId={activeChannelId}
        onSelectChannel={onSelectChannel}
        communityId={community.id}
        notificationSettings={notificationSettings}
        onToggleChannelNotification={onToggleChannelNotification}
        unreadCounts={channelUnreadCounts}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <main className="space-y-6">
          <CommunityCreatePost community={community} channels={channels} activeChannelId={activeChannelId} />
          <ChannelRules
            community={community}
            channelName={activeChannel?.name}
            channelRules={activeChannel?.rules}
          />
          <CommunityFeed community={community} channel={activeChannel} />
        </main>

        <aside className="space-y-6 hidden lg:block">
          <ActivityHeatmap activity={communityActivity} channelId={activeChannel?.id} />
          <CommunitySidebar community={community} channelMeta={channelMeta} />
        </aside>
      </div>

      {/* Mobile sidebar */}
      <div className="space-y-6 lg:hidden">
        <ActivityHeatmap activity={communityActivity} channelId={activeChannel?.id} />
        <CommunitySidebar community={community} channelMeta={channelMeta} />
      </div>
    </div>
  );
}
