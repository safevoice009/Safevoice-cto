/**
 * Navigation configuration for the top navbar
 * Organized into primary items, user menu, and more menu
 */

export type NavigationItemType = 'route' | 'action';

export interface NavigationItem {
  labelKey: string;
  value: string;
  icon?: string;
  type: NavigationItemType;
  requiredRole?: 'admin' | 'moderator';
}

export const PRIMARY_NAV_ITEMS: NavigationItem[] = [
  { labelKey: 'nav.feed', value: '/feed', type: 'route' },
  { labelKey: 'nav.communities', value: '/communities', type: 'route' },
  { labelKey: 'nav.search', value: '/search', type: 'route' },
  { labelKey: 'nav.verification', value: '/verification', type: 'route' },
];

export const USER_MENU_ITEMS: NavigationItem[] = [
  { labelKey: 'nav.profile', value: '/profile', type: 'route' },
  { labelKey: 'settings.title', value: '/settings/appearance', type: 'route' },
  { labelKey: 'nav.logout', value: 'logout', type: 'action' },
];

export const MORE_MENU_ITEMS: NavigationItem[] = [
  { labelKey: 'nav.admin', value: '/admin', type: 'route', requiredRole: 'admin' },
  { labelKey: 'nav.helplines', value: '/helplines', type: 'route' },
  { labelKey: 'nav.guidelines', value: '/guidelines', type: 'route' },
];

/**
 * All navigation items for mobile hamburger menu
 */
export const ALL_NAV_ITEMS: NavigationItem[] = [
  ...PRIMARY_NAV_ITEMS,
  { labelKey: 'nav.leaderboard', value: '/leaderboard', type: 'route' },
  { labelKey: 'nav.marketplace', value: '/marketplace', type: 'route' },
  { labelKey: 'nav.analytics', value: '/analytics', type: 'route' },
  { labelKey: 'nav.memorial', value: '/memorial', type: 'route' },
  { labelKey: 'nav.customize', value: '/settings/appearance', type: 'route' },
];
