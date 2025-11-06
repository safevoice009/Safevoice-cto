import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User, Store, Users, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const navItems = [
  { labelKey: 'nav.home', icon: Home, to: '/' },
  { labelKey: 'nav.feed', icon: MessageCircle, to: '/feed' },
  { labelKey: 'nav.communities', icon: Users, to: '/communities' },
  { labelKey: 'nav.leaders', icon: Trophy, to: '/leaderboard' },
  { labelKey: 'nav.shop', icon: Store, to: '/marketplace' },
  { labelKey: 'nav.profile', icon: User, to: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md md:hidden">
      <div className="glass flex justify-around py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link key={item.labelKey} to={item.to} className="flex flex-col items-center text-sm">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center space-y-1 ${isActive ? 'text-primary' : 'text-gray-300'}`}
              >
                <Icon className="w-6 h-6" />
                <span>{t(item.labelKey)}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
