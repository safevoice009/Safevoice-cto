import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, TrendingUp, Info, Coins } from 'lucide-react';
import toast from 'react-hot-toast';

import type { StakingPosition } from '../../lib/wallet/types';

interface StakingPanelProps {
  onStake?: (amount: number, lockPeriod: number) => Promise<void>;
  onUnstake?: (stakeId: number) => Promise<void>;
  onClaimRewards?: (stakeId: number) => Promise<void>;
  positions?: StakingPosition[];
  availableBalance?: number;
  isLoading?: boolean;
  className?: string;
}

const LOCK_PERIODS = [
  { days: 7, label: '7 Days', apy: 5 },
  { days: 30, label: '30 Days', apy: 10 },
  { days: 90, label: '90 Days', apy: 15 },
  { days: 180, label: '180 Days', apy: 20 },
];

export default function StakingPanel({
  onStake,
  onUnstake,
  onClaimRewards,
  positions = [],
  availableBalance = 0,
  isLoading = false,
  className = '',
}: StakingPanelProps) {
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(LOCK_PERIODS[1]);
  const [isStaking, setIsStaking] = useState(false);
  const [showStakeForm, setShowStakeForm] = useState(false);

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    if (amount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsStaking(true);
    try {
      await onStake?.(amount, selectedPeriod.days);
      toast.success(`Staked ${amount} VOICE for ${selectedPeriod.days} days!`);
      setStakeAmount('');
      setShowStakeForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stake');
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (stakeId: number) => {
    try {
      await onUnstake?.(stakeId);
      toast.success('Unstaked successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unstake');
    }
  };

  const handleClaimRewards = async (stakeId: number) => {
    try {
      await onClaimRewards?.(stakeId);
      toast.success('Rewards claimed!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to claim rewards');
    }
  };

  const formatTimeRemaining = (unlockAt: number) => {
    const now = Date.now();
    const diff = unlockAt - now;
    
    if (diff <= 0) return 'Unlocked';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const totalStaked = positions.reduce((sum, pos) => sum + pos.amount, 0);
  const totalRewards = positions.reduce((sum, pos) => sum + pos.rewards, 0);

  return (
    <div className={`glass p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Lock className="w-5 h-5 text-primary" />
          <span>Staking</span>
        </h2>
        <button
          onClick={() => setShowStakeForm(!showStakeForm)}
          className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-all"
        >
          {showStakeForm ? 'Cancel' : 'Stake Tokens'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 bg-surface/30 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Total Staked</p>
          <p className="text-xl font-bold text-white">{totalStaked.toFixed(1)} VOICE</p>
        </div>
        <div className="p-4 bg-surface/30 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Pending Rewards</p>
          <p className="text-xl font-bold text-green-400">{totalRewards.toFixed(2)} VOICE</p>
        </div>
        <div className="p-4 bg-surface/30 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Active Positions</p>
          <p className="text-xl font-bold text-primary">{positions.length}</p>
        </div>
      </div>

      {/* Stake Form */}
      <AnimatePresence>
        {showStakeForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Earn rewards by staking your VOICE tokens</p>
                  <p className="text-blue-300/80">Longer lock periods earn higher APY. Tokens can only be unstaked after the lock period ends.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Amount to Stake</label>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => setStakeAmount(availableBalance.toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Available: {availableBalance.toFixed(2)} VOICE</p>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Lock Period</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {LOCK_PERIODS.map((period) => (
                    <button
                      key={period.days}
                      onClick={() => setSelectedPeriod(period)}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedPeriod.days === period.days
                          ? 'border-primary bg-primary/20'
                          : 'border-white/10 bg-surface/30 hover:border-primary/50'
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{period.label}</p>
                      <p className="text-xs text-green-400 mt-1">{period.apy}% APY</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStake}
                disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isStaking ? 'Staking...' : 'Stake Tokens'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staking Positions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Your Positions</h3>
        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No active staking positions</p>
            <p className="text-xs mt-1">Start earning rewards by staking your VOICE tokens</p>
          </div>
        ) : (
          positions.map((position) => {
            const isUnlocked = Date.now() >= position.unlockAt;
            return (
              <motion.div
                key={position.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-surface/30 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{position.amount.toFixed(2)} VOICE</p>
                    <p className="text-xs text-gray-400">
                      Lock Period: {position.lockPeriod} days
                    </p>
                  </div>
                  <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
                    isUnlocked ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span className="text-xs font-medium">{formatTimeRemaining(position.unlockAt)}</span>
                  </div>
                </div>

                {position.rewards > 0 && (
                  <div className="flex items-center justify-between p-2 bg-green-500/10 rounded border border-green-500/30">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-300">+{position.rewards.toFixed(2)} VOICE</span>
                    </div>
                    <button
                      onClick={() => handleClaimRewards(position.id)}
                      className="text-xs text-green-400 hover:text-green-300 font-medium"
                    >
                      Claim
                    </button>
                  </div>
                )}

                {isUnlocked && (
                  <button
                    onClick={() => handleUnstake(position.id)}
                    className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-medium transition-all"
                  >
                    Unstake
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
