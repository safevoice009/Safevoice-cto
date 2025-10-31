import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import {
  type TimeWindow,
  type LeaderboardCategory,
  getTopUsers,
  getUserRank,
  getCategoryIcon,
  getCategoryName,
} from '../lib/leaderboard';
import { formatVoiceBalance } from '../lib/tokenEconomics';

const timeframes: TimeWindow[] = ['weekly', 'monthly', 'all-time'];
const categories: LeaderboardCategory[] = ['posts', 'helpful', 'engaged', 'supportive'];

const timeframeLabels: Record<TimeWindow, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  'all-time': 'All-Time',
};

const getTimeframeDescription = (timeframe: TimeWindow): string => {
  switch (timeframe) {
    case 'weekly':
      return 'Activity over the past 7 days';
    case 'monthly':
      return 'Activity over the past 30 days';
    case 'all-time':
      return 'All-time contributions';
    default:
      return '';
  }
};

const formatScore = (score: number) => {
  return score.toLocaleString();
};

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-lg bg-white/5 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-white/10" />
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
          <div className="h-4 w-16 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

interface LeaderboardRowProps {
  rank: number;
  studentId: string;
  score: number;
  rankTitle: string;
  badges: string[];
  totalVoice: number;
}

function LeaderboardRow({ rank, studentId, score, rankTitle, badges, totalVoice }: LeaderboardRowProps) {
  const isTopThree = rank <= 3;
  const rankColors: Record<number, string> = {
    1: 'from-yellow-400 to-orange-500',
    2: 'from-slate-300 to-slate-500',
    3: 'from-amber-600 to-amber-800',
  };

  return (
    <motion.div
      layout
      className="flex items-center justify-between p-5 rounded-xl bg-white/5 border border-white/5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold text-lg ${
            isTopThree ? `bg-gradient-to-br ${rankColors[rank]}` : 'bg-white/10'
          }`}
        >
          {rank}
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold text-white">{studentId}</p>
          <p className="text-sm text-primary">{rankTitle}</p>
          {badges.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {badges.slice(0, 2).map((badge) => (
                <span key={badge} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-white">{formatScore(score)}</p>
        <p className="text-xs text-gray-400">Points</p>
        <p className="text-xs text-green-400 mt-1">{formatVoiceBalance(totalVoice)}</p>
      </div>
    </motion.div>
  );
}

interface YourRankCardProps {
  studentId: string;
  score: number;
  rank: number;
  rankTitle: string;
  category: LeaderboardCategory;
  timeframe: TimeWindow;
  totalVoice: number;
}

function YourRankCard({ studentId, score, rank, rankTitle, category, timeframe, totalVoice }: YourRankCardProps) {
  const isTopTen = rank <= 10;
  const isTopThree = rank <= 3;
  
  return (
    <div className={`p-6 rounded-xl glass border ${isTopThree ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/20' : isTopTen ? 'border-primary/50' : 'border-primary/30'}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-primary uppercase">Your Rank</p>
          <h3 className="text-2xl font-bold text-white">{studentId}</h3>
          {isTopTen && (
            <p className="text-sm text-green-400 mt-1">✨ You're in the top 10!</p>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-4xl font-bold ${isTopThree ? 'text-yellow-400' : 'text-white'}`}>#{rank}</span>
          <span className="text-sm text-primary">{rankTitle}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-400">Category</p>
          <p className="text-lg font-semibold text-white">{getCategoryName(category)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Timeframe</p>
          <p className="text-lg font-semibold text-white">{timeframeLabels[timeframe]}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-400">Your score</p>
          <p className="text-2xl font-bold text-white">{formatScore(score)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Total VOICE</p>
          <p className="text-lg font-semibold text-green-400">{formatVoiceBalance(totalVoice)}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ category }: { category: LeaderboardCategory }) {
  return (
    <div className="text-center py-10 bg-white/5 rounded-lg border border-dashed border-white/10">
      <p className="text-3xl mb-4">{getCategoryIcon(category)}</p>
      <p className="text-lg text-white font-semibold">Not enough activity yet</p>
      <p className="text-sm text-gray-400 mt-2">
        Encourage the community to participate to see this leaderboard come alive.
      </p>
    </div>
  );
}

function NoActivityCard({ category, timeframe }: { category: LeaderboardCategory; timeframe: TimeWindow }) {
  return (
    <div className="p-6 rounded-xl glass border border-primary/30">
      <div className="text-center">
        <p className="text-3xl mb-4">{getCategoryIcon(category)}</p>
        <p className="text-lg text-white font-semibold mb-2">You haven't started yet</p>
        <p className="text-sm text-gray-400">
          {category === 'posts' && 'Create posts to climb the leaderboard'}
          {category === 'helpful' && 'Help others by commenting to earn helpful votes'}
          {category === 'engaged' && 'Engage with the community through reactions and comments'}
          {category === 'supportive' && 'Support those in crisis to make a difference'}
        </p>
        <p className="text-sm text-gray-500 mt-3">
          Your {timeframeLabels[timeframe]} progress will appear here once you join in.
        </p>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { posts, studentId } = useStore();
  const [activeTimeframe, setActiveTimeframe] = useState<TimeWindow>('weekly');
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('posts');

  const leaderboardEntries = useMemo(
    () => getTopUsers(posts, activeTimeframe, activeCategory),
    [posts, activeTimeframe, activeCategory, studentId]
  );

  const userRank = useMemo(
    () => getUserRank(posts, activeTimeframe, activeCategory, studentId),
    [posts, activeTimeframe, activeCategory, studentId]
  );

  const isLoading = false; // Could integrate with actual loading state if needed

  return (
    <motion.section
      className="min-h-screen px-4 py-12 max-w-5xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-10">
        <div className="glass p-6 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Community Leaderboards</h1>
              <p className="text-sm text-gray-400 max-w-xl">
                Track the most active community members across posts, helpful responses, engagement, and crisis support.
                Celebrate the voices making SafeVoice thrive.
              </p>
            </div>
            <div className="flex gap-2 bg-white/5 p-1 rounded-full">
              {timeframes.map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setActiveTimeframe(timeframe)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTimeframe === timeframe
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  type="button"
                >
                  {timeframeLabels[timeframe]}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">{getTimeframeDescription(activeTimeframe)}</p>
        </div>

        <div className="glass p-4 rounded-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {categories.map((category) => {
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white/5 text-gray-300 hover:text-white'
                  }`}
                  type="button"
                >
                  <span>{getCategoryIcon(category)}</span>
                  <span>{getCategoryName(category)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <section className="space-y-6">
          <div className="glass p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">{getCategoryIcon(activeCategory)}</span>
                <span>{getCategoryName(activeCategory)}</span>
              </h2>
              <p className="text-sm text-gray-400">Top 10 community members</p>
            </div>

            {isLoading ? (
              <LeaderboardSkeleton />
            ) : leaderboardEntries.length === 0 ? (
              <EmptyState category={activeCategory} />
            ) : (
              <AnimatePresence mode="sync">
                <div className="space-y-4">
                  {leaderboardEntries.map((entry) => (
                    <LeaderboardRow
                      key={entry.studentId}
                      rank={entry.rank}
                      studentId={entry.studentId}
                      score={entry.score}
                      rankTitle={entry.rankTitle}
                      badges={entry.badges}
                      totalVoice={entry.totalVoice}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>

          {userRank ? (
            <YourRankCard
              studentId={studentId}
              score={userRank.score}
              rank={userRank.rank}
              rankTitle={userRank.rankTitle}
              category={activeCategory}
              timeframe={activeTimeframe}
              totalVoice={userRank.totalVoice}
            />
          ) : (
            <NoActivityCard category={activeCategory} timeframe={activeTimeframe} />
          )}
        </section>
      </div>
    </motion.section>
  );
}
