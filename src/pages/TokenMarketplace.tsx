import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Store,
  Crown,
  TrendingUp,
  Heart,
  Award,
  Sparkles,
  Clock,
  Target,
  Globe,
  DollarSign,
  Gift,
  Zap,
  Shield,
  Palette,
  BarChart3,
  EyeOff,
  Headphones,
  Check,
  Key,
  Database,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { formatVoiceBalance } from '../lib/tokenEconomics';
import toast from 'react-hot-toast';
import { NFT_BADGE_DEFINITIONS, type NFTBadgeTier, type PremiumFeatureType } from '../lib/store';

const PREMIUM_FEATURE_IDS: readonly PremiumFeatureType[] = ['verified_badge', 'analytics', 'ad_free', 'priority_support'];
const isPremiumFeatureId = (id: string): id is PremiumFeatureType =>
  (PREMIUM_FEATURE_IDS as readonly string[]).includes(id);

interface SpendingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: ReactNode;
  action: () => void | boolean | Promise<void | boolean>;
  badge?: string;
  disabled?: boolean;
}

export default function TokenMarketplace() {
  const {
    voiceBalance,
    activatePremium,
    purchaseNFTBadge,
    isPremiumActive,
    hasNFTBadge,
    tipUser,
    sendAnonymousGift,
    sponsorHelpline,
    pinPost,
    highlightPost,
    boostToCampuses,
    extendPostLifetime,
    changeStudentId,
    downloadDataBackup,
    spendVoice,
    posts,
    studentId,
  } = useStore();

  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<string>('5');
  const [recipientId, setRecipientId] = useState<string>('');
  const [campusIds, setCampusIds] = useState<string>('');
  const [extendHours, setExtendHours] = useState<string>('24');
  const [newStudentId, setNewStudentId] = useState<string>('');

  const myPosts = posts.filter((p) => p.studentId === studentId);

  const handleAction = async (actionId: string, action: () => void | boolean | Promise<void | boolean>) => {
    if (loading) {
      toast.error('Please wait for the current action to complete');
      return;
    }

    setLoading(actionId);
    try {
      await action();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(null);
    }
  };

  // Premium Features Section
  const premiumFeatures: SpendingOption[] = [
    {
      id: 'verified_badge',
      name: 'Verified Badge',
      description: 'Display a verified checkmark on your profile',
      price: 50,
      icon: <Check className="w-6 h-6" />,
      action: () => handleAction('verified_badge', async () => {
        if (isPremiumActive('verified_badge')) {
          toast('Already active!', { icon: '✓' });
          return;
        }
        await activatePremium('verified_badge');
      }),
    },
    {
      id: 'custom_theme',
      name: 'Custom Theme Studio',
      description: 'Unlock premium profile themes and personalization tools',
      price: 50,
      icon: <Palette className="w-6 h-6" />,
      action: () => handleAction('custom_theme', () => {
        spendVoice(50, 'Unlocked Custom Theme Studio', { action: 'custom_theme_studio' });
        toast.success('Theme Studio unlocked! Visit your profile settings to apply new looks soon. 🎨');
      }),
      badge: 'New',
    },
    {
      id: 'analytics',
      name: 'Advanced Analytics',
      description: 'Track detailed stats about posts and engagement',
      price: 30,
      icon: <BarChart3 className="w-6 h-6" />,
      action: () => handleAction('analytics', async () => {
        if (isPremiumActive('analytics')) {
          toast('Already active!', { icon: '✓' });
          return;
        }
        await activatePremium('analytics');
      }),
    },
    {
      id: 'ad_free',
      name: 'Ad-Free Experience',
      description: 'Remove all ads from SafeVoice',
      price: 20,
      icon: <EyeOff className="w-6 h-6" />,
      action: () => handleAction('ad_free', async () => {
        if (isPremiumActive('ad_free')) {
          toast('Already active!', { icon: '✓' });
          return;
        }
        await activatePremium('ad_free');
      }),
    },
    {
      id: 'priority_support',
      name: 'Priority Support',
      description: 'Get faster responses from support team',
      price: 40,
      icon: <Headphones className="w-6 h-6" />,
      action: () => handleAction('priority_support', async () => {
        if (isPremiumActive('priority_support')) {
          toast('Already active!', { icon: '✓' });
          return;
        }
        await activatePremium('priority_support');
      }),
    },
  ];

  // Post Boosts Section
  const postBoosts: SpendingOption[] = [
    {
      id: 'pin_post',
      name: 'Pin Post',
      description: 'Pin a post to the top of your profile',
      price: 25,
      icon: <Target className="w-6 h-6" />,
      action: () => handleAction('pin_post', () => {
        if (!selectedPostId) {
          toast.error('Please select a post to pin');
          return;
        }
        pinPost(selectedPostId);
      }),
    },
    {
      id: 'highlight_post',
      name: 'Highlight Post',
      description: 'Highlight a post for 24 hours',
      price: 15,
      icon: <Sparkles className="w-6 h-6" />,
      action: () => handleAction('highlight_post', () => {
        if (!selectedPostId) {
          toast.error('Please select a post to highlight');
          return;
        }
        highlightPost(selectedPostId);
      }),
    },
    {
      id: 'extend_lifetime',
      name: 'Extend Lifetime',
      description: 'Extend post lifetime by custom hours',
      price: 10,
      icon: <Clock className="w-6 h-6" />,
      action: () => handleAction('extend_lifetime', () => {
        if (!selectedPostId) {
          toast.error('Please select a post to extend');
          return;
        }
        const hours = parseInt(extendHours);
        if (isNaN(hours) || hours <= 0) {
          toast.error('Please enter valid hours');
          return;
        }
        extendPostLifetime(selectedPostId, hours);
      }),
    },
    {
      id: 'cross_campus',
      name: 'Cross-Campus Boost',
      description: 'Boost post to other campuses',
      price: 50,
      icon: <Globe className="w-6 h-6" />,
      action: () => handleAction('cross_campus', () => {
        if (!selectedPostId) {
          toast.error('Please select a post to boost');
          return;
        }
        if (!campusIds.trim()) {
          toast.error('Please enter campus IDs (comma-separated)');
          return;
        }
        const ids = campusIds.split(',').map(id => id.trim()).filter(id => id);
        boostToCampuses(selectedPostId, ids);
      }),
    },
  ];

  // Social Section
  const socialOptions: SpendingOption[] = [
    {
      id: 'tip_user',
      name: 'Send Tip',
      description: 'Tip another user for their post',
      price: 1, // Min amount
      icon: <DollarSign className="w-6 h-6" />,
      action: () => handleAction('tip_user', () => {
        if (!recipientId.trim()) {
          toast.error('Please enter recipient user ID');
          return;
        }
        if (!selectedPostId) {
          toast.error('Please select a post to tip for');
          return;
        }
        const amount = parseInt(tipAmount);
        if (isNaN(amount) || amount < 1 || amount > 100) {
          toast.error('Tip amount must be between 1 and 100 VOICE');
          return;
        }
        tipUser(recipientId, selectedPostId, amount);
      }),
    },
    {
      id: 'anonymous_gift',
      name: 'Anonymous Gift',
      description: 'Send a secret 10 VOICE gift',
      price: 10,
      icon: <Gift className="w-6 h-6" />,
      action: () => handleAction('anonymous_gift', () => {
        if (!recipientId.trim()) {
          toast.error('Please enter recipient user ID');
          return;
        }
        sendAnonymousGift(recipientId, 10);
      }),
    },
    {
      id: 'sponsor_helpline',
      name: 'Sponsor Helpline',
      description: 'Support mental health resources',
      price: 100,
      icon: <Heart className="w-6 h-6" />,
      action: () => handleAction('sponsor_helpline', () => {
        sponsorHelpline(100);
      }),
    },
  ];

  // NFT Badges Section
  const nftBadges: SpendingOption[] = Object.entries(NFT_BADGE_DEFINITIONS).map(([tier, def]) => ({
    id: `nft_${tier}`,
    name: `${def.icon} ${def.label} Badge`,
    description: def.description,
    price: def.cost,
    icon: <Award className="w-6 h-6" />,
    action: () => handleAction(`nft_${tier}`, () => {
      if (hasNFTBadge(tier as NFTBadgeTier)) {
        toast('You already own this badge!', { icon: '✨' });
        return;
      }
      purchaseNFTBadge(tier as NFTBadgeTier, def.cost);
    }),
  }));

  // Special Utilities Section
  const specialUtilities: SpendingOption[] = [
    {
      id: 'change_id',
      name: 'Change Student ID',
      description: 'Update your student ID',
      price: 50,
      icon: <Key className="w-6 h-6" />,
      action: () => handleAction('change_id', () => {
        const trimmed = newStudentId.trim();
        if (!trimmed) {
          toast.error('Please enter a new Student ID');
          return;
        }
        const changed = changeStudentId(trimmed);
        if (changed) {
          setNewStudentId('');
        }
      }),
    },
    {
      id: 'backup',
      name: 'Download Backup',
      description: 'Export all your data (FREE)',
      price: 0,
      icon: <Database className="w-6 h-6" />,
      action: () => handleAction('backup', () => {
        downloadDataBackup();
      }),
    },
  ];

  const renderSection = (title: string, items: SpendingOption[], icon: ReactNode, extraInputs?: ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-4"
    >
      <div className="flex items-center space-x-2 mb-4">
        {icon}
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      
      {extraInputs}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const isLoading = loading === item.id;
          const canAfford = voiceBalance >= item.price;
          let isActive = false;

          if (isPremiumFeatureId(item.id)) {
            isActive = isPremiumActive(item.id);
          }

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border transition-all ${
                isActive
                  ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/50'
                  : 'bg-surface/50 border-white/10 hover:border-primary/50'
              } ${item.disabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${
                  isActive ? 'bg-purple-500/20 text-purple-400' : 'bg-primary/20 text-primary'
                }`}>
                  {item.icon}
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                    Active
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
              <p className="text-sm text-gray-400 mb-3">{item.description}</p>

              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${canAfford ? 'text-primary' : 'text-red-400'}`}>
                  {item.price === 0 ? 'FREE' : `${item.price} VOICE`}
                </span>
                <button
                  onClick={item.action}
                  disabled={isLoading || !canAfford || item.disabled}
                  className={`px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    </div>
                  ) : isActive ? (
                    '✓ Active'
                  ) : (
                    item.price === 0 ? 'Download' : 'Purchase'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center space-x-3">
              <Store className="w-10 h-10 text-primary" />
              <span>Token Marketplace</span>
            </h1>
            <p className="text-gray-400 mt-2">
              Unlock premium features and boost your content with $VOICE tokens
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Your Balance</p>
            <p className="text-3xl font-bold text-primary">{formatVoiceBalance(voiceBalance)}</p>
          </div>
        </div>
      </motion.div>

      {/* Alert for low balance */}
      {voiceBalance < 50 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 mb-6 border border-yellow-500/30"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-medium">Low Balance</p>
              <p className="text-gray-400 text-sm">
                Earn more VOICE by creating posts, engaging with the community, and participating in SafeVoice!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-8">
        {/* Premium Features */}
        {renderSection('Premium Features', premiumFeatures, <Crown className="w-6 h-6 text-yellow-500" />)}

        {/* Post Boosts */}
        {renderSection(
          'Post Boosts',
          postBoosts,
          <TrendingUp className="w-6 h-6 text-green-500" />,
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Your Post</label>
              <select
                value={selectedPostId}
                onChange={(e) => setSelectedPostId(e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="">-- Choose a post --</option>
                {myPosts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.content.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Extend Hours</label>
                <input
                  type="number"
                  value={extendHours}
                  onChange={(e) => setExtendHours(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  placeholder="24"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Campus IDs (comma-separated)</label>
                <input
                  type="text"
                  value={campusIds}
                  onChange={(e) => setCampusIds(e.target.value)}
                  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  placeholder="campus1, campus2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Social */}
        {renderSection(
          'Social',
          socialOptions,
          <Zap className="w-6 h-6 text-pink-500" />,
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Recipient User ID</label>
                <input
                  type="text"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  placeholder="student_123"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tip Amount (1-100)</label>
                <input
                  type="number"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  placeholder="5"
                />
              </div>
            </div>
          </div>
        )}

        {/* NFT Badges */}
        {renderSection('NFT Badges', nftBadges, <Shield className="w-6 h-6 text-purple-500" />)}

        {/* Special Utilities */}
        {renderSection(
          'Special Utilities',
          specialUtilities,
          <Key className="w-6 h-6 text-blue-500" />,
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">New Student ID</label>
              <input
                type="text"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                placeholder="Enter new ID (min 3 chars)"
              />
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 mt-8"
      >
        <div className="flex items-start space-x-3">
          <Sparkles className="w-6 h-6 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">How to Earn More VOICE</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Create posts and share your thoughts (+10 VOICE)</li>
              <li>• Engage with others through reactions and comments (+1-3 VOICE)</li>
              <li>• Maintain daily login streaks (up to +300 VOICE)</li>
              <li>• Help others with verified advice (+200 VOICE)</li>
              <li>• Invite friends with your referral code (+25 VOICE per join)</li>
              <li>• Light candles on the Memorial Wall (+2 VOICE)</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
