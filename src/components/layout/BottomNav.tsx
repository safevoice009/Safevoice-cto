import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../lib/store';
import { getMatchStrategy, getNavigationItemsForSurface } from './navigationConfig';
import { useResponsiveLayoutContext } from '../responsive/ResponsiveLayoutContext';

export default function BottomNav() {
  const { t } = useTranslation();
  const isModerator = useStore((state) => state.isModerator);
  const { breakpoint } = useResponsiveLayoutContext();
  const isMobile = breakpoint === 'mobile';

  const navItems = useMemo(() => getNavigationItemsForSurface('bottom', { isModerator }), [isModerator]);

  if (!isMobile) {
    return null;
  }

  return (
    <nav
      className="safe-area-inset fixed bottom-4 left-1/2 w-[90%] max-w-lg -translate-x-1/2 md:hidden"
      role="navigation"
      aria-label={t('nav.bottomNavigation')}
    >
      <div className="glass flex flex-wrap justify-between gap-4 px-4 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={getMatchStrategy(item) === 'exact'}
              className="flex min-w-[88px] flex-1 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={t(item.labelKey)}
            >
              {({ isActive }) => (
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center space-y-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isActive ? 'bg-info/10 text-info' : 'text-text-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
