import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import FontSwitcher from './FontSwitcher';
import NotificationDropdown from './NotificationDropdown';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import type { NavigationItem } from './navigationConfig';
import { getMatchStrategy } from './navigationConfig';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: () => void;
  items: NavigationItem[];
  isModerator: boolean;
  toggleModeratorMode: () => void;
  openCrisisModal: () => void;
  studentId?: string;
  drawerId: string;
}

export default function NavigationDrawer({
  isOpen,
  onClose,
  onNavigate,
  items,
  isModerator,
  toggleModeratorMode,
  openCrisisModal,
  studentId,
  drawerId,
}: NavigationDrawerProps) {
  const { t } = useTranslation();

  const handleNavigate = () => {
    onNavigate?.();
  };

  const handleCrisisClick = () => {
    openCrisisModal();
    onClose();
  };

  const handleModeratorToggle = () => {
    toggleModeratorMode();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.mainNavigation')}
            className="ml-auto flex h-full w-full max-w-sm flex-col bg-surface/95 text-white shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-text-muted">{t('common.appName')}</p>
                <p className="text-lg font-semibold">{t('nav.mainNavigation')}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={t('nav.closeMenu')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap gap-3">
                <LanguageSwitcher />
                <ThemeSwitcher />
                <FontSwitcher />
              </div>

              <nav role="navigation" aria-label={t('nav.mainNavigation')} className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      end={getMatchStrategy(item) === 'exact'}
                      onClick={handleNavigate}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-xl px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/70 ${
                          isActive ? 'bg-primary/20 text-primary' : 'text-text-muted hover:bg-white/5'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                isActive ? 'bg-primary/30 text-primary' : 'bg-white/5 text-text-muted'
                              }`}
                              aria-hidden="true"
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="text-base font-medium">{t(item.labelKey)}</span>
                          </div>
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </nav>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <motion.button
                  type="button"
                  onClick={handleCrisisClick}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  <span>{t('nav.crisisHelp')}</span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleModeratorToggle}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition ${
                    isModerator ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  title={t(isModerator ? 'moderator.modeOn' : 'moderator.modeOff')}
                >
                  <Shield className="h-5 w-5" aria-hidden="true" />
                  <span>{t(isModerator ? 'moderator.disable' : 'moderator.enable')}</span>
                </motion.button>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 px-5 py-4">
              <NotificationDropdown />
              {studentId && <div className="text-sm font-medium text-text-muted">{studentId}</div>}
              <div className="flex justify-start">
                <ConnectWalletButton />
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
