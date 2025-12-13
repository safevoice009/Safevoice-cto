import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Users, Star, CheckCircle, Clock, XCircle, Archive, AlertCircle, Shield, UserCheck } from 'lucide-react';
import { useStore, type MemorialTribute, type TributeStatus } from '../../lib/store';

interface TributeCardProps {
  tribute: MemorialTribute;
  onCosignClick?: (tributeId: string) => void;
}

const CANDLE_MILESTONE_TARGET = 50;
const CONSENSUS_THRESHOLD = 3;

const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.max(Math.floor(diff / 1000), 1);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return null;
  }
};

const getStatusConfig = (status?: TributeStatus) => {
  switch (status) {
    case 'published':
      return {
        icon: CheckCircle,
        label: 'Published',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30'
      };
    case 'pending_review':
      return {
        icon: Clock,
        label: 'Pending Review',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30'
      };
    case 'rejected':
      return {
        icon: XCircle,
        label: 'Rejected',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30'
      };
    case 'archived':
      return {
        icon: Archive,
        label: 'Archived',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30'
      };
    case 'draft':
    default:
      return {
        icon: AlertCircle,
        label: 'Draft',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30'
      };
  }
};

export default function TributeCard({ tribute, onCosignClick }: TributeCardProps) {
  const lightCandle = useStore((state) => state.lightCandle);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const uniqueSupporters = new Set(tribute.candles.map((c) => c.lightedBy)).size;
  const candleProgress = Math.min(
    100,
    Math.floor((tribute.candles.length / CANDLE_MILESTONE_TARGET) * 100)
  );
  const candlesRemaining = Math.max(
    0,
    CANDLE_MILESTONE_TARGET - tribute.candles.length
  );
  const recentCandles = [...tribute.candles].slice(-3).reverse();

  const statusConfig = getStatusConfig(tribute.status);
  const cosignerCount = tribute.cosigners?.length || 0;
  const hasConsensus = cosignerCount >= CONSENSUS_THRESHOLD;
  const needsCosigners = tribute.status === 'draft' && !hasConsensus;
  const formattedDate = formatDate(tribute.dateOfRemembrance);

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-white">{tribute.personName}</h3>
            {tribute.college && (
              <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded">
                {tribute.college}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
            <span>Honored on {new Date(tribute.createdAt).toLocaleDateString()}</span>
            {formattedDate && (
              <>
                <span>•</span>
                <span>Remembering {formattedDate}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {tribute.status && (
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
              <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
              <span className={statusConfig.color}>{statusConfig.label}</span>
            </div>
          )}
          {tribute.milestoneRewardAwarded && (
            <div className="inline-flex items-center space-x-1 text-amber-300 text-sm">
              <Star className="w-4 h-4" />
              <span>Milestone</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">
        {tribute.message}
      </p>

      {needsCosigners && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3"
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-200 mb-1">
                Consensus: {cosignerCount}/{CONSENSUS_THRESHOLD} cosigners
              </p>
              <p className="text-xs text-blue-300/80">
                {CONSENSUS_THRESHOLD - cosignerCount} more signature{CONSENSUS_THRESHOLD - cosignerCount !== 1 ? 's' : ''} needed for publication
              </p>
              {cosignerCount > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tribute.cosigners?.map((cosigner, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/20 text-blue-200 rounded">
                      <UserCheck className="w-3 h-3" />
                      <span>{cosigner.peerId.slice(0, 8)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {hasConsensus && tribute.status === 'draft' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/30 rounded-lg p-3"
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-200 mb-1">
                Consensus reached!
              </p>
              <p className="text-xs text-green-300/80">
                This tribute has {cosignerCount} cosigner signatures and is ready for review.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {tribute.status === 'pending_review' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3"
        >
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-200 mb-1">
                Awaiting moderator review
              </p>
              <p className="text-xs text-yellow-300/80">
                {cosignerCount} peer signatures verified. A moderator will review this tribute shortly.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {tribute.moderatorDecision && (
        <div className={`rounded-lg p-3 border ${tribute.moderatorDecision.decision === 'approved' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <p className={`text-sm font-medium mb-1 ${tribute.moderatorDecision.decision === 'approved' ? 'text-green-200' : 'text-red-200'}`}>
            Moderator {tribute.moderatorDecision.decision === 'approved' ? 'Approved' : 'Rejected'}
          </p>
          {tribute.moderatorDecision.reason && (
            <p className={`text-xs ${tribute.moderatorDecision.decision === 'approved' ? 'text-green-300/80' : 'text-red-300/80'}`}>
              {tribute.moderatorDecision.reason}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            By {tribute.moderatorDecision.moderatorId} • {formatRelativeTime(tribute.moderatorDecision.timestamp)}
          </p>
        </div>
      )}

      {tribute.status === 'published' && (
        <>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              <span className="inline-flex items-center gap-2 text-amber-300">
                <Flame className="w-4 h-4" />
                <span>{tribute.candles.length} candles lit</span>
              </span>
              <span className="inline-flex items-center gap-2 text-sky-300">
                <Users className="w-4 h-4" />
                <span>{uniqueSupporters} supporters</span>
              </span>
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 transition-all"
                  style={{ width: `${candleProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{Math.min(tribute.candles.length, CANDLE_MILESTONE_TARGET)}/{CANDLE_MILESTONE_TARGET} candles</span>
                {tribute.milestoneRewardAwarded ? (
                  <span className="text-amber-300">Milestone achieved</span>
                ) : (
                  <span>{candlesRemaining} candles to milestone</span>
                )}
              </div>
            </div>
          </div>

          {tribute.candles.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Recent candles</p>
              <div className="space-y-2">
                {recentCandles.map((candle) => (
                  <div key={candle.id} className="flex items-center justify-between text-xs text-gray-400">
                    <span className="text-gray-300">🕯️ {candle.lightedBy}</span>
                    <span>{formatRelativeTime(candle.lightedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tribute.auditTrail && tribute.auditTrail.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <button
            onClick={() => setShowAuditTrail(!showAuditTrail)}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showAuditTrail ? '▼' : '▶'} Audit Trail ({tribute.auditTrail.length} events)
          </button>
          {showAuditTrail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 space-y-1"
            >
              {tribute.auditTrail.map((entry, idx) => (
                <div key={idx} className="text-xs text-gray-400 pl-4 border-l-2 border-white/10 py-1">
                  <span className="text-gray-300">{entry.action}</span> by {entry.actor}
                  <span className="text-gray-500"> • {formatRelativeTime(entry.timestamp)}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {tribute.status === 'published' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => lightCandle(tribute.id)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-lg hover:bg-amber-500/30 transition-all"
          >
            <Flame className="w-4 h-4" />
            <span>Light Candle (+2 VOICE)</span>
          </motion.button>
        )}
        
        {needsCosigners && onCosignClick && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCosignClick(tribute.id)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-200 rounded-lg hover:bg-blue-500/30 transition-all"
          >
            <Shield className="w-4 h-4" />
            <span>Cosign Tribute</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
