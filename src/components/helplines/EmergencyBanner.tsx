import { useState, useEffect } from 'react';
import { Phone, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'emergencyBannerDismissed';

export default function EmergencyBanner() {
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedUntil = parseInt(dismissed, 10);
      if (Date.now() < dismissedUntil) {
        setShowBanner(false);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const dismissBanner = () => {
    const dismissedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
    localStorage.setItem(STORAGE_KEY, dismissedUntil.toString());
    setShowBanner(false);
    toast('Banner dismissed for 5 minutes', { icon: '👋' });
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-16 left-0 right-0 z-40 emergency-banner"
        >
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
              <div className="flex items-center space-x-3 text-white font-semibold flex-shrink-0">
                <span className="text-lg sm:text-xl">🚨 Need immediate help? Call now →</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-1">
                <a
                  href="tel:+91-22-27546669"
                  className="flex items-center space-x-2 bg-white text-red-600 px-4 py-2 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <Phone className="w-5 h-5" />
                  <span>AASRA +91-22-27546669</span>
                </a>

                <button
                  disabled
                  className="flex items-center space-x-2 bg-gray-600 text-gray-400 px-4 py-2 rounded-xl font-medium cursor-not-allowed relative group"
                  title="Coming Soon"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat Support</span>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Coming Soon
                  </span>
                </button>
              </div>

              <button
                onClick={dismissBanner}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white flex-shrink-0"
                aria-label="Dismiss banner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
