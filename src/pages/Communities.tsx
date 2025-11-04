import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { Users, Hash, Menu, X, TrendingUp, BarChart3, Loader2 } from 'lucide-react';

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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  }, [communities, currentCommunity, setCurrentCommunity, isLoading]);

  const activeCommunity = communities.find((c) => c.id === currentCommunity);
  const activeChannels = communityChannels.filter((ch) => ch.communityId === currentCommunity);
  const activeChannel = activeChannels.find((ch) => ch.id === currentChannel);

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

  const communityPosts = currentCommunity && currentChannel 
    ? getCommunityPosts(currentCommunity, currentChannel) 
    : [];

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  const handleCommunitySelect = (communityId: string) => {
    setCurrentCommunity(communityId);
    setIsSidebarOpen(false);
  };

  const handleChannelSelect = (channelId: string) => {
    setCurrentChannel(channelId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-gray-400">Loading communities...</p>
        </motion.div>
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-10 text-center space-y-4 max-w-md"
        >
          <Users className="w-16 h-16 text-gray-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">No Communities Available</h2>
          <p className="text-gray-400">
            Communities could not be loaded. Please try refreshing the page.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Mobile sidebar toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="glass px-4 py-2 flex items-center space-x-2 w-full justify-between"
            aria-label="Open communities menu"
          >
            <div className="flex items-center space-x-2">
              <Menu className="w-5 h-5" />
              <span className="text-white font-medium">
                {activeCommunity?.name || 'Select Community'}
              </span>
            </div>
            {activeCommunity && (
              <span className="text-sm text-gray-400">
                {activeCommunity.memberCount.toLocaleString()} members
              </span>
            )}
          </button>
        </div>

        <div className="grid lg:grid-cols-[280px,1fr] xl:grid-cols-[280px,1fr,320px] gap-6">
          {/* Left Sidebar - Community & Channel List */}
          <aside
            className={`
              fixed lg:static inset-0 z-50 lg:z-0
              ${isSidebarOpen ? 'block' : 'hidden lg:block'}
            `}
          >
            {/* Mobile overlay */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Sidebar content */}
            <motion.div
              initial={false}
              animate={{ x: isSidebarOpen ? 0 : -320 }}
              className="
                fixed lg:static top-0 left-0 bottom-0 w-80 lg:w-full
                glass lg:glass-none p-4 space-y-4 overflow-y-auto
                lg:translate-x-0
              "
            >
              {/* Mobile close button */}
              <div className="lg:hidden flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Communities</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close communities menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Community List */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
                  Your Communities
                </h3>
                {communities.slice(0, 8).map((community) => (
                  <button
                    key={community.id}
                    onClick={() => handleCommunitySelect(community.id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg transition-all
                      ${
                        currentCommunity === community.id
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'text-gray-300 hover:bg-white/5 border border-transparent'
                      }
                    `}
                    aria-current={currentCommunity === community.id ? 'page' : undefined}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-lg">{community.shortCode.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{community.name}</p>
                        <p className="text-xs text-gray-400">
                          {community.memberCount.toLocaleString()} members
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Channel List */}
              {activeCommunity && activeChannels.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-2">
                    Channels
                  </h3>
                  {activeChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel.id)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg transition-all flex items-center space-x-2
                        ${
                          currentChannel === channel.id
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }
                      `}
                      aria-current={currentChannel === channel.id ? 'page' : undefined}
                    >
                      <span className="text-lg">{channel.icon}</span>
                      <Hash className="w-4 h-4" />
                      <span className="flex-1">{channel.name}</span>
                      {channel.isLocked && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                          Locked
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </aside>

          {/* Main Content Area */}
          <main className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Channel Header */}
              {activeCommunity && activeChannel ? (
                <div className="glass p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{activeChannel.icon}</span>
                        <Hash className="w-6 h-6 text-gray-400" />
                        <h1 className="text-2xl font-bold text-white">
                          {activeChannel.name}
                        </h1>
                      </div>
                      <p className="text-gray-400">{activeChannel.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Posts</p>
                      <p className="text-xl font-bold text-primary">
                        {activeChannel.postCount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Community Info */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {activeCommunity.memberCount.toLocaleString()} members
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {activeCommunity.postCount.toLocaleString()} posts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass p-10 text-center space-y-4">
                  <Hash className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-400">
                    Select a community and channel to get started
                  </p>
                </div>
              )}

              {/* Posts Placeholder */}
              <AnimatePresence mode="wait">
                {activeCommunity && activeChannel && (
                  <motion.div
                    key={`${currentCommunity}-${currentChannel}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {communityPosts.length > 0 ? (
                      <div className="glass p-6 text-center">
                        <p className="text-gray-400">
                          Found {communityPosts.length} post{communityPosts.length !== 1 ? 's' : ''} in this channel
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Post display coming in future updates
                        </p>
                      </div>
                    ) : (
                      <div className="glass p-10 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                          <Hash className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold text-white">
                            No posts yet in #{activeChannel.name}
                          </h3>
                          <p className="text-gray-400">
                            Be the first to start a conversation in this channel!
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </main>

          {/* Right Rail - Stats & Leaderboards */}
          <aside className="hidden xl:block space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Community Stats */}
              {activeCommunity && (
                <div className="glass p-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-white">Community Stats</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Total Members</span>
                      <span className="text-white font-medium">
                        {activeCommunity.memberCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Total Posts</span>
                      <span className="text-white font-medium">
                        {activeCommunity.postCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Channels</span>
                      <span className="text-white font-medium">
                        {activeChannels.length}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex flex-wrap gap-1.5">
                        {activeCommunity.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-primary/20 text-primary px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* About Community */}
              {activeCommunity && (
                <div className="glass p-4 space-y-3">
                  <h3 className="font-semibold text-white">About</h3>
                  <p className="text-sm text-gray-400">
                    {activeCommunity.description}
                  </p>
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Location</span>
                      <span className="text-white">
                        {activeCommunity.city}, {activeCommunity.state}
                      </span>
                    </div>
                    {activeCommunity.isVerified && (
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          ✓ Verified
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Community Rules Preview */}
              {activeCommunity && activeCommunity.rules.length > 0 && (
                <div className="glass p-4 space-y-3">
                  <h3 className="font-semibold text-white">Community Rules</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    {activeCommunity.rules.slice(0, 3).map((rule, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}
