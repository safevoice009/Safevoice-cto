import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Coins,
  TrendingUp,
  Send,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Gift,
  Award,
  ArrowRight,
} from 'lucide-react';
import { useAccount, useEnsName, useNetwork } from 'wagmi';
import { useStore } from '../../lib/store';
import { formatVoiceBalance, calculateTotalEarnings } from '../../lib/tokenEconomics';
import toast from 'react-hot-toast';
import ReferralSection from './ReferralSection';
import PremiumSettings from './PremiumSettings';
import NFTBadgeStore from './NFTBadgeStore';
import UtilitiesSection from './UtilitiesSection';
import TransactionHistory from './TransactionHistory';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

function AnimatedCounter({ value, duration = 1 }: AnimatedCounterProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (latest) => Math.max(0, Math.floor(latest)));
  const [displayValue, setDisplayValue] = useState(() => Math.max(0, Math.floor(value)));
  const isTestEnv = process.env.NODE_ENV === 'test';

  useEffect(() => {
    if (isTestEnv) {
      motionValue.set(value);
      setDisplayValue(Math.max(0, Math.floor(value)));
      return;
    }

    const animation = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
    });

    return () => animation.stop();
  }, [motionValue, value, duration, isTestEnv]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [rounded]);

  return <>{formatVoiceBalance(displayValue)}</>;
}

export default function WalletSection() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [localClaimLoading, setLocalClaimLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address: address ?? undefined });
  const { chain } = useNetwork();

  const {
    voiceBalance,
    pendingRewards,
    totalRewardsEarned,
    claimedRewards,
    spentRewards,
    availableBalance,
    pendingRewardBreakdown,
    earningsBreakdown,
    transactionHistory,
    anonymousWalletAddress,
    connectedAddress,
    claimRewards,
    walletLoading,
    walletError,
  } = useStore();

  const totalEarned = totalRewardsEarned || calculateTotalEarnings(earningsBreakdown);

  const truncatedConnected = connectedAddress
    ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
    : null;
  const displayAddress = ensName || truncatedConnected || '—';

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleClaimRewards = async () => {
    if (!isConnected) {
      toast.error('Connect wallet first');
      return;
    }
    
    if (pendingRewards === 0) {
      toast.error('No pending rewards to claim');
      return;
    }

    setLocalClaimLoading(true);
    setLocalError(null);
    
    try {
      await claimRewards();
      toast.success('🎉 Rewards claimed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim rewards';
      setLocalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLocalClaimLoading(false);
    }
  };

  // Use pending rewards breakdown from store
  const pendingBreakdown = pendingRewardBreakdown.length > 0
    ? pendingRewardBreakdown
    : Object.entries(earningsBreakdown)
        .filter(([, amount]) => amount > 0)
        .map(([category, amount]) => ({ category, amount, timestamp: Date.now() }));

  const LOW_BALANCE_THRESHOLD = 10;
  const showLowBalanceAlert = availableBalance < LOW_BALANCE_THRESHOLD && availableBalance > 0;

  return (
    <div className="space-y-6">
      {/* Low Balance Alert */}
      <AnimatePresence>
        {showLowBalanceAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-4 border border-yellow-500/30 bg-yellow-500/10"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 font-medium">Low Balance Alert</p>
                <p className="text-sm text-gray-300 mt-1">
                  Your available balance is low. Keep engaging to earn more VOICE tokens!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Earned Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="glass p-6 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Total Earned</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            <AnimatedCounter value={totalEarned} />
          </p>
          <p className="text-xs text-gray-500">Lifetime earnings</p>
        </motion.div>

        {/* Pending Rewards Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 space-y-3 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Pending Rewards</h3>
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-purple-400">
            <AnimatedCounter value={pendingRewards} />
          </p>
          <p className="text-xs text-gray-500">Ready to claim</p>
        </motion.div>

        {/* Claimed Amount Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Claimed</h3>
            <Check className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            <AnimatedCounter value={claimedRewards} />
          </p>
          <p className="text-xs text-gray-500">Total claimed rewards</p>
        </motion.div>

        {/* Spent Amount Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Spent</h3>
            <Send className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            <AnimatedCounter value={spentRewards} />
          </p>
          <p className="text-xs text-gray-500">Total spending</p>
        </motion.div>

        {/* Available Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass p-6 space-y-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Available</h3>
            <Coins className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-400">
            <AnimatedCounter value={availableBalance} />
          </p>
          <p className="text-xs text-gray-500">Spendable balance</p>
        </motion.div>

        {/* Total Balance Card (Claimed - Spent) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass p-6 space-y-3 bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Total Balance</h3>
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-primary">
            <AnimatedCounter value={voiceBalance} />
          </p>
          <p className="text-xs text-gray-500">Current balance</p>
        </motion.div>
      </div>

      {/* Claim Rewards Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Gift className="w-6 h-6 text-primary" />
            <span>Claim Rewards</span>
          </h2>
          {pendingRewards > 0 && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">
              {formatVoiceBalance(pendingRewards)} Available
            </span>
          )}
        </div>

        {(localError || walletError) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{localError || walletError}</p>
            </div>
          </motion.div>
        )}

        <button
          onClick={handleClaimRewards}
          disabled={localClaimLoading || walletLoading || pendingRewards === 0 || !isConnected}
          className="w-full relative flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {localClaimLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>Claiming...</span>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.2 }}
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-lg"
              />
            </>
          ) : walletLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>Syncing wallet...</span>
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              <span>
                {pendingRewards === 0 
                  ? 'No Rewards to Claim' 
                  : !isConnected
                  ? 'Connect Wallet to Claim'
                  : 'Claim Rewards'}
              </span>
            </>
          )}
        </button>

        {!isConnected && (
          <p className="text-sm text-gray-400 text-center">
            Connect your wallet above to claim your pending rewards
          </p>
        )}
      </motion.div>

      {/* Pending Rewards Breakdown */}
      {pendingRewards > 0 && pendingBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass p-6 space-y-4"
        >
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Award className="w-6 h-6 text-primary" />
            <span>Pending Breakdown</span>
          </h2>
          <div className="space-y-2">
            {pendingBreakdown.slice(0, 5).map(({ category, amount }) => (
              <div
                key={category}
                className="flex items-center justify-between p-3 bg-surface/30 rounded-lg hover:bg-surface/50 transition-colors"
              >
                <span className="text-gray-300 capitalize">{category}</span>
                <span className="text-purple-400 font-semibold">+{amount} VOICE</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Wallet Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass p-6 space-y-4"
      >
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Wallet className="w-6 h-6 text-primary" />
          <span>Connected Wallets</span>
        </h2>

        {isConnected && connectedAddress ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg">
              <div>
                <p className="text-sm text-gray-400">Main Wallet</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-white font-mono text-sm">{displayAddress}</p>
                  <button
                    onClick={() => connectedAddress && handleCopy(connectedAddress)}
                    className="text-gray-400 hover:text-white transition-colors"
                    type="button"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-gray-400">Network:</span>
                  <span className="text-xs text-primary font-medium">{chain?.name || 'Unknown'}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">Connected</span>
              </div>
            </div>

            {anonymousWalletAddress && (
              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-400 flex items-center space-x-2">
                    <Lock className="w-3 h-3" />
                    <span>Anonymous Wallet</span>
                  </p>
                  <p className="text-white font-mono text-sm mt-1">
                    {`${anonymousWalletAddress.slice(0, 6)}...${anonymousWalletAddress.slice(-4)}`}
                  </p>
                </div>
                <span className="text-xs text-purple-400 font-medium">In-App</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No wallet connected</p>
            <p className="text-sm mt-2">Connect your wallet to claim rewards</p>
          </div>
        )}
      </motion.div>

      {/* Earnings Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="glass p-6 space-y-4"
      >
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          <span>📊 How You Earned</span>
        </h2>

        <div className="space-y-2">
          {Object.entries(earningsBreakdown).map(([category, amount]) => (
            <div key={category} className="flex items-center justify-between p-3 bg-surface/30 rounded-lg">
              <span className="text-gray-300 capitalize">{category}</span>
              <span className="text-primary font-semibold">+{amount} VOICE</span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg">
              <span className="text-white font-bold">Total Earned</span>
              <span className="text-primary font-bold text-lg">+{totalEarned} VOICE</span>
            </div>
          </div>
        </div>
      </motion.div>

      <PremiumSettings />

      <NFTBadgeStore />

      <ReferralSection />

      <UtilitiesSection />

      {/* Recent Transaction History with View All Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="space-y-4"
      >
        <div className="glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <Clock className="w-6 h-6 text-primary" />
              <span>🕒 Recent Transactions</span>
            </h2>
            {transactionHistory.length > 10 && (
              <button
                onClick={() => navigate('/transactions')}
                className="flex items-center space-x-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors font-medium"
              >
                <span>View All</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {transactionHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm mt-2">Start earning VOICE by creating posts!</p>
            </div>
          ) : (
            <TransactionHistory
              transactions={transactionHistory}
              showFilters={false}
              showPagination={false}
              showExport={false}
              showHeader={false}
              visibleCount={10}
              maxHeight="max-h-[500px]"
            />
          )}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="glass p-6 space-y-4"
      >
        <h2 className="text-xl font-bold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            disabled
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-surface/50 rounded-lg text-gray-400 cursor-not-allowed relative overflow-hidden"
          >
            <Send className="w-5 h-5" />
            <span>Send VOICE</span>
            <span className="absolute top-1 right-1 text-[10px] bg-primary px-2 py-0.5 rounded-full">
              Soon
            </span>
          </button>
          <button
            disabled
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-surface/50 rounded-lg text-gray-400 cursor-not-allowed relative overflow-hidden"
          >
            <Lock className="w-5 h-5" />
            <span>Stake VOICE</span>
            <span className="absolute top-1 right-1 text-[10px] bg-primary px-2 py-0.5 rounded-full">
              Soon
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
