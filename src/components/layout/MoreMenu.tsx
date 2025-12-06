import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Shield, HelpCircle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../lib/store';

const menuIconMap: Record<string, React.ReactNode> = {
  admin: <Shield className="w-4 h-4" />,
  helplines: <HelpCircle className="w-4 h-4" />,
  guidelines: <BookOpen className="w-4 h-4" />,
};

export default function MoreMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();
  const { isModerator } = useStore();

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

  const menuItems = [
    ...(isModerator ? [{ labelKey: 'nav.admin', path: '/admin', key: 'admin' }] : []),
    { labelKey: 'nav.helplines', path: '/helplines', key: 'helplines' },
    { labelKey: 'nav.guidelines', path: '/guidelines', key: 'guidelines' },
  ];

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-text hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('nav.more')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-sm font-medium">{t('nav.more')}</span>
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
            {menuItems.map((item, index) => (
              <Link
                key={item.key}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-text hover:bg-white/10 transition-colors ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${index === menuItems.length - 1 ? 'rounded-b-lg' : 'border-b border-white/5'}`}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                {menuIconMap[item.key] || null}
                <span className="text-sm font-medium">{t(item.labelKey)}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
