import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User, Store, Users, Trophy, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const navItems = [
  { labelKey: 'nav.home', icon: Home, to: '/' },
  { labelKey: 'nav.feed', icon: MessageCircle, to: '/feed' },
  { labelKey: 'nav.communities', icon: Users, to: '/communities' },
  { labelKey: 'nav.leaders', icon: Trophy, to: '/leaderboard' },
  { labelKey: 'nav.shop', icon: Store, to: '/marketplace' },
  { labelKey: 'nav.profile', icon: User, to: '/profile' },
  { labelKey: 'nav.customize', icon: Settings, to: '/settings/appearance' },
];

export default function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav 
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-lg md:hidden safe-area-inset"
      role="navigation"
      aria-label={t('nav.bottomNavigation')}
    >
      <div className="glass flex flex-wrap justify-between gap-4 py-3 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link 
              key={item.labelKey} 
              to={item.to} 
              className="flex-1 min-w-[88px] flex justify-center"
              aria-current={isActive ? 'page' : undefined}
            >
              <motion.div
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center space-y-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isActive ? 'bg-info/10 text-info' : 'text-text-muted'
                }`}
                tabIndex={0}
                role="button"
              >
                <Icon className="w-5 h-5" />
                <span>{t(item.labelKey)}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
