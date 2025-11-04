import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Hash, TrendingUp, BarChart3 } from 'lucide-react';
import CommunityListPanel from '../components/communities/CommunityListPanel';
import { useStore } from '../lib/store';
import { formatCount, getRelativeTime } from '../lib/utils';

export default function Communities() {
  const {
    communities,
    communityChannels,
    currentCommunity,
    currentChannel,
    setCurrentCommunity,
    setCurrentChannel,
    initializeStore,
    getCommunityPosts,
  } = useStore();

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
  const activeChannel = activeChannels.find((channel) => channel.id === currentChannel) ?? null;

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

  const communityPosts = currentCommunity && currentChannel ? getCommunityPosts(currentCommunity, currentChannel) : [];

  const handleChannelSelect = (channelId: string) => {
    setCurrentChannel(channelId);
  };

  const showSkeleton = isLoading && communities.length === 0;

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
              <>
                <motion.div
                  key={activeCommunity.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-lg"
                >
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-primary/60">Selected community</p>
                        <h2 className="mt-1 text-2xl font-semibold text-white">{activeCommunity.name}</h2>
                        <p className="text-sm text-gray-400">
                          {activeCommunity.city}, {activeCommunity.state}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Last activity</p>
                        <p className="text-sm font-medium text-white">{getRelativeTime(activeCommunity.lastActivityAt)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" aria-hidden />
                        <span className="font-semibold text-white">{formatCount(activeCommunity.memberCount)}</span>
                        <span>members</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" aria-hidden />
                        <span className="text-white">{formatCount(activeCommunity.postCount)} posts</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                      {activeChannel ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 text-white">
                            <span className="text-2xl" aria-hidden>{activeChannel.icon}</span>
                            <Hash className="h-5 w-5 text-gray-400" aria-hidden />
                            <h3 className="text-xl font-semibold">{activeChannel.name}</h3>
                          </div>
                          <p className="text-sm text-gray-400">{activeChannel.description}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Select a channel to view community activity.</p>
                      )}
                    </div>
                  </div>
                </motion.div>

                {activeChannels.length > 0 && (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Channels</h3>
                      <span className="text-xs text-gray-400">{activeChannels.length} total</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {activeChannels.map((channel) => {
                        const isActive = channel.id === currentChannel;
                        return (
                          <button
                            key={channel.id}
                            type="button"
                            onClick={() => handleChannelSelect(channel.id)}
                            className={`
                              flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all
                              ${
                                isActive
                                  ? 'border-primary/30 bg-primary/10 text-white shadow-lg'
                                  : 'border-transparent bg-white/5 text-gray-300 hover:bg-white/10'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl" aria-hidden>{channel.icon}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Hash className="h-4 w-4 text-gray-400" aria-hidden />
                                  <span className="text-sm font-medium">{channel.name}</span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {channel.postCount.toLocaleString()} posts • {getRelativeTime(channel.lastActivityAt)}
                                </p>
                              </div>
                            </div>
                            {channel.isLocked && (
                              <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                                Locked
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {activeChannel && (
                    <motion.div
                      key={`${currentCommunity}-${currentChannel}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {communityPosts.length > 0 ? (
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-sm text-gray-300">
                          <p>
                            Found {communityPosts.length} post{communityPosts.length !== 1 ? 's' : ''} in #{activeChannel.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Post feed implementation coming soon.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                            <Hash className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white">No posts yet in #{activeChannel.name}</h3>
                            <p className="text-sm text-gray-400">
                              Be the first to start a conversation in this channel!
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
                      <h3 className="text-lg font-semibold text-white">Community Stats</h3>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-gray-300">
                      <div className="flex items-center justify-between">
                        <span>Total Members</span>
                        <span className="font-semibold text-white">{activeCommunity.memberCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total Posts</span>
                        <span className="font-semibold text-white">{activeCommunity.postCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Channels</span>
                        <span className="font-semibold text-white">{activeChannels.length}</span>
                      </div>
                      <div className="pt-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Tags</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {activeCommunity.tags.slice(0, 6).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold text-white">About this community</h3>
                    <p className="mt-3 text-sm text-gray-300">{activeCommunity.description}</p>
                    <div className="mt-4 space-y-2 text-sm text-gray-300">
                      <div className="flex items-center justify-between">
                        <span>Location</span>
                        <span className="text-white">
                          {activeCommunity.city}, {activeCommunity.state}
                        </span>
                      </div>
                      {activeCommunity.isVerified && (
                        <span className="inline-flex items-center rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                          ✓ Verified campus community
                        </span>
                      )}
                    </div>
                  </div>

                  {activeCommunity.rules.length > 0 && (
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 lg:col-span-2">
                      <h3 className="text-lg font-semibold text-white">Community Guidelines</h3>
                      <ul className="mt-3 space-y-2 text-sm text-gray-300">
                        {activeCommunity.rules.slice(0, 5).map((rule, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-0.5 text-primary">•</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
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
