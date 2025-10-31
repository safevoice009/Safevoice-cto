import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Flag, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatTimeAgo } from '../../lib/utils';

export default function ModeratorPanel() {
  const { reports, isModerator, reviewReport, posts } = useStore();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'reviewed'>('pending');

  if (!isModerator) {
    return null;
  }

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const reviewedReports = reports.filter((r) => r.status !== 'pending');

  const getPostContent = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report || !report.postId) return null;
    const post = posts.find((p) => p.id === report.postId);
    if (!post) return null;
    return post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '');
  };

  const displayReports = selectedTab === 'pending' ? pendingReports : reviewedReports;

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
        <div className="flex items-center space-x-2 bg-primary/20 px-3 py-1 rounded-full">
          <span className="text-xs text-primary font-medium">{pendingReports.length} Pending</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        <button
          onClick={() => setSelectedTab('pending')}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'pending'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Pending ({pendingReports.length})
        </button>
        <button
          onClick={() => setSelectedTab('reviewed')}
          className={`pb-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'reviewed'
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
          {displayReports.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-gray-400"
            >
              {selectedTab === 'pending' ? 'No pending reports' : 'No reviewed reports'}
            </motion.div>
          ) : (
            displayReports.map((report) => (
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

      <div className="pt-4 border-t border-white/10">
        <div className="flex items-start space-x-3 text-sm text-gray-400">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-300 mb-1">Moderation Rewards:</p>
            <ul className="space-y-1 text-xs">
              <li>• Valid report: +10 VOICE to reporter</li>
              <li>• Review action: +30 VOICE (5min cooldown)</li>
              <li>• Other mod actions: +30 VOICE per action</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
