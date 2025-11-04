import { Plus, Pin, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Community, CommunityChannel, CommunityPostMeta, CommunityNotificationSettings } from '../../lib/communities/types';
import CommunityHeader from './CommunityHeader';
import CommunityChannelTabs from './CommunityChannelTabs';
import CommunitySidebar from './CommunitySidebar';

interface CommunityDetailViewProps {
  community: Community;
  channels: CommunityChannel[];
  postsMeta: Record<string, CommunityPostMeta>;
  notificationSettings: CommunityNotificationSettings;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onToggleNotification: (setting: 'notifyOnPost' | 'notifyOnMention' | 'notifyOnReply' | 'muteAll') => void;
  onLeaveCommunity: () => void;
  onViewGuidelines: () => void;
  onCreatePost: () => void;
  postCount: number;
}

export default function CommunityDetailView({
  community,
  channels,
  postsMeta,
  notificationSettings,
  activeChannelId,
  onSelectChannel,
  onToggleNotification,
  onLeaveCommunity,
  onViewGuidelines,
  onCreatePost,
  postCount,
}: CommunityDetailViewProps) {
  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? null;
  const channelMeta = activeChannelId ? postsMeta[activeChannelId] : null;
  const pinnedPostCount = channelMeta?.pinnedPostCount ?? 0;

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
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <main className="space-y-6">
          {/* Create Post Button */}
          <button
            type="button"
            onClick={onCreatePost}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-left transition-all hover:border-primary/50 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Plus className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-white">Create a Post</p>
              <p className="text-sm text-gray-400">
                Share your thoughts in {activeChannel ? `#${activeChannel.name.toLowerCase()}` : 'this community'}
              </p>
            </div>
          </button>

          {/* Pinned Posts Area */}
          {pinnedPostCount > 0 && (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="h-5 w-5 text-yellow-400" aria-hidden />
                  <h2 className="text-lg font-semibold text-white">Pinned Posts</h2>
                  <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                    {pinnedPostCount}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Important announcements and featured posts from moderators
              </p>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-center">
                <p className="text-sm text-gray-400">Pinned posts will appear here</p>
              </div>
            </div>
          )}

          {/* Channel Feed Content */}
          <AnimatePresence mode="wait">
            {activeChannel && (
              <motion.div
                key={`${community.id}-${activeChannel.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {postCount > 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
                    <div className="flex items-center gap-3">
                      <Hash className="h-5 w-5 text-primary" aria-hidden />
                      <h2 className="text-lg font-semibold text-white">{activeChannel.name}</h2>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{activeChannel.description}</p>
                    <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                      <p className="text-sm text-gray-300">
                        Found {postCount} post{postCount !== 1 ? 's' : ''} in this channel
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Post feed implementation coming in subsequent tickets
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                      <Hash className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-white">
                        No posts yet in #{activeChannel.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Be the first to start a conversation in this channel!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onCreatePost}
                      className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      Create First Post
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Sidebar - Collapses on mobile */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <CommunitySidebar community={community} channelMeta={channelMeta} />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar - Shows below feed on narrow screens */}
      <div className="lg:hidden">
        <CommunitySidebar community={community} channelMeta={channelMeta} />
      </div>
    </div>
  );
}
