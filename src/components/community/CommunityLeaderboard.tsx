import { useState, useMemo } from 'react';
import { Trophy, TrendingUp, ThumbsUp, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { Post } from '../../lib/store';
import type { StreakData } from '../../lib/tokens/RewardEngine';
import {
  calculateMemberBadges,
  getAnonymousAvatarColor,
  getAnonymousDisplayName,
  type MemberBadges,
} from '../../lib/communities/badges';
import type { CommunityMembership } from '../../lib/communities/types';

interface CommunityLeaderboardProps {
  communityId: string;
  memberships: CommunityMembership[];
  posts: Post[];
  getVoiceBalance: (studentId: string) => number;
  getStreakData: (studentId: string) => StreakData;
  currentUserId: string;
}

type LeaderboardTab = 'weekly' | 'monthly' | 'helpful';

interface LeaderEntry {
  studentId: string;
  rank: number;
  score: number;
  badges: MemberBadges;
  index: number;
}

function RankBadge({ rank }: { rank: number }) {
  const getBadgeColor = () => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 2:
        return 'bg-gray-400/20 text-gray-300 border-gray-400/40';
      case 3:
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      default:
        return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  const getIcon = () => {
    switch (rank) {
      case 1:
        return '👑';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <div
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 font-bold ${getBadgeColor()}`}
      aria-label={`Rank ${rank}`}
    >
      <span className={rank <= 3 ? 'text-base' : 'text-xs'}>{getIcon()}</span>
    </div>
  );
}

function LeaderboardEntry({ entry, isCurrentUser }: { entry: LeaderEntry; isCurrentUser: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`group rounded-lg border transition-all ${
        isCurrentUser
          ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
          : 'border-white/5 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <RankBadge rank={entry.rank} />
        
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform group-hover:scale-105 ${getAnonymousAvatarColor(entry.index)}`}
          role="img"
          aria-label="Anonymous avatar"
        >
          {getAnonymousDisplayName(entry.index).charAt(0)}
          {entry.index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">
              {getAnonymousDisplayName(entry.index)}
              {isCurrentUser && <span className="ml-1 text-xs text-primary">(You)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{entry.score.toLocaleString()} points</span>
            {entry.badges.badges.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary hover:underline"
                aria-expanded={expanded}
              >
                {entry.badges.badges.length} {entry.badges.badges.length === 1 ? 'badge' : 'badges'}
                {expanded ? <ChevronUp className="inline h-3 w-3 ml-0.5" aria-hidden /> : <ChevronDown className="inline h-3 w-3 ml-0.5" aria-hidden />}
              </button>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold text-white">{entry.badges.voiceBalance.toLocaleString()}</div>
          <div className="text-xs text-gray-400">VOICE</div>
        </div>
      </div>

      {expanded && entry.badges.badges.length > 0 && (
        <div className="border-t border-white/5 p-3">
          <div className="flex flex-wrap gap-1">
            {entry.badges.badges.map((badge) => (
              <span
                key={badge.type}
                className={`inline-flex items-center gap-1 rounded-full ${badge.color} px-2 py-1 text-xs font-medium`}
                title={badge.description}
              >
                <span role="img" aria-hidden="true">{badge.icon}</span>
                <span>{badge.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityLeaderboard({
  communityId,
  memberships,
  posts,
  getVoiceBalance,
  getStreakData,
  currentUserId,
}: CommunityLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('weekly');
  const [showAll, setShowAll] = useState(false);

  const leaderboard = useMemo(() => {
    const communityPosts = posts.filter(p => p.communityId === communityId);
    
    const memberBadges = memberships.map((membership, index) => {
      const voiceBalance = getVoiceBalance(membership.studentId);
      const streakData = getStreakData(membership.studentId);
      
      return {
        badges: calculateMemberBadges(
          membership.studentId,
          voiceBalance,
          streakData,
          membership,
          communityPosts,
          communityId
        ),
        index,
      };
    });

    // Calculate scores based on active tab
    const entries: LeaderEntry[] = memberBadges
      .map(({ badges, index }) => {
        let score = 0;
        switch (activeTab) {
          case 'weekly':
            score = badges.weeklyScore;
            break;
          case 'monthly':
            score = badges.monthlyScore;
            break;
          case 'helpful':
            score = badges.helpfulVotes;
            break;
        }
        
        return {
          studentId: badges.studentId,
          rank: 0, // Will be set after sorting
          score,
          badges,
          index,
        };
      })
      .filter(entry => entry.score > 0) // Only show members with activity
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Tie-breaker: higher voice balance
        return b.badges.voiceBalance - a.badges.voiceBalance;
      });

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }, [memberships, posts, communityId, getVoiceBalance, getStreakData, activeTab]);

  const displayedEntries = showAll ? leaderboard : leaderboard.slice(0, 10);

  const tabs: Array<{ id: LeaderboardTab; label: string; icon: typeof Trophy }> = [
    { id: 'weekly', label: 'Top Weekly', icon: TrendingUp },
    { id: 'monthly', label: 'Top Monthly', icon: Trophy },
    { id: 'helpful', label: 'Most Helpful', icon: ThumbsUp },
  ];

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-white">Community Leaderboard</h2>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveTab(id);
              setShowAll(false);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'bg-primary text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
            }`}
            aria-pressed={activeTab === id}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {displayedEntries.map((entry) => (
          <LeaderboardEntry
            key={entry.studentId}
            entry={entry}
            isCurrentUser={entry.studentId === currentUserId}
          />
        ))}
      </div>

      {/* Show more/less button */}
      {leaderboard.length > 10 && (
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
              View all {leaderboard.length} members
            </>
          )}
        </button>
      )}

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" aria-hidden />
          <p>No active contributors yet</p>
          <p className="text-sm mt-1">Be the first to contribute and earn badges!</p>
        </div>
      )}

      {/* Info footer */}
      <div className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-gray-400">
        <p>
          <strong className="text-gray-300">How scoring works:</strong>
        </p>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>Posts: 10 points each</li>
          <li>Reactions received: 1 point each</li>
          <li>Helpful votes: 5 points each</li>
        </ul>
      </div>
    </div>
  );
}
