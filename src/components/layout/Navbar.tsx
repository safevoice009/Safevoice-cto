import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AlertTriangle, Lock, Menu, Shield, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../lib/store';
import NotificationDropdown from './NotificationDropdown';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import FontSwitcher from './FontSwitcher';
import NavigationDrawer from './NavigationDrawer';
import { getMatchStrategy, getNavigationItemsForSurface } from './navigationConfig';
import { useResponsiveLayoutContext } from '../responsive/ResponsiveLayoutContext';

const DRAWER_ID = 'navigation-drawer';

export default function Navbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();
  const { studentId, isModerator, toggleModeratorMode, setShowCrisisModal } = useStore();
  const location = useLocation();
  const { breakpoint } = useResponsiveLayoutContext();
  const isDesktop = breakpoint === 'desktop';

  const inlineNavItems = useMemo(
    () => getNavigationItemsForSurface('desktop', { isModerator }),
    [isModerator]
  );
  const drawerNavItems = useMemo(
    () => getNavigationItemsForSurface('drawer', { isModerator }),
    [isModerator]
  );

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

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    if (isDrawerOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsDrawerOpen((prev) => !prev);
    } else if (event.key === 'Escape' && isDrawerOpen) {
      setIsDrawerOpen(false);
      menuButtonRef.current?.focus();
    }
  };

  const closeDrawer = () => setIsDrawerOpen(false);
  const closeDrawerAndFocusTrigger = () => {
    setIsDrawerOpen(false);
    menuButtonRef.current?.focus();
  };

  const openCrisisModal = () => setShowCrisisModal(true);

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.3 }}
      className="glass fixed left-0 right-0 top-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2" onClick={closeDrawer}>
            <Lock className="h-6 w-6 text-info" />
            <span className="text-xl font-bold text-white">{t('common.appName')}</span>
          </Link>

          {isDesktop && (
            <div className="hidden flex-1 items-center justify-center gap-6 xl:gap-8 lg:flex">
              {inlineNavItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={getMatchStrategy(item) === 'exact'}
                  className="nav-link relative rounded-md px-2 py-1 text-sm font-medium text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-info font-semibold' : ''}>{t(item.labelKey)}</span>
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}

          {isDesktop && (
            <div className="hidden items-center gap-3 xl:gap-4 lg:flex">
              <div className="hidden items-center gap-3 xl:flex">
                <LanguageSwitcher />
                <ThemeSwitcher />
                <FontSwitcher />
              </div>
              <NotificationDropdown />
              <motion.button
                onClick={openCrisisModal}
                className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-all hover:bg-red-700"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={t('nav.getCrisisHelp')}
                type="button"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>{t('nav.crisisHelp')}</span>
              </motion.button>
              <motion.button
                onClick={toggleModeratorMode}
                className={`flex items-center space-x-1 rounded-lg px-3 py-2 font-medium transition-all ${
                  isModerator ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={t(isModerator ? 'moderator.modeOn' : 'moderator.modeOff')}
                type="button"
              >
                <Shield className="h-4 w-4" />
                {isModerator && <span className="text-xs">MOD</span>}
              </motion.button>
              {isModerator && (
                <Link
                  to="/admin"
                  className="flex items-center space-x-2 rounded-lg bg-primary px-3 py-2 font-medium text-black transition-all hover:bg-primary/90"
                  title={t('nav.admin')}
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">{t('nav.admin')}</span>
                </Link>
              )}
              <span className="font-medium text-text-muted">{studentId}</span>
              <ConnectWalletButton />
            </div>
          )}

          <button
            ref={menuButtonRef}
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            onKeyDown={handleMenuKeyDown}
            className="rounded-md p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-expanded={isDrawerOpen}
            aria-controls={DRAWER_ID}
            aria-label={isDrawerOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            type="button"
          >
            {isDrawerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawerAndFocusTrigger}
        onNavigate={closeDrawer}
        items={drawerNavItems}
        isModerator={isModerator}
        toggleModeratorMode={toggleModeratorMode}
        openCrisisModal={openCrisisModal}
        studentId={studentId}
        drawerId={DRAWER_ID}
      />
    </motion.nav>
  );
}
