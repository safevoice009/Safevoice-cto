import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Shield, Mic, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingBanner() {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('safevoice_mentor_banner_dismissed') === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('safevoice_mentor_banner_dismissed', 'true');
    }
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 mb-6 relative overflow-hidden"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to Mentor Discovery 🎯
            </h2>
            <p className="text-white/90 mb-4">
              Find peer mentors who understand your challenges. All conversations are
              protected with privacy features including fingerprint protection and anonymous voice chat.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link
                to="/settings/appearance"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Privacy Settings
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link
                to="/feed"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                <Mic className="w-4 h-4" />
                Voice Features
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-xl">
              <Shield className="w-8 h-8 text-white mb-1" />
              <span className="text-xs text-white/80">Private</span>
            </div>
            
            <div className="flex flex-col items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-xl">
              <Mic className="w-8 h-8 text-white mb-1" />
              <span className="text-xs text-white/80">Voice</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
