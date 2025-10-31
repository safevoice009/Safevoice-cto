import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, Plus, Gift, Award, RefreshCw } from 'lucide-react';
import { useStore } from '../../lib/store';
import { EARN_RULES, formatVoiceBalance } from '../../lib/tokenEconomics';
import toast from 'react-hot-toast';

export default function ReferralSection() {
  const [copied, setCopied] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    referralCode,
    referredFriends,
    simulateReferralJoin,
    markReferralFirstPost,
    loadReferralData,
    generateReferralCode,
  } = useStore();

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  useEffect(() => {
    setJoinCode(referralCode);
  }, [referralCode]);

  const totalReferralEarnings = referredFriends.reduce((total, friend) => {
    let earnings = EARN_RULES.referralJoin;
    if (friend.firstPostRewarded) {
      earnings += EARN_RULES.referralFirstPost;
    }
    return total + earnings;
  }, 0);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Invite code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleSimulateJoin = () => {
    if (!friendName.trim()) {
      toast.error('Please enter a friend name');
      return;
    }

    if (!joinCode.trim()) {
      toast.error('Please enter the invite code');
      return;
    }

    const success = simulateReferralJoin(joinCode, friendName);
    if (success) {
      setFriendName('');
      setJoinCode(referralCode);
    }
  };

  const handleMarkFirstPost = (friendId: string) => {
    markReferralFirstPost(friendId);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass p-6 space-y-4"
    >
      <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
        <Users className="w-6 h-6 text-primary" />
        <span>🎁 Invite Friends</span>
      </h2>

      <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-400">Your Invite Code</p>
            <p className="text-2xl font-bold text-white font-mono tracking-wider">{referralCode}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => generateReferralCode()}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              type="button"
              title="Generate new code"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleCopyCode}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              type="button"
              title="Copy code"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-300">
          <Gift className="w-4 h-4 text-primary" />
          <span>Share this code to earn +{EARN_RULES.referralJoin} VOICE per friend!</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-surface/50 rounded-lg">
          <p className="text-sm text-gray-400">Friends Joined</p>
          <p className="text-2xl font-bold text-white mt-1">{referredFriends.length}</p>
        </div>
        <div className="p-4 bg-surface/50 rounded-lg">
          <p className="text-sm text-gray-400">Total Earned</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatVoiceBalance(totalReferralEarnings)}</p>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-white hover:text-primary transition-colors"
          type="button"
        >
          <span className="font-semibold">Simulate Friend Join</span>
          <Plus className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 bg-surface/30 rounded-lg space-y-3">
                <p className="text-sm text-gray-400">
                  Test the referral system by simulating a friend joining with your invite code
                </p>
                <input
                  type="text"
                  placeholder="Friend's Name"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Invite Code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleSimulateJoin}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
                  type="button"
                >
                  Simulate Join
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {referredFriends.length > 0 && (
        <div className="border-t border-white/10 pt-4 space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Your Referrals ({referredFriends.length})</span>
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {referredFriends.map((friend) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-surface/30 rounded-lg hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium">{friend.name}</p>
                      {friend.firstPostRewarded && (
                        <Award className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Joined {formatDate(friend.joinedAt)}</p>
                    {friend.firstPostAt && (
                      <p className="text-xs text-gray-500 mt-1">First post {formatDate(friend.firstPostAt)}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        +{EARN_RULES.referralJoin} VOICE
                      </span>
                      {friend.firstPostRewarded && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                          +{EARN_RULES.referralFirstPost} VOICE
                        </span>
                      )}
                    </div>
                  </div>
                  {!friend.firstPostRewarded && (
                    <button
                      onClick={() => handleMarkFirstPost(friend.id)}
                      className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-sm rounded-lg transition-colors"
                      type="button"
                    >
                      Mark First Post
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {referredFriends.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No referrals yet</p>
          <p className="text-sm mt-2">Share your invite code to start earning!</p>
        </div>
      )}
    </motion.div>
  );
}
