import { useMemo } from 'react';
import { Users, Award, Shield } from 'lucide-react';
import type { Community, CommunityPostMeta } from '../../lib/communities/types';

interface CommunitySidebarProps {
  community: Community;
  channelMeta?: CommunityPostMeta | null;
}

const generateAnonymousAvatarColor = (index: number) => {
  const colors = [
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-green-500/20 text-green-400',
    'bg-pink-500/20 text-pink-400',
    'bg-yellow-500/20 text-yellow-400',
    'bg-indigo-500/20 text-indigo-400',
  ];
  return colors[index % colors.length];
};

const TOP_CONTRIBUTOR_COUNTS = [48, 39, 32, 26, 18];

export default function CommunitySidebar({ community, channelMeta }: CommunitySidebarProps) {
  const approximateWeeklyActive = useMemo(
    () => Math.max(24, Math.round(community.memberCount * 0.08)),
    [community.memberCount]
  );

  const mockMembers = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => ({
        id: `member-${index}`,
        role: index === 0 ? 'moderator' : 'member',
      })),
    []
  );

  const mockTopContributors = useMemo(
    () =>
      TOP_CONTRIBUTOR_COUNTS.map((posts, index) => ({
        id: `contributor-${index}`,
        posts,
      })),
    []
  );

  const mockModerators = useMemo(
    () =>
      Array.from({ length: 3 }, (_, index) => ({
        id: `mod-${index}`,
      })),
    []
  );

  return (
    <aside className="space-y-6">
      {/* Active Members */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold text-white">Active Members</h2>
          </div>
          <span className="text-xs text-gray-400">~{approximateWeeklyActive.toLocaleString()} active this week</span>
        </div>
        <div className="space-y-2">
          {mockMembers.slice(0, 6).map((member, index) => (
            <div key={member.id} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${generateAnonymousAvatarColor(index)}`}
              >
                A{index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-300">Anonymous User</p>
                {member.role === 'moderator' && (
                  <span className="text-xs text-primary">Moderator</span>
                )}
              </div>
              <div className="h-2 w-2 rounded-full bg-green-400" title="Online" />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
        >
          View all members
        </button>
      </div>

      {/* Top Contributors */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-white">Top Contributors</h2>
        </div>
        <div className="space-y-3">
          {mockTopContributors.map((contributor, index) => (
            <div key={contributor.id} className="flex items-center gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                #{index + 1}
              </div>
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${generateAnonymousAvatarColor(index)}`}
              >
                A{index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-300">Anonymous User</p>
              </div>
              <div className="text-xs text-gray-400">{contributor.posts} posts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Moderators */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-white">Moderators</h2>
        </div>
        <div className="space-y-2">
          {mockModerators.map((mod, index) => (
            <div key={mod.id} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${generateAnonymousAvatarColor(index)}`}
              >
                M{index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-300">Anonymous Moderator</p>
                <p className="text-xs text-primary">Community Moderator</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Stats - Only show if channelMeta exists */}
      {channelMeta && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
          <h2 className="mb-3 text-lg font-semibold text-white">Channel Stats</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Posts</span>
              <span className="font-semibold text-white">{channelMeta.postCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Comments</span>
              <span className="font-semibold text-white">{channelMeta.commentCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Active Members</span>
              <span className="font-semibold text-white">{channelMeta.activeMembers.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Pinned Posts</span>
              <span className="font-semibold text-white">{channelMeta.pinnedPostCount}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
