import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../lib/store';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();
  const { studentId } = useStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-text hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('nav.userMenu')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <User className="w-4 h-4" />
        <span className="text-xs font-medium truncate max-w-[60px]">{studentId}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-surface/95 backdrop-blur-xl shadow-lg z-50"
            role="menu"
            aria-orientation="vertical"
          >
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 text-text hover:bg-white/10 transition-colors first:rounded-t-lg"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{t('nav.profile')}</span>
            </Link>

            <Link
              to="/settings/appearance"
              className="flex items-center gap-3 px-4 py-3 text-text hover:bg-white/10 transition-colors border-t border-white/5"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">{t('settings.title')}</span>
            </Link>

            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-text hover:bg-red-500/10 transition-colors border-t border-white/5 rounded-b-lg text-left"
              role="menuitem"
              onClick={() => {
                // Handle logout - can be integrated with store
                setIsOpen(false);
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">{t('nav.logout')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
