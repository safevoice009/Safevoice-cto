import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Megaphone,
  VolumeX,
  Volume2,
  Pin,
  Trash2,
  AlertTriangle,
  Ban,
  Users,
  Clock,
  Eye,
  Plus,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../lib/store';
import { formatTimeAgo } from '../../lib/utils';
import type { CommunityAnnouncement, CommunityModerationLog } from '../../lib/store';

interface CommunityModerationPanelProps {
  className?: string;
}

export default function CommunityModerationPanel({ className = '' }: CommunityModerationPanelProps) {
  const [activeTab, setActiveTab] = useState<'actions' | 'announcements' | 'logs' | 'members'>('actions');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [muteDuration, setMuteDuration] = useState(1);
  const [banDuration, setBanDuration] = useState(24);

  const {
    isModerator,
    communityAnnouncements,
    communityModerationLogs,
    memberStatuses,
    channelMuteStatus,
    createCommunityAnnouncement,
    muteChannel,
    unmuteChannel,
    banCommunityMember,
    warnCommunityMember,
  } = useStore();

  if (!isModerator) {
    return null;
  }

  const handleCreateAnnouncement = () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      toast.error('Title and content are required');
      return;
    }

    const expiresAt = isPinned ? undefined : Date.now() + (7 * 24 * 60 * 60 * 1000);
    createCommunityAnnouncement(announcementTitle, announcementContent, isPinned, expiresAt);
    
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setIsPinned(false);
    setShowAnnouncementForm(false);
  };

  const handleMuteChannel = () => {
    const reason = prompt('Reason for muting the channel:');
    if (reason) {
      muteChannel(reason, muteDuration);
    }
  };

  const handleUnmuteChannel = () => {
    unmuteChannel();
  };

  const recentLogs = communityModerationLogs.slice(0, 20);
  const bannedMembers = memberStatuses.filter(m => m.isBanned);
  const warnedMembers = memberStatuses.filter(m => m.warnings.length > 0 && !m.isBanned);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass p-6 space-y-6 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-white">Community Moderation</h2>
        </div>
        <div className="flex items-center space-x-2 bg-primary/20 px-3 py-1 rounded-full">
          <span className="text-xs text-primary font-medium">+100 VOICE per action</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        {(['actions', 'announcements', 'logs', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'actions' && 'Actions'}
            {tab === 'announcements' && 'Announcements'}
            {tab === 'logs' && 'Logs'}
            {tab === 'members' && 'Members'}
          </button>
        ))}
      </div>

      {/* Channel Status */}
      <div className="bg-surface/50 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {channelMuteStatus.isMuted ? (
                <>
                  <VolumeX className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Channel Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Channel Open</span>
                </>
              )}
            </div>
            {channelMuteStatus.isMuted && channelMuteStatus.mutedUntil && (
              <span className="text-xs text-gray-400">
                Until {new Date(channelMuteStatus.mutedUntil).toLocaleString()}
              </span>
            )}
          </div>
          
          {channelMuteStatus.isMuted ? (
            <button
              onClick={handleUnmuteChannel}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors"
            >
              Unmute Channel
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="168"
                value={muteDuration}
                onChange={(e) => setMuteDuration(Number(e.target.value))}
                className="w-16 bg-surface border border-white/10 rounded px-2 py-1 text-sm text-white"
              />
              <span className="text-xs text-gray-400">hours</span>
              <button
                onClick={handleMuteChannel}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors"
              >
                Mute Channel
              </button>
            </div>
          )}
        </div>
        
        {channelMuteStatus.reason && (
          <p className="text-xs text-gray-400 mt-2">
            Reason: {channelMuteStatus.reason}
          </p>
        )}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'actions' && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <button
                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                className="flex items-center space-x-3 bg-primary/10 hover:bg-primary/20 rounded-lg p-4 text-left transition-colors"
              >
                <Megaphone className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-white">Create Announcement</p>
                  <p className="text-xs text-gray-400">Pin important community updates</p>
                </div>
              </button>
            </div>

            {showAnnouncementForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-surface/50 border border-white/10 rounded-lg p-4 space-y-4"
              >
                <h3 className="text-lg font-semibold text-white mb-4">New Announcement</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Announcement title..."
                    className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    placeholder="Announcement content..."
                    className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors resize-none"
                    rows={4}
                    maxLength={500}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded border-white/10 bg-surface text-primary focus:ring-primary"
                    />
                    <span>Pin to top</span>
                  </label>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowAnnouncementForm(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAnnouncement}
                      disabled={!announcementTitle.trim() || !announcementContent.trim()}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-black font-medium transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'announcements' && (
          <motion.div
            key="announcements"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {communityAnnouncements.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No announcements yet</p>
                <p className="text-sm">Create the first community announcement!</p>
              </div>
            ) : (
              communityAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`bg-surface/50 border border-white/10 rounded-lg p-4 ${
                    announcement.isPinned ? 'border-orange-500/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {announcement.isPinned && (
                        <div className="flex items-center space-x-1 text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded-full">
                          <Pin className="w-3 h-3" />
                          <span>Pinned</span>
                        </div>
                      )}
                      <h3 className="font-semibold text-white">{announcement.title}</h3>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTimeAgo(announcement.createdAt)}
                    </div>
                  </div>
                  <p className="text-gray-200 mb-2">{announcement.content}</p>
                  <div className="text-xs text-gray-400">
                    By {announcement.createdBy} • {announcement.expiresAt ? `Expires ${new Date(announcement.expiresAt).toLocaleDateString()}` : 'Permanent'}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 max-h-96 overflow-y-auto"
          >
            {recentLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No moderation actions yet</p>
                <p className="text-sm">Community moderation logs will appear here</p>
              </div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-surface/50 border border-white/10 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        log.actionType.includes('pin') ? 'bg-orange-500/20 text-orange-400' :
                        log.actionType.includes('delete') ? 'bg-red-500/20 text-red-400' :
                        log.actionType.includes('ban') ? 'bg-red-500/20 text-red-400' :
                        log.actionType.includes('warn') ? 'bg-yellow-500/20 text-yellow-400' :
                        log.actionType.includes('mute') ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {log.actionType.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-200 mb-1">{log.description}</p>
                  <div className="text-xs text-gray-400">
                    By {log.moderatorId}
                    {log.metadata.reason && ` • Reason: ${log.metadata.reason}`}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <div className="bg-surface/50 border border-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center space-x-2">
                  <Ban className="w-4 h-4 text-red-400" />
                  Banned Members ({bannedMembers.length})
                </h3>
                {bannedMembers.length === 0 ? (
                  <p className="text-sm text-gray-400">No banned members</p>
                ) : (
                  <div className="space-y-2">
                    {bannedMembers.map((member) => (
                      <div key={member.studentId} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-white">{member.studentId}</span>
                          <span className="text-gray-400 ml-2">{member.banReason}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {member.bannedUntil ? `Until ${new Date(member.bannedUntil).toLocaleString()}` : 'Permanent'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface/50 border border-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Warned Members ({warnedMembers.length})
                </h3>
                {warnedMembers.length === 0 ? (
                  <p className="text-sm text-gray-400">No warned members</p>
                ) : (
                  <div className="space-y-2">
                    {warnedMembers.map((member) => (
                      <div key={member.studentId} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white">{member.studentId}</span>
                          <span className="text-xs text-gray-400">
                            {member.warnings.length} warning{member.warnings.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {member.warnings.slice(-3).map((warning) => (
                            <div key={warning.id} className="text-xs text-gray-400 bg-black/30 rounded p-2">
                              {warning.reason} • {formatTimeAgo(warning.timestamp)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}