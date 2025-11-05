import { useMemo, useState } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { CommunityMembership } from '../../lib/communities/types';
import type { Post } from '../../lib/store';
import type { StreakData } from '../../lib/tokens/RewardEngine';
import {
  calculateMemberBadges,
  getAnonymousAvatarColor,
  getAnonymousDisplayName,
  type Badge,
  type MemberBadges,
} from '../../lib/communities/badges';

interface CommunityMemberListProps {
  communityId: string;
  memberships: CommunityMembership[];
  posts: Post[];
  getVoiceBalance: (studentId: string) => number;
  getStreakData: (studentId: string) => StreakData;
  currentUserId: string;
  approximateWeeklyActive: number;
}

interface BadgeChipProps {
  badge: Badge;
  size?: 'sm' | 'md';
}

function BadgeChip({ badge, size = 'sm' }: BadgeChipProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${badge.color} ${sizeClasses} font-medium transition-all hover:scale-105`}
      title={badge.description}
      aria-label={`${badge.name}: ${badge.description}`}
    >
      <span role="img" aria-hidden="true">{badge.icon}</span>
      <span>{badge.name}</span>
    </span>
  );
}

interface MemberRowProps {
  member: MemberBadges;
  index: number;
  isCurrentUser: boolean;
  isOnline: boolean;
  role: string;
}

function MemberRow({ member, index, isCurrentUser, isOnline, role }: MemberRowProps) {
  const [showAllBadges, setShowAllBadges] = useState(false);
  const displayBadges = showAllBadges ? member.badges : member.badges.slice(0, 2);
  const hasMoreBadges = member.badges.length > 2;

  return (
    <div className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5">
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform group-hover:scale-105 ${getAnonymousAvatarColor(index)}`}
        role="img"
        aria-label="Anonymous avatar"
      >
        {getAnonymousDisplayName(index, role).charAt(0)}
        {index + 1}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-300 truncate">
            {getAnonymousDisplayName(index, role)}
            {isCurrentUser && <span className="ml-1 text-xs text-primary">(You)</span>}
          </p>
          {isOnline && (
            <div 
              className="h-2 w-2 flex-shrink-0 rounded-full bg-green-400 animate-pulse" 
              title="Online"
              aria-label="Online status"
            />
          )}
        </div>
        
        {/* Badges */}
        {displayBadges.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {displayBadges.map((badge) => (
              <BadgeChip key={badge.type} badge={badge} size="sm" />
            ))}
            {hasMoreBadges && !showAllBadges && (
              <button
                type="button"
                onClick={() => setShowAllBadges(true)}
                className="flex items-center gap-0.5 rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-300"
                aria-label="Show more badges"
              >
                <span>+{member.badges.length - 2}</span>
                <ChevronDown className="h-3 w-3" aria-hidden />
              </button>
            )}
            {hasMoreBadges && showAllBadges && (
              <button
                type="button"
                onClick={() => setShowAllBadges(false)}
                className="flex items-center gap-0.5 rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-300"
                aria-label="Show fewer badges"
              >
                <ChevronUp className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats hint */}
      <div className="hidden sm:block text-right">
        <div className="text-xs text-gray-400">
          {member.voiceBalance > 0 && (
            <span className="block" title="VOICE token balance">
              {member.voiceBalance.toLocaleString()} VOICE
            </span>
          )}
          {member.currentStreak > 0 && (
            <span className="block text-orange-400" title="Current streak">
              🔥 {member.currentStreak}d
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommunityMemberList({
  communityId,
  memberships,
  posts,
  getVoiceBalance,
  getStreakData,
  currentUserId,
  approximateWeeklyActive,
}: CommunityMemberListProps) {
  const [showAll, setShowAll] = useState(false);

  const memberBadges = useMemo(() => {
    return memberships
      .map((membership, index) => {
        const voiceBalance = getVoiceBalance(membership.studentId);
        const streakData = getStreakData(membership.studentId);
        
        return {
          ...calculateMemberBadges(
            membership.studentId,
            voiceBalance,
            streakData,
            membership,
            posts,
            communityId
          ),
          index,
          membership,
          // Simulate online status (in a real app, this would come from a presence system)
          isOnline: index < 3 || Math.random() > 0.7,
        };
      })
      .sort((a, b) => {
        // Sort: moderators first, then by voice balance, then by streak
        if (a.membership.isModerator !== b.membership.isModerator) {
          return a.membership.isModerator ? -1 : 1;
        }
        if (b.voiceBalance !== a.voiceBalance) {
          return b.voiceBalance - a.voiceBalance;
        }
        return b.currentStreak - a.currentStreak;
      });
  }, [memberships, posts, getVoiceBalance, getStreakData, communityId]);

  const displayedMembers = showAll ? memberBadges : memberBadges.slice(0, 8);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-white">Active Members</h2>
        </div>
        <span className="text-xs text-gray-400" aria-label="Active members count">
          ~{approximateWeeklyActive.toLocaleString()} active this week
        </span>
      </div>

      {/* Member list */}
      <div className="space-y-1">
        {displayedMembers.map((member) => (
          <MemberRow
            key={member.studentId}
            member={member}
            index={member.index}
            isCurrentUser={member.studentId === currentUserId}
            isOnline={member.isOnline}
            role={member.membership.role}
          />
        ))}
      </div>

      {/* Show more/less button */}
      {memberBadges.length > 8 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
          aria-expanded={showAll}
        >
          {showAll ? (
            <>
              <ChevronUp className="inline-block h-4 w-4 mr-1" aria-hidden />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="inline-block h-4 w-4 mr-1" aria-hidden />
              View all {memberBadges.length} members
            </>
          )}
        </button>
      )}

      {/* Empty state */}
      {memberBadges.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" aria-hidden />
          <p>No active members yet</p>
        </div>
      )}
    </div>
  );
}
