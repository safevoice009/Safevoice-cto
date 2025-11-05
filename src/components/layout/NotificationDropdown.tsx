import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, MailOpen, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { formatTimeAgo, getStudentIdColor } from '../../lib/utils';
import NotificationPreferencesModal from '../community/NotificationPreferencesModal';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useStore();
  const navigate = useNavigate();

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const handleNotificationClick = (notificationId: string, postId: string) => {
    markAsRead(notificationId);
    navigate(`/post/${postId}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleDropdown}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-300" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-80 glass p-4 space-y-3 text-sm z-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Notifications</p>
                <p className="text-xs text-gray-400">Stay updated with your community</p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-1 text-xs text-primary hover:text-white transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark all</span>
                </button>
              )}
            </div>

            <div className="border-t border-white/10 pt-3 space-y-2 max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-2">
                  <MailOpen className="w-6 h-6" />
                  <span className="text-xs">No notifications yet</span>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id, notification.postId)}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-white/10 ${
                      notification.read ? 'border-transparent text-gray-300' : 'border-primary/30 bg-primary/10 text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getStudentIdColor(
                          notification.actorId
                        )} flex items-center justify-center text-xs font-bold`}
                      >
                        {notification.actorId.slice(-4)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{notification.actorId}</span> {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</p>
                      </div>
                      {!notification.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-gray-400">
              <button className="hover:text-primary transition-colors">View All</button>
              <button
                className="flex items-center gap-1 hover:text-primary transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  setIsPrefsOpen(true);
                }}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Preferences</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationPreferencesModal isOpen={isPrefsOpen} onClose={() => setIsPrefsOpen(false)} />
    </div>
  );
}
