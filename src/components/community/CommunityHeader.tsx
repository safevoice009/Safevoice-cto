import { useState } from 'react';
import { Settings, Bell, BellOff, LogOut, ExternalLink, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Community, CommunityNotificationSettings } from '../../lib/communities/types';
import { formatCount } from '../../lib/utils';

interface CommunityHeaderProps {
  community: Community;
  notificationSettings: CommunityNotificationSettings;
  onToggleNotification: (setting: 'notifyOnPost' | 'notifyOnMention' | 'notifyOnReply' | 'muteAll') => void;
  onLeaveCommunity: () => void;
  onViewGuidelines: () => void;
}

export default function CommunityHeader({
  community,
  notificationSettings,
  onToggleNotification,
  onLeaveCommunity,
  onViewGuidelines,
}: CommunityHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleToggle = (setting: 'notifyOnPost' | 'notifyOnMention' | 'notifyOnReply' | 'muteAll') => {
    onToggleNotification(setting);
  };

  return (
    <header className="rounded-2xl border border-white/5 bg-gradient-to-br from-primary/10 via-slate-900/70 to-slate-900/40 p-6 shadow-lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 flex-shrink-0">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-3xl font-bold text-white shadow-inner">
                {community.shortCode.substring(0, 2)}
              </div>
              {community.isVerified && (
                <div
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white shadow-lg"
                  title="Verified campus community"
                >
                  <span className="text-xs font-bold">✓</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{community.name}</h1>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                {community.city}, {community.state} • {community.country}
              </p>
              <p className="mt-2 text-sm text-gray-300 line-clamp-2">{community.description}</p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              aria-label="Community settings"
              aria-expanded={isSettingsOpen}
            >
              <Settings className="h-4 w-4" aria-hidden />
              <span>Settings</span>
            </button>

            <AnimatePresence>
              {isSettingsOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl backdrop-blur-sm"
                  >
                    <div className="space-y-1">
                      <div className="px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Notifications
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggle('muteAll')}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5"
                      >
                        <div className="flex items-center gap-2">
                          {notificationSettings.muteAll ? (
                            <BellOff className="h-4 w-4 text-gray-400" aria-hidden />
                          ) : (
                            <Bell className="h-4 w-4 text-gray-400" aria-hidden />
                          )}
                          <span className="text-white">Mute Community</span>
                        </div>
                        <div
                          className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                            notificationSettings.muteAll ? 'bg-primary' : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                              notificationSettings.muteAll ? 'translate-x-[18px]' : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle('notifyOnPost')}
                        disabled={notificationSettings.muteAll}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
                      >
                        <span className="text-white">New Posts</span>
                        <div
                          className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                            notificationSettings.notifyOnPost && !notificationSettings.muteAll
                              ? 'bg-primary'
                              : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                              notificationSettings.notifyOnPost && !notificationSettings.muteAll
                                ? 'translate-x-[18px]'
                                : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle('notifyOnMention')}
                        disabled={notificationSettings.muteAll}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
                      >
                        <span className="text-white">Mentions</span>
                        <div
                          className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                            notificationSettings.notifyOnMention && !notificationSettings.muteAll
                              ? 'bg-primary'
                              : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                              notificationSettings.notifyOnMention && !notificationSettings.muteAll
                                ? 'translate-x-[18px]'
                                : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle('notifyOnReply')}
                        disabled={notificationSettings.muteAll}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
                      >
                        <span className="text-white">Replies</span>
                        <div
                          className={`flex h-5 w-9 items-center rounded-full transition-colors ${
                            notificationSettings.notifyOnReply && !notificationSettings.muteAll
                              ? 'bg-primary'
                              : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                              notificationSettings.notifyOnReply && !notificationSettings.muteAll
                                ? 'translate-x-[18px]'
                                : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      <button
                        type="button"
                        onClick={onLeaveCommunity}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" aria-hidden />
                        <span>Leave Community</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            <span className="font-semibold text-white">{formatCount(community.memberCount)}</span>
            <span>members</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
            <span className="font-semibold text-white">{formatCount(community.postCount)}</span>
            <span>posts</span>
          </div>
          <button
            type="button"
            onClick={onViewGuidelines}
            className="ml-auto flex items-center gap-1.5 text-primary hover:underline"
          >
            <span>View Guidelines</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {community.rules.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Community Rules
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-300">
              {community.rules.slice(0, 3).map((rule, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 text-primary">•</span>
                  <span className="line-clamp-1">{rule}</span>
                </li>
              ))}
            </ul>
            {community.rules.length > 3 && (
              <button
                type="button"
                onClick={onViewGuidelines}
                className="mt-2 text-xs text-primary hover:underline"
              >
                +{community.rules.length - 3} more rules
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
