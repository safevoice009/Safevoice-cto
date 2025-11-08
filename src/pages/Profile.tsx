import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useStore, NFT_BADGE_DEFINITIONS, NFT_BADGE_TIERS } from '../lib/store';
import { User, Bookmark, MessageSquare, FileText, CheckCircle } from 'lucide-react';
import PostCard from '../components/feed/PostCard';
import WalletSection from '../components/wallet/WalletSection';
import RankChip from '../components/wallet/RankChip';
import AchievementGrid from '../components/wallet/AchievementGrid';
import AchievementProgress from '../components/wallet/AchievementProgress';
import LanguageSettings from '../components/settings/LanguageSettings';
import PrivacySettings from '../components/settings/PrivacySettings';
import { ACHIEVEMENT_DEFINITIONS } from '../lib/tokens/AchievementService';
import ZKProofSettings from '../components/profile/ZKProofSettings';

type ProfileTab = 'overview' | 'wallet' | 'achievements' | 'settings' | 'verification';

export default function Profile() {
  const {
    studentId,
    posts,
    bookmarkedPosts,
    initializeStore,
    isPremiumActive,
    nftBadges,
    achievements,
    achievementProgress,
    currentRank,
    nextRank,
    rankProgressPercentage,
    voiceToNextRank,
    checkAchievements,
    totalRewardsEarned,
    zkProofVerificationBadge,
  } = useStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const hasVerifiedBadge = isPremiumActive('verified_badge') || zkProofVerificationBadge;
  const { t } = useTranslation();

  useEffect(() => {
    initializeStore();
    void checkAchievements();
  }, [initializeStore, checkAchievements]);

  const myPosts = posts.filter((post) => post.studentId === studentId);
  const savedPosts = posts.filter((post) => bookmarkedPosts.includes(post.id));
  const totalComments = posts.reduce((sum, post) => sum + post.commentCount, 0);
  const ownedBadgeTiers = NFT_BADGE_TIERS.filter((tier) =>
    nftBadges.some((badge) => badge.tier === tier)
  );

  const progressMap = useMemo(() => {
    const map = new Map<string, { progress: number; total: number; percentage: number }>();
    ACHIEVEMENT_DEFINITIONS.forEach((def) => {
      const progress = achievementProgress[def.id];
      if (progress) {
        map.set(def.id, progress);
      }
    });
    return map;
  }, [achievementProgress]);

  return (
    <motion.section
      className="min-h-screen px-4 py-8 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-6">
        <div className="glass p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          <div>
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-white">{studentId}</h1>
                {hasVerifiedBadge && (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Verified</span>
                  </span>
                )}
                <RankChip rank={currentRank} size="sm" />
              </div>
              <p className="text-gray-400">Your anonymous identity</p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
                {nextRank ? (
                  <>
                    <span>{voiceToNextRank} VOICE until {nextRank.name}</span>
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        style={{ width: `${rankProgressPercentage}%` }}
                      />
                    </div>
                    <span>{rankProgressPercentage.toFixed(0)}%</span>
                  </>
                ) : (
                  <span>You&apos;re a Legend! 🌟</span>
                )}
              </div>
            </div>

            {ownedBadgeTiers.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {ownedBadgeTiers.map((tier) => {
                  const definition = NFT_BADGE_DEFINITIONS[tier];
                  return (
                    <div
                      key={tier}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${definition.gradientFrom} ${definition.gradientTo} border border-white/20 shadow-lg`}
                      style={{ boxShadow: `0 0 12px ${definition.accent}33` }}
                    >
                      <span className="text-base">{definition.icon}</span>
                      <span className="text-xs font-bold text-white">{definition.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-white">{myPosts.length}</p>
              </div>
              <p className="text-sm text-gray-400">{t('profile.posts', 'Posts')}</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-white">{totalComments}</p>
              </div>
              <p className="text-sm text-gray-400">{t('profile.comments', 'Comments')}</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Bookmark className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-white">{savedPosts.length}</p>
              </div>
              <p className="text-sm text-gray-400">{t('profile.saved', 'Saved')}</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-surface/50 text-gray-300 hover:text-white'
            }`}
            type="button"
          >
            {t('profile.profileOverview', 'Profile Overview')}
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'achievements'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                : 'bg-surface/50 text-gray-300 hover:text-white'
            }`}
            type="button"
          >
            🏆 {t('profile.achievements', 'Achievements')}
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'wallet'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'bg-surface/50 text-gray-300 hover:text-white'
            }`}
            type="button"
          >
            💰 {t('profile.wallet', 'Wallet')}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                : 'bg-surface/50 text-gray-300 hover:text-white'
            }`}
            type="button"
          >
            ⚙️ {t('settings.title', 'Settings')}
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'verification'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-surface/50 text-gray-300 hover:text-white'
            }`}
            type="button"
          >
            🛡️ {t('profile.verification', 'Verification')}
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="glass p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Bookmarked Posts</h2>
            {savedPosts.length === 0 ? (
              <div className="text-center py-10 text-gray-400 space-y-2">
                <Bookmark className="w-8 h-8 mx-auto" />
                <p className="text-sm">No bookmarked posts yet</p>
                <p className="text-xs">Save posts you find helpful or inspiring</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {savedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {activeTab === 'wallet' && <WalletSection />}

          {activeTab === 'verification' && <ZKProofSettings />}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <LanguageSettings />
              <PrivacySettings />
            </div>
          )}

          {activeTab === 'achievements' && (
           <div className="space-y-6">
             <AchievementProgress
               totalVoice={totalRewardsEarned}
               achievementsUnlocked={achievements.length}
               totalAchievements={ACHIEVEMENT_DEFINITIONS.length}
             />
             <div className="glass p-6">
               <AchievementGrid
                 achievements={achievements}
                 showProgress
                 progressData={progressMap}
               />
             </div>
           </div>
          )}

          {activeTab === 'wallet' && <WalletSection />}

          {activeTab === 'verification' && <ZKProofSettings />}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <LanguageSettings />
              <PrivacySettings />
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
