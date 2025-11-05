import { Bell, BellOff } from 'lucide-react';
import {
  type CommunityChannel,
  type CommunityPostMeta,
  type CommunityNotificationSettings,
} from '../../lib/communities/types';
import { getRelativeTime } from '../../lib/utils';

interface CommunityChannelTabsProps {
  channels: CommunityChannel[];
  postsMeta: Record<string, CommunityPostMeta>;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  communityId: string;
  notificationSettings?: CommunityNotificationSettings;
  onToggleChannelNotification?: (channelId: string) => void;
  unreadCounts?: Record<string, number>;
}

const SCROLL_CLASSES = 'flex overflow-x-auto no-scrollbar gap-2 sm:gap-3';

const getChannelNotificationEnabled = (
  settings: CommunityNotificationSettings | undefined,
  channelId: string
): boolean => {
  if (!settings) return false;
  if (settings.muteAll) return false;

  const overrides = settings.channelOverrides ?? {};
  if (Object.prototype.hasOwnProperty.call(overrides, channelId)) {
    return Boolean(overrides[channelId]);
  }

  return settings.notifyOnPost;
};

export default function CommunityChannelTabs({
  channels,
  postsMeta,
  activeChannelId,
  onSelectChannel,
  communityId,
  notificationSettings,
  onToggleChannelNotification,
  unreadCounts = {},
}: CommunityChannelTabsProps) {
  const sortedChannels = [...channels].sort((a, b) => a.order - b.order);

  return (
    <nav aria-label={`Channels for ${communityId}`} className="rounded-2xl border border-white/5 bg-white/5 p-3">
      <div className={SCROLL_CLASSES} role="tablist">
        {sortedChannels.map((channel) => {
          const meta = postsMeta[channel.id];
          const isActive = channel.id === activeChannelId;
          const unread = unreadCounts[channel.id] ?? 0;
          const isEnabled = getChannelNotificationEnabled(notificationSettings, channel.id);
          const toggleDisabled = notificationSettings?.muteAll ?? false;

          return (
            <div
              key={channel.id}
              className={`group relative flex min-w-[160px] flex-shrink-0 items-center gap-3 rounded-xl border px-3 py-3 transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/40 ${
                isActive
                  ? 'border-primary/40 bg-primary/20 text-white shadow-lg'
                  : 'border-transparent bg-black/20 text-gray-300 hover:bg-white/10'
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectChannel(channel.id)}
                className="flex flex-1 items-start gap-3 text-left focus:outline-none"
              >
                <span className="mt-0.5 text-xl" aria-hidden>
                  {channel.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{channel.name}</p>
                    {unread > 0 && (
                      <span className="rounded-full bg-primary/80 px-2 py-0.5 text-[11px] font-semibold text-black shadow">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {meta
                      ? `${meta.postCount.toLocaleString()} posts • ${getRelativeTime(meta.lastPostAt)}`
                      : 'No activity yet'}
                  </p>
                </div>
              </button>

              {onToggleChannelNotification && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleChannelNotification(channel.id);
                  }}
                  disabled={toggleDisabled}
                  className={`rounded-lg p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    toggleDisabled
                      ? 'cursor-not-allowed text-gray-500'
                      : isEnabled
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-gray-400 hover:bg-white/10'
                  }`}
                  aria-label={`${isEnabled ? 'Disable' : 'Enable'} notifications for ${channel.name}`}
                >
                  {isEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
