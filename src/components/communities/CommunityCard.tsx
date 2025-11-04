import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { formatCount, getRelativeTime } from '../../lib/utils';
import type { Community, CommunityMembership } from '../../lib/communities/types';
import type { Post } from '../../lib/store';

interface CommunityCardProps {
  community: Community;
  membership: CommunityMembership | null;
  unreadCount: number;
  recentPosts: Post[];
  onJoin: (communityId: string) => void;
  onLeave: (communityId: string) => void;
  onSelect: (communityId: string) => void;
  isProcessing?: boolean;
}

export default function CommunityCard({
  community,
  membership,
  unreadCount,
  recentPosts,
  onJoin,
  onLeave,
  onSelect,
  isProcessing = false,
}: CommunityCardProps) {
  const isMember = membership?.isActive ?? false;
  
  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    
    if (isMember) {
      onLeave(community.id);
    } else {
      onJoin(community.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(community.id)}
      className="glass relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:border-primary/30 hover:bg-white/10 cursor-pointer"
    >
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-black shadow-lg"
        >
          {unreadCount > 99 ? '99+' : unreadCount} New
        </motion.div>
      )}

      <div className="mb-4 flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-purple-500/20 to-primary/10 text-xl font-bold text-white shadow-lg ring-2 ring-primary/20">
            {getInitials(community.name)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="truncate text-lg font-semibold text-white flex items-center gap-2">
                {community.name}
                {community.isVerified && (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-400" aria-label="Verified" />
                )}
              </h3>
              <p className="text-xs text-gray-400">
                {community.city}, {community.state}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mb-4 line-clamp-2 text-sm text-gray-300">
        {community.description}
      </p>

      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Users className="h-4 w-4" aria-hidden />
          <span className="font-medium text-white">{formatCount(community.memberCount)}</span>
          <span>members</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <TrendingUp className="h-4 w-4" aria-hidden />
          <span className="text-white">{getRelativeTime(community.lastActivityAt)}</span>
        </div>
      </div>

      {recentPosts.length > 0 && (
        <div className="mb-4 space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Recent Activity
          </p>
          <div className="space-y-2">
            {recentPosts.slice(0, 2).map((post) => (
              <div key={post.id} className="text-xs text-gray-300">
                <p className="line-clamp-1">
                  {post.isEncrypted ? '🔒 ' : ''}
                  {post.content.substring(0, 80)}
                  {post.content.length > 80 ? '...' : ''}
                </p>
                <p className="mt-0.5 text-gray-500">
                  {getRelativeTime(post.createdAt)} • {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {community.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {community.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
          {community.tags.length > 3 && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
              +{community.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <motion.button
        type="button"
        onClick={handleButtonClick}
        disabled={isProcessing}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg transition-all
          ${
            isMember
              ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
              : 'bg-primary text-black hover:bg-primary/90'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </span>
        ) : isMember ? (
          'Joined'
        ) : (
          'Join Community'
        )}
      </motion.button>
    </motion.div>
  );
}
