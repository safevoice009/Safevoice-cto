import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Flag, CheckCircle, XCircle, AlertTriangle, Flame, User, Clock } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatTimeAgo } from '../../lib/utils';

export default function ModeratorPanel() {
  const {
    reports,
    isModerator,
    reviewReport,
    posts,
    memorialTributes,
    studentId,
    publishTribute,
    rejectTribute,
  } = useStore();
  const [selectedTab, setSelectedTab] = useState<'reports' | 'tributes'>('reports');
  const [reportTab, setReportTab] = useState<'pending' | 'reviewed'>('pending');
  const [tributeTab, setTributeTab] = useState<'pending_review' | 'reviewed'>('pending_review');

  if (!isModerator) {
    return null;
  }

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const reviewedReports = reports.filter((r) => r.status !== 'pending');

  const pendingTributes = memorialTributes.filter((t) => t.status === 'pending_review');
  const reviewedTributes = memorialTributes.filter((t) => t.status === 'published' || t.status === 'rejected' || t.status === 'archived');

  const getPostContent = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report || !report.postId) return null;
    const post = posts.find((p) => p.id === report.postId);
    if (!post) return null;
    return post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '');
  };

  const handlePublishTribute = (tributeId: string, reason?: string) => {
    publishTribute(tributeId, studentId, reason);
  };

  const handleRejectTribute = (tributeId: string, reason?: string) => {
    rejectTribute(tributeId, studentId, reason);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-white">Moderator Panel</h2>
        </div>
        <div className="flex items-center space-x-4 text-xs font-medium">
          <div className="bg-yellow-500/20 px-3 py-1 rounded-full">
            <span className="text-yellow-400">{pendingReports.length} Report{pendingReports.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-purple-500/20 px-3 py-1 rounded-full">
            <span className="text-purple-400">{pendingTributes.length} Tribute{pendingTributes.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Top-level Tabs: Reports vs Tributes */}
      <div className="flex space-x-2 border-b border-white/10">
        <button
          onClick={() => setSelectedTab('reports')}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'reports'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Flag className="w-4 h-4" />
            <span>Reports</span>
          </div>
        </button>
        <button
          onClick={() => setSelectedTab('tributes')}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'tributes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4" />
            <span>Pending Tributes</span>
          </div>
        </button>
      </div>

      {/* Reports Section */}
      {selectedTab === 'reports' && (
        <>
          {/* Report sub-tabs */}
          <div className="flex space-x-2 border-b border-white/10">
            <button
              onClick={() => setReportTab('pending')}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                reportTab === 'pending'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Pending ({pendingReports.length})
            </button>
            <button
              onClick={() => setReportTab('reviewed')}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                reportTab === 'reviewed'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Reviewed ({reviewedReports.length})
            </button>
          </div>

          {/* Reports List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {(reportTab === 'pending' ? pendingReports : reviewedReports).length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8 text-gray-400"
                >
                  {reportTab === 'pending' ? 'No pending reports' : 'No reviewed reports'}
                </motion.div>
              ) : (
                (reportTab === 'pending' ? pendingReports : reviewedReports).map((report) => (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-surface/50 border border-white/10 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Flag className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-white">{report.reportType}</span>
                      {report.status === 'valid' && (
                        <span className="flex items-center space-x-1 text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          <span>Valid</span>
                        </span>
                      )}
                      {report.status === 'invalid' && (
                        <span className="flex items-center space-x-1 text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          <span>Invalid</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400">
                      Reported by {report.reporterId} • {formatTimeAgo(report.reportedAt)}
                    </p>

                    {report.description && (
                      <p className="text-sm text-gray-300 italic">"{report.description}"</p>
                    )}

                    {report.postId && (
                      <div className="bg-black/30 rounded p-2">
                        <p className="text-xs text-gray-400 mb-1">Reported Content:</p>
                        <p className="text-sm text-gray-300">{getPostContent(report.id)}</p>
                      </div>
                    )}

                    {report.status !== 'pending' && report.reviewedBy && (
                      <p className="text-xs text-gray-500">
                        Reviewed by {report.reviewedBy} • {report.reviewedAt && formatTimeAgo(report.reviewedAt)}
                      </p>
                    )}
                  </div>
                </div>

                  {report.status === 'pending' && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => reviewReport(report.id, 'valid')}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark Valid</span>
                      </button>
                      <button
                        onClick={() => reviewReport(report.id, 'invalid')}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Mark Invalid</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              ))
            )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Tributes Section */}
      {selectedTab === 'tributes' && (
        <>
          {/* Tribute sub-tabs */}
          <div className="flex space-x-2 border-b border-white/10">
            <button
              onClick={() => setTributeTab('pending_review')}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                tributeTab === 'pending_review'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Pending ({pendingTributes.length})
            </button>
            <button
              onClick={() => setTributeTab('reviewed')}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                tributeTab === 'reviewed'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Reviewed ({reviewedTributes.length})
            </button>
          </div>

          {/* Tributes List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {(tributeTab === 'pending_review' ? pendingTributes : reviewedTributes).length === 0 ? (
                <motion.div
                  key="empty-tributes"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8 text-gray-400"
                >
                  {tributeTab === 'pending_review' ? 'No pending tributes' : 'No reviewed tributes'}
                </motion.div>
              ) : (
                (tributeTab === 'pending_review' ? pendingTributes : reviewedTributes).map((tribute) => (
                  <TributeCard
                    key={tribute.id}
                    tribute={tribute}
                    isPending={tributeTab === 'pending_review'}
                    onPublish={handlePublishTribute}
                    onReject={handleRejectTribute}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      <div className="pt-4 border-t border-white/10">
        <div className="flex items-start space-x-3 text-sm text-gray-400">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-300 mb-1">Moderation Rewards:</p>
            <ul className="space-y-1 text-xs">
              <li>• Valid report: +10 VOICE to reporter</li>
              <li>• Review action: +30 VOICE (5min cooldown)</li>
              <li>• Tribute approval/rejection: +30 VOICE per action</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface TributeCardProps {
  tribute: MemorialTribute;
  isPending: boolean;
  onPublish: (tributeId: string, reason?: string) => void;
  onReject: (tributeId: string, reason?: string) => void;
}

interface MemorialTribute {
  id: string;
  createdBy: string;
  createdAt: number;
  personName: string;
  message: string;
  candles: Array<{ id: string; tributeId: string; lightedBy: string; lightedAt: number }>;
  milestoneRewardAwarded: boolean;
  status?: TributeStatus;
  cosigners?: TributeCosigner[];
  moderatorDecision?: TributeModeratorDecision;
  auditTrail?: TributeAuditEntry[];
  honoreeHash?: string;
  expiresAt?: number;
  dateOfRemembrance?: string;
}

interface TributeCosigner {
  peerId: string;
  signature: string;
  signedAt: number;
  publicKey: string;
}

interface TributeModeratorDecision {
  moderatorId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  timestamp: number;
}

interface TributeAuditEntry {
  action: string;
  timestamp: number;
  actor: string;
  metadata?: Record<string, unknown>;
}

type TributeStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

function TributeCard({ tribute, isPending, onPublish, onReject }: TributeCardProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const consensus = tribute.cosigners ? tribute.cosigners.length : 0;
  const consensusThreshold = 3;
  const hasConsensus = consensus >= consensusThreshold;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-surface/50 border border-white/10 rounded-lg p-4 space-y-3"
    >
      {/* Header: Honoree and Creator */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-white">{tribute.personName}</span>
            {hasConsensus && isPending && (
              <span className="flex items-center space-x-1 text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" />
                <span>Consensus Ready</span>
              </span>
            )}
            {!hasConsensus && isPending && (
              <span className="flex items-center space-x-1 text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                <span>Awaiting Consensus</span>
              </span>
            )}
            {tribute.status === 'published' && (
              <span className="flex items-center space-x-1 text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" />
                <span>Published</span>
              </span>
            )}
            {tribute.status === 'rejected' && (
              <span className="flex items-center space-x-1 text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                <XCircle className="w-3 h-3" />
                <span>Rejected</span>
              </span>
            )}
          </div>

          {/* Creator and timestamps */}
          <p className="text-xs text-gray-400 flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>Created by {tribute.createdBy} • {formatTimeAgo(tribute.createdAt)}</span>
          </p>

          {/* Cosigner Status */}
          <div className="bg-black/30 rounded p-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Cosigner Consensus:</span>
              <span
                className={`font-medium ${
                  hasConsensus ? 'text-green-400' : 'text-yellow-400'
                }`}
              >
                {consensus}/{consensusThreshold}
              </span>
            </div>
            {tribute.cosigners && tribute.cosigners.length > 0 && (
              <div className="text-xs text-gray-500">
                {tribute.cosigners.map((c: TributeCosigner) => (
                  <div key={c.peerId} className="flex items-center space-x-1">
                    <span className="text-green-400">✓</span>
                    <span>{c.peerId}</span>
                    <span className="text-gray-600 text-xs">
                      {formatTimeAgo(c.signedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tribute Message */}
          <div className="bg-black/30 rounded p-2">
            <p className="text-xs text-gray-400 mb-1">Tribute Message:</p>
            <p className="text-sm text-gray-300">"{tribute.message}"</p>
          </div>

          {/* Audit Trail */}
          {tribute.auditTrail && tribute.auditTrail.length > 0 && (
            <div className="bg-black/30 rounded p-2 space-y-1">
              <p className="text-xs text-gray-400 mb-1">Audit Trail:</p>
              <div className="space-y-1">
                {tribute.auditTrail.slice(-3).map((entry: TributeAuditEntry, idx: number) => (
                  <div key={idx} className="text-xs text-gray-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span className="capitalize">{entry.action.replace(/_/g, ' ')}</span>
                    <span>by {entry.actor}</span>
                    <span className="text-gray-600">•</span>
                    <span>{formatTimeAgo(entry.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moderator Decision */}
          {tribute.moderatorDecision && (
            <div className="bg-black/30 rounded p-2">
              <p className="text-xs text-gray-400 mb-1">Moderator Decision:</p>
              <div className="text-xs text-gray-300">
                <p>
                  <span className="font-medium">
                    {tribute.moderatorDecision.decision.toUpperCase()}
                  </span>
                  {' '}
                  by {tribute.moderatorDecision.moderatorId}
                </p>
                {tribute.moderatorDecision.reason && (
                  <p className="text-gray-400 italic">Reason: {tribute.moderatorDecision.reason}</p>
                )}
                <p className="text-gray-600 text-xs">
                  {formatTimeAgo(tribute.moderatorDecision.timestamp)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isPending && (
        <div className="pt-2 border-t border-white/5 space-y-2">
          {!showRejectForm ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPublish(tribute.id)}
                disabled={!hasConsensus}
                className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hasConsensus
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 cursor-not-allowed text-gray-400'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection (optional)..."
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                rows={2}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    onReject(tribute.id, rejectReason || undefined);
                    setShowRejectForm(false);
                    setRejectReason('');
                  }}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Confirm Rejection</span>
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason('');
                  }}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
