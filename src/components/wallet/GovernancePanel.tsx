import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, AlertCircle, ExternalLink, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import type { GovernanceProposal } from '../../lib/wallet/types';

interface GovernancePanelProps {
  proposals?: GovernanceProposal[];
  votingPower?: number;
  onVote?: (proposalId: number, support: number, reason?: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export default function GovernancePanel({
  proposals = [],
  votingPower = 0,
  onVote,
  isLoading = false,
  className = '',
}: GovernancePanelProps) {
  const [selectedProposal, setSelectedProposal] = useState<GovernanceProposal | null>(null);
  const [selectedSupport, setSelectedSupport] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async () => {
    if (!selectedProposal || selectedSupport === null) {
      toast.error('Select an option to vote');
      return;
    }

    if (votingPower <= 0) {
      toast.error('No voting power available');
      return;
    }

    setIsSubmitting(true);
    try {
      await onVote?.(selectedProposal.id, selectedSupport, reason);
      toast.success('Vote submitted successfully!');
      setSelectedProposal(null);
      setSelectedSupport(null);
      setReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDeadline = (deadline: number) => {
    const diff = deadline - Date.now();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
  };

  return (
    <div className={`glass p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Gavel className="w-5 h-5 text-primary" />
          <span>Governance</span>
        </h2>
        <div className="flex items-center space-x-2 px-3 py-1 bg-primary/20 rounded-full">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary font-semibold">Voting Power: {votingPower.toFixed(2)}</span>
        </div>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Gavel className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No governance proposals yet</p>
          <p className="text-xs mt-1">Check back soon for new governance initiatives</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 rounded-lg border transition-all ${
                selectedProposal?.id === proposal.id ? 'border-primary bg-primary/20' : 'border-white/10 bg-surface/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{proposal.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{proposal.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{formatDeadline(proposal.deadline)}</div>
                  <div className="text-xs text-primary mt-1">Quorum: {proposal.quorum}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                {proposal.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedProposal(proposal);
                      setSelectedSupport(option.value);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedProposal?.id === proposal.id && selectedSupport === option.value
                        ? 'border-primary bg-primary/30'
                        : 'border-white/10 bg-surface/40 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white font-medium">{option.label}</span>
                      <span className="text-xs text-primary">{option.support}%</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <span>Total Votes: {proposal.votes}</span>
                <a href="#" className="flex items-center space-x-1 text-primary">
                  <span>View Proposal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedProposal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 bg-primary/10 border border-primary/30 rounded-lg space-y-3"
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Confirm Vote</h4>
                <p className="text-xs text-primary/90">
                  You are voting on "{selectedProposal.title}" with option "{
                    selectedProposal.options.find(opt => opt.value === selectedSupport)?.label
                  }".
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-300 mb-2 block">Optional Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-surface/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Share your thoughts about this vote..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSelectedProposal(null);
                  setSelectedSupport(null);
                  setReason('');
                }}
                className="py-2 bg-surface/40 hover:bg-surface/60 text-gray-300 rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleVote}
                disabled={isSubmitting}
                className="py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Vote'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
