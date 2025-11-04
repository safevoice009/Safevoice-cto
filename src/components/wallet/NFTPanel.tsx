import { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Sparkles, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import type { NFTAchievement } from '../../lib/wallet/types';

interface NFTPanelProps {
  achievements?: NFTAchievement[];
  onMintNFT?: (tokenId: number) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const RARITY_COLORS = {
  common: 'from-gray-600 to-gray-500',
  rare: 'from-blue-600 to-blue-500',
  epic: 'from-purple-600 to-purple-500',
  legendary: 'from-yellow-600 to-yellow-500',
};

const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export default function NFTPanel({ achievements = [], onMintNFT, isLoading = false, className = '' }: NFTPanelProps) {
  const [mintingTokenId, setMintingTokenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'owned' | 'claimable'>('all');

  const handleMint = async (tokenId: number) => {
    setMintingTokenId(tokenId);
    try {
      await onMintNFT?.(tokenId);
      toast.success('Achievement NFT minted successfully! 🎉');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mint NFT');
    } finally {
      setMintingTokenId(null);
    }
  };

  const filteredAchievements = achievements.filter((achievement) => {
    if (filter === 'owned') return achievement.owned;
    if (filter === 'claimable') return achievement.claimable && !achievement.owned;
    return true;
  });

  const ownedCount = achievements.filter((a) => a.owned).length;
  const claimableCount = achievements.filter((a) => a.claimable && !a.owned).length;

  return (
    <div className={`glass p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Award className="w-5 h-5 text-primary" />
          <span>Achievement NFTs</span>
        </h2>
        <div className="text-xs text-gray-400">
          {ownedCount}/{achievements.length} Collected
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        {[
          { key: 'all', label: 'All', count: achievements.length },
          { key: 'owned', label: 'Owned', count: ownedCount },
          { key: 'claimable', label: 'Claimable', count: claimableCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.key
                ? 'bg-primary text-white'
                : 'bg-surface/30 text-gray-400 hover:bg-surface/50'
            }`}
          >
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* NFT Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No achievements to display</p>
          <p className="text-xs mt-1">
            {filter === 'owned' && 'You haven\'t minted any achievement NFTs yet'}
            {filter === 'claimable' && 'No new achievements ready to mint'}
            {filter === 'all' && 'Complete challenges to unlock achievement NFTs'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievement) => {
            const isMinting = mintingTokenId === achievement.tokenId;
            return (
              <motion.div
                key={achievement.tokenId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative p-4 rounded-lg border transition-all ${
                  achievement.owned
                    ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10'
                    : achievement.claimable
                    ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-blue-500/10'
                    : 'border-white/10 bg-surface/30 opacity-60'
                }`}
              >
                {achievement.owned && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {achievement.claimable && !achievement.owned && (
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                  </div>
                )}

                <div className="text-center space-y-3">
                  <div
                    className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${
                      RARITY_COLORS[achievement.rarity]
                    } flex items-center justify-center text-3xl`}
                  >
                    {achievement.icon}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">{achievement.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{achievement.description}</p>
                  </div>

                  <div className="flex items-center justify-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold bg-gradient-to-r ${
                        RARITY_COLORS[achievement.rarity]
                      } text-white`}
                    >
                      {RARITY_LABELS[achievement.rarity]}
                    </span>
                    {achievement.amount > 1 && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-primary/20 text-primary">
                        x{achievement.amount}
                      </span>
                    )}
                  </div>

                  {achievement.claimable && !achievement.owned && (
                    <button
                      onClick={() => handleMint(achievement.tokenId)}
                      disabled={isMinting}
                      className="w-full py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/80 hover:to-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isMinting ? (
                        <span className="flex items-center justify-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Minting...</span>
                        </span>
                      ) : (
                        'Mint NFT'
                      )}
                    </button>
                  )}

                  {achievement.owned && (
                    <div className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-semibold">
                      Collected
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
