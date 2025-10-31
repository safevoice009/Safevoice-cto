import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Sparkles, BarChart3, EyeOff, Headphones } from 'lucide-react';
import { useStore, type PremiumFeatureType } from '../../lib/store';
import { formatVoiceBalance } from '../../lib/tokenEconomics';
import toast from 'react-hot-toast';

const FEATURE_ICONS: Record<PremiumFeatureType, ReactNode> = {
  verified_badge: <Check className="w-5 h-5" />,
  analytics: <BarChart3 className="w-5 h-5" />,
  ad_free: <EyeOff className="w-5 h-5" />,
  priority_support: <Headphones className="w-5 h-5" />,
};

export default function PremiumSettings() {
  const { premiumSubscriptions, voiceBalance, activatePremium, deactivatePremium } = useStore();
  const [loading, setLoading] = useState<PremiumFeatureType | null>(null);

  const formatNextRenewal = (timestamp: number | null): string => {
    if (!timestamp) return '';
    const now = new Date();
    const diff = timestamp - now.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return 'Expired';
    if (daysLeft === 0) return 'Today';
    if (daysLeft === 1) return 'Tomorrow';
    return `${daysLeft} days`;
  };

  const handleToggle = async (feature: PremiumFeatureType) => {
    const sub = premiumSubscriptions[feature];
    
    if (loading) {
      toast.error('Please wait...');
      return;
    }

    setLoading(feature);

    try {
      if (sub.enabled) {
        await deactivatePremium(feature);
      } else {
        if (voiceBalance < sub.monthlyCost) {
          toast.error(`Insufficient balance. Need ${formatVoiceBalance(sub.monthlyCost)} VOICE`);
          return;
        }
        await activatePremium(feature);
      }
    } catch (error) {
      console.error('Failed to toggle premium feature:', error);
    } finally {
      setLoading(null);
    }
  };

  const features = Object.keys(premiumSubscriptions) as PremiumFeatureType[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-4"
    >
      <div className="flex items-center space-x-2 mb-2">
        <Crown className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold text-white">Premium Features</h2>
      </div>
      <p className="text-gray-400 text-sm">
        Unlock premium features with $VOICE tokens. Monthly subscriptions auto-renew every 30 days.
      </p>

      <div className="space-y-3 mt-6">
        {features.map((feature) => {
          const sub = premiumSubscriptions[feature];
          const isLoading = loading === feature;

          return (
            <div
              key={feature}
              className={`p-4 rounded-lg border transition-all ${
                sub.enabled
                  ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/50'
                  : 'bg-surface/50 border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div
                      className={`${
                        sub.enabled ? 'text-purple-400' : 'text-gray-400'
                      }`}
                    >
                      {FEATURE_ICONS[feature]}
                    </div>
                    <h3 className="font-semibold text-white">{sub.name}</h3>
                    {sub.enabled && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{sub.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{formatVoiceBalance(sub.monthlyCost)} / month</span>
                    </span>
                    {sub.enabled && sub.nextRenewal && (
                      <span className="text-primary">
                        Renews in {formatNextRenewal(sub.nextRenewal)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(feature)}
                  disabled={isLoading}
                  className={`ml-4 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    sub.enabled
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>...</span>
                    </div>
                  ) : sub.enabled ? (
                    'Deactivate'
                  ) : (
                    'Activate'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-300 mb-1">How Premium Works</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Features activate instantly upon payment</li>
              <li>• Auto-renews monthly (every 30 days)</li>
              <li>• Requires sufficient $VOICE balance</li>
              <li>• Cancels automatically if balance is low</li>
              <li>• Can be deactivated anytime without refund</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center space-x-2 text-sm">
          <Crown className="w-4 h-4 text-yellow-500" />
          <span className="text-white font-medium">Current Balance:</span>
          <span className="text-primary font-bold">{formatVoiceBalance(voiceBalance)}</span>
        </div>
      </div>
    </motion.div>
  );
}
