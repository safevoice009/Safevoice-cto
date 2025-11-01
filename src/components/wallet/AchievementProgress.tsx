import { motion } from 'framer-motion';
import { TrendingUp, Award, Trophy } from 'lucide-react';
import { AchievementService, RANK_DEFINITIONS } from '../../lib/tokens/AchievementService';
import RankChip from './RankChip';

interface AchievementProgressProps {
  totalVoice: number;
  achievementsUnlocked: number;
  totalAchievements: number;
}

export default function AchievementProgress({
  totalVoice,
  achievementsUnlocked,
  totalAchievements,
}: AchievementProgressProps) {
  const currentRank = AchievementService.getRank(totalVoice);
  const { nextRank, currentProgress, voiceNeeded } = AchievementService.getNextRank(totalVoice);

  const achievementPercentage = (achievementsUnlocked / totalAchievements) * 100;

  return (
    <div className="glass p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-white">Your Rank & Progress</h2>
      </div>

      {/* Current Rank */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Current Rank</span>
          <RankChip rank={currentRank} size="md" />
        </div>

        {/* Next Rank Progress */}
        {nextRank ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Next: {nextRank.name}</span>
              <span className="text-gray-400">{voiceNeeded} VOICE needed</span>
            </div>
            <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${currentProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${nextRank.gradientFrom} ${nextRank.gradientTo} rounded-full`}
              />
            </div>
            <div className="text-xs text-gray-500 text-right">{currentProgress.toFixed(1)}% complete</div>
          </div>
        ) : (
          <div className="glass p-3 rounded-lg border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
            <p className="text-sm text-yellow-400 text-center">
              🎉 You've reached the maximum rank! You're a Legend!
            </p>
          </div>
        )}
      </div>

      {/* Achievement Progress */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-400">Achievements</span>
          </div>
          <span className="text-sm font-semibold text-white">
            {achievementsUnlocked} / {totalAchievements}
          </span>
        </div>
        <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${achievementPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
          />
        </div>
        <div className="text-xs text-gray-500 text-right">{achievementPercentage.toFixed(0)}% complete</div>
      </div>

      {/* All Ranks Preview */}
      <div className="space-y-2 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <TrendingUp className="w-4 h-4" />
          <span>Rank Tiers</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {RANK_DEFINITIONS.map((rank) => {
            const isCurrentRank = rank.id === currentRank.id;
            const isAchieved = totalVoice >= rank.minVoice;
            
            return (
              <div
                key={rank.id}
                className={`glass p-3 rounded-lg transition-all ${
                  isCurrentRank
                    ? 'border border-primary/50 bg-primary/10'
                    : isAchieved
                    ? 'border border-green-500/30'
                    : 'opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{rank.icon}</span>
                  <span className="text-sm font-semibold text-white">{rank.name}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {rank.minVoice}+ VOICE
                </div>
                {isCurrentRank && (
                  <div className="text-xs text-primary mt-1 font-medium">Current</div>
                )}
                {isAchieved && !isCurrentRank && (
                  <div className="text-xs text-green-400 mt-1">✓ Achieved</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
