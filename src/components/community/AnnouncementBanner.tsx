import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone, Pin, Clock } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatTimeAgo, formatTimeRemaining } from '../../lib/utils';

export default function AnnouncementBanner() {
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
  const { communityAnnouncements } = useStore();

  // Filter out expired announcements
  const validAnnouncements = communityAnnouncements.filter(announcement => 
    !announcement.expiresAt || announcement.expiresAt > Date.now()
  );

  // Sort pinned announcements first, then by creation date
  const sortedAnnouncements = [...validAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  // Show only the most recent unpinned announcement and pinned announcements
  const displayAnnouncements = sortedAnnouncements.filter((announcement, index) => 
    announcement.isPinned || index === 0
  );

  const dismissAnnouncement = (announcementId: string) => {
    setDismissedAnnouncements((prev) => new Set([...prev, announcementId]));
  };

  const isAnnouncementDismissed = (announcementId: string) => dismissedAnnouncements.has(announcementId);

  if (displayAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {displayAnnouncements.map((announcement) => {
          const isExpired = announcement.expiresAt && announcement.expiresAt <= Date.now();
          const dismissed = isAnnouncementDismissed(announcement.id);
          
          if (isExpired || dismissed) {
            return null;
          }

          return (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`relative bg-gradient-to-r ${
                announcement.isPinned 
                  ? 'from-orange-500/20 via-orange-600/10 to-orange-700/5 border-orange-500/30' 
                  : 'from-blue-500/20 via-blue-600/10 to-blue-700/5 border-blue-500/30'
              } border rounded-xl p-4 shadow-lg`}
            >
              {/* Close button */}
              <button
                onClick={() => dismissAnnouncement(announcement.id)}
                className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>

              {/* Pinned indicator */}
              {announcement.isPinned && (
                <div className="absolute top-2 left-2 flex items-center space-x-1 text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded-full">
                  <Pin className="w-3 h-3" />
                  <span>Pinned</span>
                </div>
              )}

              {/* Expiry indicator */}
              {announcement.expiresAt && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatTimeRemaining(announcement.expiresAt)}
                </div>
              )}

              {/* Content */}
              <div className="flex items-start space-x-3 mb-3">
                <Megaphone className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-2 pr-8">{announcement.title}</h3>
                  <p className="text-gray-200 text-sm leading-relaxed">{announcement.content}</p>
                </div>
              </div>

              {/* Meta information */}
              <div className="text-xs text-gray-400 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span>By {announcement.createdBy}</span>
                  <span>{formatTimeAgo(announcement.createdAt)}</span>
                </div>
                {announcement.expiresAt && (
                  <div className="mt-1">
                    Expires {new Date(announcement.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}