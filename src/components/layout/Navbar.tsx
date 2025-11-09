import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, Menu, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../lib/store';
import NotificationDropdown from './NotificationDropdown';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import FontSwitcher from './FontSwitcher';

type NavLink = {
  labelKey: string;
  value: string;
  type: 'route' | 'scroll';
};

const navLinks: NavLink[] = [
  { labelKey: 'nav.feed', value: '/feed', type: 'route' },
  { labelKey: 'nav.communities', value: '/communities', type: 'route' },
  { labelKey: 'nav.search', value: '/search', type: 'route' },
  { labelKey: 'nav.leaderboard', value: '/leaderboard', type: 'route' },
  { labelKey: 'nav.marketplace', value: '/marketplace', type: 'route' },
  { labelKey: 'nav.helplines', value: '/helplines', type: 'route' },
  { labelKey: 'nav.guidelines', value: '/guidelines', type: 'route' },
  { labelKey: 'nav.memorial', value: '/memorial', type: 'route' },
  { labelKey: 'nav.customize', value: '/settings/appearance', type: 'route' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const { t } = useTranslation();
  const { studentId, isModerator, toggleModeratorMode, setShowCrisisModal } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const controlNavbar = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScrollYRef.current && currentScroll > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollYRef.current = currentScroll;
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, []);

  const closeMenu = () => setIsOpen(false);

  const scrollToSection = useCallback((sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleNavClick = (link: NavLink) => {
    closeMenu();

    if (link.type === 'route') {
      navigate(link.value);
      return;
    }

    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: link.value } });
    } else {
      scrollToSection(link.value);
    }
  };

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
            <Lock className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-white">{t('common.appName')}</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isActive =
                link.type === 'route' && (location.pathname === link.value || location.pathname.startsWith(`${link.value}/`));
              return (
                <button
                  key={link.labelKey}
                  onClick={() => handleNavClick(link)}
                  className={`nav-link relative ${isActive ? 'text-primary font-semibold' : ''}`}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(link.labelKey)}
                  {isActive && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <FontSwitcher />
            <NotificationDropdown />
            <motion.button
              onClick={() => setShowCrisisModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium transition-all hover:bg-red-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={t('nav.getCrisisHelp')}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{t('nav.crisisHelp')}</span>
            </motion.button>
            <motion.button
              onClick={toggleModeratorMode}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg font-medium transition-all ${
                isModerator
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={t(isModerator ? 'moderator.modeOn' : 'moderator.modeOff')}
            >
              <Shield className="w-4 h-4" />
              {isModerator && <span className="text-xs">MOD</span>}
            </motion.button>
            <span className="text-primary font-medium">{studentId}</span>
            <ConnectWalletButton />
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface/95 backdrop-blur-xl border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              <div className="flex justify-end gap-2">
                <LanguageSwitcher />
                <ThemeSwitcher />
                <FontSwitcher />
              </div>
              {navLinks.map((link) => {
                const isActive =
                  link.type === 'route' && (location.pathname === link.value || location.pathname.startsWith(`${link.value}/`));
                return (
                  <button
                    key={link.labelKey}
                    onClick={() => handleNavClick(link)}
                    className={`block w-full text-left nav-link py-2 ${isActive ? 'text-primary font-semibold' : ''}`}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {t(link.labelKey)}
                  </button>
                );
              })}
              <motion.button
                onClick={() => {
                  setShowCrisisModal(true);
                  closeMenu();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={t('nav.getCrisisHelp')}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{t('nav.crisisHelp')}</span>
              </motion.button>
              <motion.button
                onClick={() => {
                  toggleModeratorMode();
                }}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isModerator ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={t(isModerator ? 'moderator.modeOn' : 'moderator.modeOff')}
              >
                <Shield className="w-4 h-4" />
                <span>{t(isModerator ? 'moderator.disable' : 'moderator.enable')}</span>
              </motion.button>
              <div className="pt-3 border-t border-white/10 space-y-3">
                <NotificationDropdown />
                <div className="text-primary font-medium">{studentId}</div>
                <div className="flex justify-start">
                  <ConnectWalletButton />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
