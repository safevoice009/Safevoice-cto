import { useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, Pin, Hash } from 'lucide-react';
import { useStore } from '../../lib/store';
import PostCard from '../feed/PostCard';
import type { Community, CommunityChannel } from '../../lib/communities/types';

interface CommunityFeedProps {
  community: Community;
  channel: CommunityChannel | null;
}

export default function CommunityFeed({ community, channel }: CommunityFeedProps) {
  const [showArchived, setShowArchived] = useState(false);
  
  const getCommunityPosts = useStore((state) => state.getCommunityPosts);
  const getPinnedCommunityPosts = useStore((state) => state.getPinnedCommunityPosts);
  const getArchivedCommunityPosts = useStore((state) => state.getArchivedCommunityPosts);

  const pinnedPosts = getPinnedCommunityPosts(community.id, channel?.id);
  const regularPosts = getCommunityPosts(community.id, channel?.id);
  const archivedPosts = getArchivedCommunityPosts(community.id, channel?.id);

  const hasArchived = archivedPosts.length > 0;

  return (
    <div className="space-y-6">
      {/* Pinned Posts Section */}
      {pinnedPosts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Pin className="h-5 w-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Pinned Posts</h2>
            <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
              {pinnedPosts.length}
            </span>
          </div>
          <div className="space-y-4">
            {pinnedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Channel Header */}
      {channel && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
          <Hash className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">{channel.name}</h2>
            <p className="text-sm text-gray-400">{channel.description}</p>
          </div>
        </div>
      )}

      {/* Regular Posts */}
      {regularPosts.length > 0 ? (
        <div className="space-y-4">
          {regularPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <Hash className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">
            No posts yet in {channel ? `#${channel.name}` : 'this community'}
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Be the first to start a conversation!
          </p>
        </div>
      )}

      {/* Archive Toggle and Section */}
      {hasArchived && (
        <div className="space-y-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
          >
            <Archive className="h-4 w-4" />
            <span>
              {showArchived ? 'Hide' : 'Show'} Archived Posts ({archivedPosts.length})
            </span>
          </button>

          {showArchived && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="rounded-lg border border-gray-500/20 bg-gray-500/5 p-3">
                <p className="text-xs text-gray-400">
                  <Archive className="mr-1 inline h-3 w-3" />
                  Posts older than 30 days are automatically archived
                </p>
              </div>
              {archivedPosts.map((post) => (
                <div key={post.id} className="relative">
                  <div className="absolute left-0 top-0 z-10 rounded-br-lg rounded-tl-2xl bg-gray-600/90 px-2 py-1">
                    <span className="text-xs font-medium text-gray-200">Archived</span>
                  </div>
                  <PostCard post={post} />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
