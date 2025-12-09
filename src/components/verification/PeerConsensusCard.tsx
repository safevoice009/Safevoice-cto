/**
 * Peer Consensus Card
 * 
 * Shows pending peer approval requests for the current user to vote on.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore, type PeerConsensusRequest } from '../../lib/store';

interface PeerConsensusCardProps {
  onRequestVoted?: () => void;
}

export default function PeerConsensusCard({ onRequestVoted }: PeerConsensusCardProps) {
  const { t } = useTranslation();
  const [pendingRequests, setPendingRequests] = useState<PeerConsensusRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votingRequestId, setVotingRequestId] = useState<string | null>(null);

  const getPendingPeerConsensusRequests = useStore((state) => state.getPendingPeerConsensusRequests);
  const approvePeerConsensus = useStore((state) => state.approvePeerConsensus);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const requests = await getPendingPeerConsensusRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('[PeerConsensus] Failed to load requests:', error);
    }
    setIsLoading(false);
  }, [getPendingPeerConsensusRequests]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleVote = async (requestId: string, approve: boolean) => {
    setVotingRequestId(requestId);
    try {
      const success = await approvePeerConsensus(requestId, approve);
      if (success) {
        // Remove from local list
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        onRequestVoted?.();
      }
    } finally {
      setVotingRequestId(null);
    }
  };

  const getTimeRemaining = (expiresAt: number) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (isLoading) {
    return (
      <div className="rounded-xl bg-surface/30 border border-white/10 p-4">
        <div className="flex items-center gap-2 text-text-muted">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading peer requests...</span>
        </div>
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return null; // Don't show card if no pending requests
  }

  return (
    <div className="rounded-xl bg-surface/30 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-info" />
          <span className="font-medium text-text">
            {t('verification.peerConsensus', 'Peer Verification Requests')}
          </span>
        </div>
        <motion.button
          onClick={loadRequests}
          className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Request list */}
      <div className="divide-y divide-white/5">
        <AnimatePresence>
          {pendingRequests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Request info */}
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs text-text-muted font-mono truncate">
                      {request.subjectHash.slice(0, 12)}...
                    </code>
                    <ChevronRight className="w-3 h-3 text-text-muted" />
                    <span className="text-xs text-text-muted">
                      {t('verification.requestsApproval', 'requests verification')}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{request.approvalCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-400">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{request.rejectionCount}</span>
                    </div>
                    <span className="text-text-muted">
                      / {request.quorum} {t('verification.needed', 'needed')}
                    </span>
                  </div>

                  {/* Time remaining */}
                  <div className="flex items-center gap-1 mt-1 text-xs text-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>{getTimeRemaining(request.expiresAt)}</span>
                  </div>
                </div>

                {/* Vote buttons */}
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => handleVote(request.id, true)}
                    disabled={votingRequestId === request.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {votingRequestId === request.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4" />
                    )}
                    <span>{t('common.approve', 'Approve')}</span>
                  </motion.button>

                  <motion.button
                    onClick={() => handleVote(request.id, false)}
                    disabled={votingRequestId === request.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>{t('common.reject', 'Reject')}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 bg-surface/20 border-t border-white/5">
        <p className="text-xs text-text-muted text-center">
          🔐 {t('verification.privacyNote', 'Your vote is encrypted. Only the outcome is recorded.')}
        </p>
      </div>
    </div>
  );
}
