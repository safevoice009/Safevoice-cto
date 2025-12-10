import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User, Store, Users, Trophy, Settings, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRef, useEffect, useState } from 'react';
import { useStudentVerificationStore } from '../../lib/identity/studentVerificationState';

const navItems = [
  { labelKey: 'nav.home', icon: Home, to: '/' },
  { labelKey: 'nav.feed', icon: MessageCircle, to: '/feed' },
  { labelKey: 'nav.communities', icon: Users, to: '/communities' },
  { labelKey: 'nav.verification', icon: ShieldCheck, to: '/verification' },
  { labelKey: 'nav.leaders', icon: Trophy, to: '/leaderboard' },
  { labelKey: 'nav.shop', icon: Store, to: '/marketplace' },
  { labelKey: 'nav.profile', icon: User, to: '/profile' },
  { labelKey: 'nav.customize', icon: Settings, to: '/settings/appearance' },
];

export default function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { verificationStatus, verificationReady } = useStudentVerificationStore((state) => ({
    verificationStatus: state.studentVerification,
    verificationReady: state.isInitialized,
  }));

  const verificationNeedsAttention = Boolean(verificationReady && verificationStatus && !verificationStatus.isVerified);
  const verificationBadgeText = verificationStatus?.needsReverification
    ? t('verification.status.reverify')
    : t('verification.status.pending');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 tablet:hidden z-40 safe-area-bottom"
      role="navigation"
      aria-label={t('nav.bottomNavigation')}
    >
      <div className="relative w-full">
        {/* Left fade gradient */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface to-transparent pointer-events-none z-10" />
        )}

        {/* Scroll container with single-row grid */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="glass overflow-x-auto overflow-y-hidden px-2 py-2 scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="grid gap-1 px-1" style={{ gridAutoFlow: 'column', gridAutoColumns: 'minmax(auto, 1fr)' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              const Icon = item.icon;
              const showVerificationBadge = item.to === '/verification' && verificationNeedsAttention;
              const ariaLabel = showVerificationBadge
                ? `${t(item.labelKey)} - ${verificationBadgeText}`
                : t(item.labelKey);
              return (
                <Link 
                  key={item.labelKey} 
                  to={item.to} 
                  className="flex justify-center"
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={ariaLabel}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`relative flex flex-col items-center justify-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface whitespace-nowrap ${
                      isActive 
                        ? 'bg-gradient-to-br from-info/20 to-info/10 text-info shadow-md' 
                        : 'text-text-muted hover:bg-white/5 hover:text-text'
                    }`}
                    tabIndex={0}
                    role="button"
                  >
                    {showVerificationBadge && (
                      <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]">
                        <span className="sr-only">{verificationBadgeText}</span>
                      </span>
                    )}
                    <Icon className="w-5 h-5 mb-1 flex-shrink-0" />
                    <span className="block text-caption">{t(item.labelKey)}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right fade gradient */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent pointer-events-none z-10" />
        )}
      </div>
    </nav>
  );
}
