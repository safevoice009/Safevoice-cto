import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Shield, Clock, Filter } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatTimeAgo } from '../../lib/utils';
import type { CommunityModerationLog } from '../../lib/store';

interface ModerationLogDisplayProps {
  className?: string;
}

export default function ModerationLogDisplay({ className = '' }: ModerationLogDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pin' | 'delete' | 'ban' | 'warn' | 'mute' | 'announcement'>('all');
  const [showFullLogs, setShowFullLogs] = useState(false);

  const { communityModerationLogs } = useStore();

  const filteredLogs = communityModerationLogs.filter(log => {
    if (filter === 'all') return true;
    return log.actionType.includes(filter);
  });

  const displayLogs = showFullLogs ? filteredLogs : filteredLogs.slice(0, 5);

  const getActionIcon = (actionType: CommunityModerationLog['actionType']) => {
    if (actionType.includes('pin')) return '📌';
    if (actionType.includes('delete')) return '🗑️';
    if (actionType.includes('ban')) return '🚫';
    if (actionType.includes('warn')) return '⚠️';
    if (actionType.includes('mute')) return '🔇';
    if (actionType.includes('announcement')) return '📢';
    return '🛡️';
  };

  const getActionColor = (actionType: CommunityModerationLog['actionType']) => {
    if (actionType.includes('pin')) return 'text-orange-400';
    if (actionType.includes('delete')) return 'text-red-400';
    if (actionType.includes('ban')) return 'text-red-400';
    if (actionType.includes('warn')) return 'text-yellow-400';
    if (actionType.includes('mute')) return 'text-blue-400';
    if (actionType.includes('announcement')) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass p-6 space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">Community Moderation Log</h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            {/* Filter */}
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="bg-surface border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="all">All Actions</option>
                <option value="pin">Pins</option>
                <option value="delete">Deletions</option>
                <option value="ban">Bans</option>
                <option value="warn">Warnings</option>
                <option value="mute">Mutes</option>
                <option value="announcement">Announcements</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {displayLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No moderation actions yet</p>
            <p className="text-sm">Community moderation actions will appear here for transparency</p>
          </div>
        ) : (
          displayLogs.map((log) => (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-surface/50 border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className={`text-lg ${getActionColor(log.actionType)}`}>
                    {getActionIcon(log.actionType)}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-white capitalize">
                      {log.actionType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      by {log.moderatorId}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(log.timestamp)}
                </div>
              </div>
              
              <p className="text-sm text-gray-200 mb-2">{log.description}</p>
              
              {log.metadata.reason && (
                <div className="text-xs text-gray-400 bg-black/30 rounded p-2">
                  <span className="font-medium">Reason:</span> {log.metadata.reason}
                </div>
              )}
              
              {log.metadata.duration && (
                <div className="text-xs text-gray-400">
                  <span className="font-medium">Duration:</span> {log.metadata.duration} hours
                </div>
              )}
              
              {log.metadata.targetName && (
                <div className="text-xs text-gray-400">
                  <span className="font-medium">Target:</span> {log.metadata.targetName}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {filteredLogs.length > 5 && (
        <div className="text-center pt-4">
          <button
            onClick={() => setShowFullLogs(!showFullLogs)}
            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg text-sm text-primary transition-colors"
          >
            {showFullLogs ? 'Show Less' : `Show All (${filteredLogs.length} actions)`}
          </button>
        </div>
      )}
    </motion.div>
  );
}