import { useMemo } from 'react';
import type { Community, CommunityPostMeta, CommunityMembership } from '../../lib/communities/types';
import type { Post } from '../../lib/store';
import type { StreakData } from '../../lib/tokens/RewardEngine';
import CommunityMemberList from './CommunityMemberList';
import CommunityLeaderboard from './CommunityLeaderboard';

interface CommunitySidebarProps {
  community: Community;
  channelMeta?: CommunityPostMeta | null;
  memberships: CommunityMembership[];
  posts: Post[];
  getVoiceBalance: (studentId: string) => number;
  getStreakData: (studentId: string) => StreakData;
  currentUserId: string;
}

export default function CommunitySidebar({ 
  community, 
  channelMeta,
  memberships,
  posts,
  getVoiceBalance,
  getStreakData,
  currentUserId,
}: CommunitySidebarProps) {
  const approximateWeeklyActive = useMemo(
    () => Math.max(24, Math.round(community.memberCount * 0.08)),
    [community.memberCount]
  );

  return (
    <aside className="space-y-6">
      {/* Member List with Badges */}
      <CommunityMemberList
        communityId={community.id}
        memberships={memberships}
        posts={posts}
        getVoiceBalance={getVoiceBalance}
        getStreakData={getStreakData}
        currentUserId={currentUserId}
        approximateWeeklyActive={approximateWeeklyActive}
      />

      {/* Leaderboard */}
      <CommunityLeaderboard
        communityId={community.id}
        memberships={memberships}
        posts={posts}
        getVoiceBalance={getVoiceBalance}
        getStreakData={getStreakData}
        currentUserId={currentUserId}
      />

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
