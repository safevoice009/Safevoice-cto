import { type CommunityChannel, type CommunityPostMeta } from '../../lib/communities/types';
import { getRelativeTime } from '../../lib/utils';

interface CommunityChannelTabsProps {
  channels: CommunityChannel[];
  postsMeta: Record<string, CommunityPostMeta>;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

const SCROLL_CLASSES = 'flex overflow-x-auto no-scrollbar gap-2 sm:gap-3';

export default function CommunityChannelTabs({
  channels,
  postsMeta,
  activeChannelId,
  onSelectChannel,
}: CommunityChannelTabsProps) {
  const sortedChannels = [...channels].sort((a, b) => a.order - b.order);

  return (
    <nav aria-label="Community channels" className="rounded-2xl border border-white/5 bg-white/5 p-3">
      <div className={SCROLL_CLASSES} role="tablist">
        {sortedChannels.map((channel) => {
          const meta = postsMeta[channel.id];
          const isActive = channel.id === activeChannelId;

          return (
            <button
              key={channel.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectChannel(channel.id)}
              className={`group min-w-[140px] flex-shrink-0 rounded-xl border px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isActive
                  ? 'border-primary/40 bg-primary/20 text-white shadow-lg'
                  : 'border-transparent bg-black/20 text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {channel.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold">{channel.name}</p>
                  <p className="text-xs text-gray-400">
                    {meta ? `${meta.postCount.toLocaleString()} posts • ${getRelativeTime(meta.lastPostAt)}` : 'No activity yet'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
