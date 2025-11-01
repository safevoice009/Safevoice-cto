import { motion } from 'framer-motion';
import { Lock, Award } from 'lucide-react';
import type { Achievement } from '../../lib/tokens/RewardEngine';
import { ACHIEVEMENT_DEFINITIONS } from '../../lib/tokens/AchievementService';
import { formatTimeAgo } from '../../lib/utils';

interface AchievementGridProps {
  achievements: Achievement[];
  showProgress?: boolean;
  progressData?: Map<
    string,
    {
      progress: number;
      total: number;
      percentage: number;
    }
  >;
}

export default function AchievementGrid({
  achievements,
  showProgress = false,
  progressData,
}: AchievementGridProps) {
  const unlockedIds = new Set(achievements.map((a) => a.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-white">Achievements</h2>
        </div>
        <div className="text-sm text-gray-400">
          {achievements.length} / {ACHIEVEMENT_DEFINITIONS.length} unlocked
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENT_DEFINITIONS.map((def) => {
          const isUnlocked = unlockedIds.has(def.id);
          const achievement = achievements.find((a) => a.id === def.id);
          const progress = progressData?.get(def.id);

          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`glass p-4 rounded-lg transition-all ${
                isUnlocked
                  ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30'
                  : 'opacity-60 grayscale'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                      : 'bg-gray-700'
                  }`}
                >
                  {isUnlocked ? (
                    <span className="text-2xl">{def.icon}</span>
                  ) : (
                    <Lock className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm mb-1">{def.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{def.description}</p>

                  {isUnlocked && achievement ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400">Unlocked</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-500">{formatTimeAgo(achievement.unlockedAt)}</span>
                    </div>
                  ) : showProgress && progress ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-gray-400">
                          {progress.progress}/{progress.total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">{def.unlockCriteria}</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No achievements unlocked yet</p>
          <p className="text-xs mt-1">Start engaging with the community to unlock achievements!</p>
        </div>
      )}
    </div>
  );
}
