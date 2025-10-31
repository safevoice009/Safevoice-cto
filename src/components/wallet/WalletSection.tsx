import { useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { useAccount, useEnsName, useNetwork } from 'wagmi';
import { useStore } from '../../lib/store';
import { formatVoiceBalance, calculateTotalEarnings } from '../../lib/tokenEconomics';
import toast from 'react-hot-toast';
import ReferralSection from './ReferralSection';
import PremiumSettings from './PremiumSettings';
import NFTBadgeStore from './NFTBadgeStore';

export default function WalletSection() {
  const [copied, setCopied] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address: address ?? undefined });
  const { chain } = useNetwork();

  const {
    voiceBalance,
    pendingRewards,
    earningsBreakdown,
    transactionHistory,
    anonymousWalletAddress,
    connectedAddress,
    claimRewards,
  } = useStore();

  const totalEarned = calculateTotalEarnings(earningsBreakdown);
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
    setClaimLoading(true);
    try {
      await claimRewards();
    } catch {
      toast.error('Failed to claim rewards');
    } finally {
      setClaimLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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

      {/* VOICE Balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-6 space-y-4"
      >
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Coins className="w-6 h-6 text-primary" />
          <span>💎 $VOICE Balance</span>
        </h2>

        <div className="text-center py-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
          <p className="text-5xl font-bold text-white">{formatVoiceBalance(voiceBalance)}</p>
          <p className="text-gray-400 mt-2">Total Balance</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-surface/50 rounded-lg">
            <p className="text-sm text-gray-400">On-Chain</p>
            <p className="text-xl font-bold text-white mt-1">0 VOICE</p>
            <p className="text-xs text-gray-500 mt-1">Coming Soon</p>
          </div>
          <div className="p-4 bg-surface/50 rounded-lg">
            <p className="text-sm text-gray-400">Claimable</p>
            <p className="text-xl font-bold text-primary mt-1">
              {formatVoiceBalance(pendingRewards)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Rewards earned</p>
          </div>
        </div>

        <button
          onClick={handleClaimRewards}
          disabled={claimLoading || pendingRewards === 0 || !isConnected}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {claimLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>Claiming...</span>
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              <span>Claim Rewards to Blockchain</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Earnings Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass p-6 space-y-4"
      >
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Clock className="w-6 h-6 text-primary" />
          <span>🕒 Recent Transactions</span>
        </h2>

        {transactionHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm mt-2">Start earning VOICE by creating posts!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactionHistory.slice(0, 10).map((tx) => {
              const claimedAmount = typeof tx.metadata.claimedAmount === 'number' ? tx.metadata.claimedAmount : 0;
              const rawAmount = tx.type === 'claim' ? claimedAmount : tx.amount;
              const signedAmount = tx.type === 'spend' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
              const amountLabel = `${signedAmount > 0 ? '+' : ''}${Math.abs(signedAmount)} VOICE`;
              const amountColor =
                tx.type === 'spend'
                  ? 'text-red-400'
                  : tx.type === 'claim'
                  ? 'text-blue-400'
                  : 'text-green-400';

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-surface/30 rounded-lg hover:bg-surface/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium flex items-center gap-2">
                      {tx.reason}
                      {tx.reasonCode && (
                        <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                          {tx.reasonCode}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(tx.timestamp)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Balance after: <span className="text-gray-300">{formatVoiceBalance(tx.balance)}</span>
                      {typeof tx.pending === 'number' && (
                        <span className="ml-2">Pending: {formatVoiceBalance(tx.pending)}</span>
                      )}
                    </p>
                  </div>
                  <span className={`font-semibold ${amountColor}`}>{amountLabel}</span>
                </div>
              );
            })}
            </div>
            )}
            </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass p-6 space-y-4"
      >
        <h2 className="text-xl font-bold text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
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
