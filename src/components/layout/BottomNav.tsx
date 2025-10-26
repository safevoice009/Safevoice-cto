import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Home', icon: Home, to: '/' },
  { name: 'Feed', icon: MessageCircle, to: '/feed' },
  { name: 'Profile', icon: User, to: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md md:hidden">
      <div className="glass flex justify-around py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link key={item.name} to={item.to} className="flex flex-col items-center text-sm">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center space-y-1 ${isActive ? 'text-primary' : 'text-gray-300'}`}
              >
                <Icon className="w-6 h-6" />
                <span>{item.name}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
