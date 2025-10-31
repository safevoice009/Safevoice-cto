import { motion } from 'framer-motion';
import { Award, Check, Lock } from 'lucide-react';
import { useStore, NFT_BADGE_DEFINITIONS, NFT_BADGE_TIERS, type NFTBadgeTier } from '../../lib/store';
import { formatVoiceBalance } from '../../lib/tokenEconomics';

export default function NFTBadgeStore() {
  const { nftBadges, voiceBalance, purchaseNFTBadge, hasNFTBadge } = useStore();
  const ownedBadgeTiers = NFT_BADGE_TIERS.filter((tier) =>
    nftBadges.some((badge) => badge.tier === tier)
  );

  const handlePurchase = (tier: NFTBadgeTier) => {
    const definition = NFT_BADGE_DEFINITIONS[tier];
    if (definition) {
      purchaseNFTBadge(tier, definition.cost);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass p-6 space-y-4"
    >
      <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
        <Award className="w-6 h-6 text-primary" />
        <span>🏆 NFT Badge Store</span>
      </h2>

      <p className="text-sm text-gray-400">
        Show your support by purchasing exclusive NFT badges. Each badge is a one-time purchase that displays on your
        profile forever.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {NFT_BADGE_TIERS.map((tier) => {
          const definition = NFT_BADGE_DEFINITIONS[tier];
          const owned = hasNFTBadge(tier);
          const canAfford = voiceBalance >= definition.cost;

          return (
            <motion.div
              key={tier}
              whileHover={!owned ? { scale: 1.02 } : undefined}
              className={`relative p-4 rounded-lg border ${
                owned
                  ? 'border-green-500/50 bg-green-500/10'
                  : canAfford
                  ? 'border-white/20 bg-surface/50 hover:border-white/40'
                  : 'border-white/10 bg-surface/30 opacity-60'
              } transition-all`}
            >
              {owned && (
                <div className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                  <Check className="w-3 h-3" />
                  <span>Owned</span>
                </div>
              )}

              <div className="flex items-start space-x-3">
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${definition.gradientFrom} ${definition.gradientTo} flex items-center justify-center text-2xl flex-shrink-0 shadow-inner`}
                  style={{ boxShadow: `0 0 15px ${definition.accent}44` }}
                >
                  {definition.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>{definition.label}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">{definition.description}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{formatVoiceBalance(definition.cost)} VOICE</span>
                    {owned ? (
                      <span className="text-xs text-green-400 font-medium">Unlocked</span>
                    ) : (
                      <button
                        onClick={() => handlePurchase(tier)}
                        disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          canAfford
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                            : 'bg-surface/50 text-gray-500 cursor-not-allowed'
                        }`}
                        type="button"
                      >
                        {canAfford ? 'Purchase' : (
                          <span className="flex items-center space-x-1">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {ownedBadgeTiers.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <p className="text-sm text-gray-400 mb-2">
            You own <span className="text-primary font-semibold">{ownedBadgeTiers.length}</span> badge
            {ownedBadgeTiers.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-2">
            {ownedBadgeTiers.map((tier) => {
              const definition = NFT_BADGE_DEFINITIONS[tier];
              return (
                <div
                  key={tier}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${definition.gradientFrom} ${definition.gradientTo} border border-white/20 shadow-lg`}
                  style={{ boxShadow: `0 0 12px ${definition.accent}33` }}
                >
                  <span className="text-lg">{definition.icon}</span>
                  <span className="text-xs font-bold text-white">{definition.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
