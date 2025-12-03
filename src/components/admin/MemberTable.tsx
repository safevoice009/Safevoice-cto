import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, AlertTriangle, UserCheck, Clock } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatTimeAgo } from '../../lib/utils';

export default function MemberTable() {
  const memberStatuses = useStore((state) => state.memberStatuses) || [];
  const banCommunityMember = useStore((state) => state.banCommunityMember);
  const unbanCommunityMember = useStore((state) => state.unbanCommunityMember);
  const warnCommunityMember = useStore((state) => state.warnCommunityMember);
  
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'warn' | null>(null);
  const [reason, setReason] = useState('');
  const [banDuration, setBanDuration] = useState(24);

  const handleAction = () => {
    if (!selectedMember || !reason.trim()) return;

    if (actionType === 'ban') {
      banCommunityMember(selectedMember, reason, banDuration);
    } else if (actionType === 'warn') {
      warnCommunityMember(selectedMember, reason);
    }

    setSelectedMember(null);
    setActionType(null);
    setReason('');
    setBanDuration(24);
  };

  const handleUnban = (memberId: string) => {
    unbanCommunityMember(memberId);
  };

  const openActionModal = (memberId: string, action: 'ban' | 'warn') => {
    setSelectedMember(memberId);
    setActionType(action);
  };

  const bannedMembers = memberStatuses.filter(m => m.isBanned);
  const warnedMembers = memberStatuses.filter(m => m.warnings.length > 0 && !m.isBanned);

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{memberStatuses.length}</p>
              <p className="text-sm text-gray-400">Total Members</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Ban className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{bannedMembers.length}</p>
              <p className="text-sm text-gray-400">Banned</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{warnedMembers.length}</p>
              <p className="text-sm text-gray-400">Warned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banned Members */}
      {bannedMembers.length > 0 && (
        <div className="glass p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Ban className="w-5 h-5 text-red-400" />
            <span>Banned Members</span>
          </h3>
          <div className="space-y-3">
            {bannedMembers.map((member) => (
              <motion.div
                key={member.studentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface/50 border border-red-500/30 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-white">{member.studentId}</span>
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                        Banned
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">
                      Reason: {member.banReason}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {member.bannedAt && (
                        <span>Banned {formatTimeAgo(member.bannedAt)}</span>
                      )}
                      {member.bannedUntil && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Until {new Date(member.bannedUntil).toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnban(member.studentId)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors"
                  >
                    Unban
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Warned Members */}
      {warnedMembers.length > 0 && (
        <div className="glass p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span>Warned Members</span>
          </h3>
          <div className="space-y-3">
            {warnedMembers.map((member) => (
              <motion.div
                key={member.studentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface/50 border border-yellow-500/30 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-white">{member.studentId}</span>
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                      {member.warnings.length} warning{member.warnings.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openActionModal(member.studentId, 'warn')}
                      className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm text-white transition-colors"
                    >
                      Add Warning
                    </button>
                    <button
                      onClick={() => openActionModal(member.studentId, 'ban')}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors"
                    >
                      Ban
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {member.warnings.slice(-3).map((warning) => (
                    <div key={warning.id} className="text-sm bg-black/30 rounded p-2">
                      <p className="text-gray-300">{warning.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        By {warning.issuedBy} • {formatTimeAgo(warning.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {selectedMember && actionType && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-6 rounded-lg max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {actionType === 'ban' ? 'Ban Member' : 'Issue Warning'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Member ID
                </label>
                <input
                  type="text"
                  value={selectedMember}
                  disabled
                  className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {actionType === 'ban' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={banDuration}
                    onChange={(e) => setBanDuration(Number(e.target.value))}
                    className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide a reason..."
                  className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setActionType(null);
                    setReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={!reason.trim()}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-black font-medium transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
