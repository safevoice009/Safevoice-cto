import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Mail, AlertCircle } from 'lucide-react';
import { useStore } from '../../lib/store';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  const {
    communities,
    communityChannels,
    communityMemberships,
    communityNotifications,
    studentId,
    toggleCommunityNotification,
    toggleChannelNotification,
  } = useStore();

  const [expandedCommunity, setExpandedCommunity] = useState<string | null>(null);

  const joinedCommunities = communities.filter((community) =>
    communityMemberships.some(
      (m) => m.communityId === community.id && m.studentId === studentId && m.isActive
    )
  );

  const getNotificationSettings = (communityId: string) => {
    return communityNotifications[communityId] ?? {
      communityId,
      studentId,
      notifyOnPost: false,
      notifyOnMention: true,
      notifyOnReply: true,
      muteAll: false,
      channelOverrides: {},
      updatedAt: Date.now(),
    };
  };

  const getCommunityChannels = (communityId: string) => {
    return communityChannels.filter((ch) => ch.communityId === communityId);
  };

  const isChannelMuted = (communityId: string, channelId: string) => {
    const settings = getNotificationSettings(communityId);
    return settings.channelOverrides[channelId] ?? false;
  };

  const handleToggleCommunity = (communityId: string) => {
    setExpandedCommunity(expandedCommunity === communityId ? null : communityId);
  };

  const handleToggleNotification = (
    communityId: string,
    setting: 'notifyOnPost' | 'notifyOnMention' | 'notifyOnReply' | 'muteAll'
  ) => {
    toggleCommunityNotification(communityId, setting);
  };

  const handleToggleChannel = (communityId: string, channelId: string) => {
    toggleChannelNotification(communityId, channelId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-sm"
            role="dialog"
            aria-labelledby="notification-preferences-title"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 id="notification-preferences-title" className="text-2xl font-bold text-white">
                  Notification Preferences
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Manage your notification settings for communities and channels
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-2">
              {joinedCommunities.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-8 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-500" />
                  <p className="mt-3 text-sm text-gray-400">
                    You haven't joined any communities yet. Join communities to manage their notifications.
                  </p>
                </div>
              ) : (
                joinedCommunities.map((community) => {
                  const settings = getNotificationSettings(community.id);
                  const channels = getCommunityChannels(community.id);
                  const isExpanded = expandedCommunity === community.id;

                  return (
                    <div
                      key={community.id}
                      className="rounded-xl border border-white/5 bg-white/5 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleCommunity(community.id)}
                          className="flex flex-1 items-start gap-3 text-left"
                        >
                          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-white">
                            {community.shortCode.substring(0, 2)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{community.name}</h3>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {community.city}, {community.state}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleNotification(community.id, 'muteAll')}
                            className={`rounded-lg p-2 transition-colors ${
                              settings.muteAll
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-primary/20 text-primary hover:bg-primary/30'
                            }`}
                            title={settings.muteAll ? 'Unmute community' : 'Mute community'}
                          >
                            {settings.muteAll ? (
                              <BellOff className="h-4 w-4" />
                            ) : (
                              <Bell className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-3 border-t border-white/10 pt-4"
                        >
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Community Notifications
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                                <span className="text-sm text-white">New Posts</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleNotification(community.id, 'notifyOnPost')}
                                  disabled={settings.muteAll}
                                  className={`flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                                    settings.notifyOnPost && !settings.muteAll
                                      ? 'bg-primary'
                                      : 'bg-white/10'
                                  }`}
                                  aria-label={`Toggle post notifications for ${community.name}`}
                                >
                                  <div
                                    className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                      settings.notifyOnPost && !settings.muteAll
                                        ? 'translate-x-[18px]'
                                        : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                              <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                                <span className="text-sm text-white">Mentions</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleNotification(community.id, 'notifyOnMention')}
                                  disabled={settings.muteAll}
                                  className={`flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                                    settings.notifyOnMention && !settings.muteAll
                                      ? 'bg-primary'
                                      : 'bg-white/10'
                                  }`}
                                  aria-label={`Toggle mention notifications for ${community.name}`}
                                >
                                  <div
                                    className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                      settings.notifyOnMention && !settings.muteAll
                                        ? 'translate-x-[18px]'
                                        : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                              <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                                <span className="text-sm text-white">Replies</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleNotification(community.id, 'notifyOnReply')}
                                  disabled={settings.muteAll}
                                  className={`flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                                    settings.notifyOnReply && !settings.muteAll
                                      ? 'bg-primary'
                                      : 'bg-white/10'
                                  }`}
                                  aria-label={`Toggle reply notifications for ${community.name}`}
                                >
                                  <div
                                    className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                      settings.notifyOnReply && !settings.muteAll
                                        ? 'translate-x-[18px]'
                                        : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>

                          {channels.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Channel Notifications
                              </p>
                              <div className="space-y-1.5">
                                {channels.map((channel) => {
                                  const isMuted = isChannelMuted(community.id, channel.id);
                                  return (
                                    <div
                                      key={channel.id}
                                      className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{channel.icon}</span>
                                        <span className="text-sm text-white">{channel.name}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleChannel(community.id, channel.id)}
                                        className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                                          isMuted ? 'bg-primary' : 'bg-white/10'
                                        }`}
                                        aria-label={`${isMuted ? 'Unmute' : 'Mute'} ${channel.name} channel`}
                                      >
                                        <div
                                          className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                            isMuted ? 'translate-x-[18px]' : 'translate-x-1'
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Email Digest Section - Coming Soon */}
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 opacity-60">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">Email Digest</h3>
                      <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                        Coming Soon
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Receive a daily or weekly digest of activity in your communities
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="flex h-5 w-9 items-center rounded-full bg-white/10 opacity-50"
                    aria-label="Email digest (coming soon)"
                  >
                    <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-blue-400" />
                  <p className="text-xs text-blue-300">
                    Muting a community or channel will stop new post notifications. You'll still receive
                    notifications for mentions and replies unless the community is fully muted.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary/80"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
