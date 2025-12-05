import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Flame,
  Home,
  LifeBuoy,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Trophy,
  User,
  Users,
} from 'lucide-react';

export type NavigationSurface = 'desktop' | 'bottom' | 'drawer';
export type MatchStrategy = 'exact' | 'startsWith';

export interface NavigationItem {
  id: string;
  labelKey: string;
  path: string;
  icon: LucideIcon;
  matchStrategy?: MatchStrategy;
  surfaces: Partial<Record<NavigationSurface, boolean>>;
  requiresModerator?: boolean;
}

const DEFAULT_MATCH_STRATEGY: MatchStrategy = 'startsWith';

export const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    labelKey: 'nav.home',
    path: '/',
    icon: Home,
    matchStrategy: 'exact',
    surfaces: { bottom: true, drawer: true },
  },
  {
    id: 'feed',
    labelKey: 'nav.feed',
    path: '/feed',
    icon: MessageCircle,
    surfaces: { desktop: true, bottom: true, drawer: true },
  },
  {
    id: 'communities',
    labelKey: 'nav.communities',
    path: '/communities',
    icon: Users,
    surfaces: { desktop: true, bottom: true, drawer: true },
  },
  {
    id: 'search',
    labelKey: 'nav.search',
    path: '/search',
    icon: Search,
    surfaces: { desktop: true, drawer: true },
  },
  {
    id: 'leaderboard',
    labelKey: 'nav.leaderboard',
    path: '/leaderboard',
    icon: Trophy,
    surfaces: { desktop: true, bottom: true, drawer: true },
  },
  {
    id: 'marketplace',
    labelKey: 'nav.marketplace',
    path: '/marketplace',
    icon: Store,
    surfaces: { desktop: true, bottom: true, drawer: true },
  },
  {
    id: 'analytics',
    labelKey: 'nav.analytics',
    path: '/analytics',
    icon: BarChart3,
    surfaces: { desktop: true, drawer: true },
  },
  {
    id: 'helplines',
    labelKey: 'nav.helplines',
    path: '/helplines',
    icon: LifeBuoy,
    surfaces: { desktop: true, drawer: true },
  },
  {
    id: 'guidelines',
    labelKey: 'nav.guidelines',
    path: '/guidelines',
    icon: BookOpen,
    surfaces: { desktop: true, drawer: true },
  },
  {
    id: 'memorial',
    labelKey: 'nav.memorial',
    path: '/memorial',
    icon: Flame,
    surfaces: { desktop: true, drawer: true },
  },
  {
    id: 'profile',
    labelKey: 'nav.profile',
    path: '/profile',
    icon: User,
    surfaces: { bottom: true, drawer: true },
  },
  {
    id: 'customize',
    labelKey: 'nav.customize',
    path: '/settings/appearance',
    icon: Settings,
    surfaces: { desktop: true, bottom: true, drawer: true },
  },
  {
    id: 'admin',
    labelKey: 'nav.admin',
    path: '/admin',
    icon: ShieldCheck,
    surfaces: { drawer: true },
    requiresModerator: true,
  },
];

export function getNavigationItemsForSurface(
  surface: NavigationSurface,
  options: { isModerator?: boolean } = {}
) {
  const { isModerator } = options;
  return navigationItems.filter((item) => {
    if (!item.surfaces[surface]) return false;
    if (item.requiresModerator) {
      return Boolean(isModerator);
    }
    return true;
  });
}

export function getMatchStrategy(item: NavigationItem): MatchStrategy {
  return item.matchStrategy ?? DEFAULT_MATCH_STRATEGY;
}

export function isNavigationItemActive(pathname: string, item: NavigationItem) {
  const strategy = getMatchStrategy(item);
  if (strategy === 'exact') {
    return pathname === item.path;
  }

  if (item.path === '/') {
    return pathname === '/';
  }

  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}
