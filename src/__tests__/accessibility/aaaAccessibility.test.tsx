import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import App from '../../App';
import Navbar from '../../components/layout/Navbar';
import CrisisAlertModal from '../../components/crisis/CrisisAlertModal';
import Feed from '../../pages/Feed';
import { renderWithProviders, runAxe, resetThemePreferences, setThemeMode, setFontProfile } from '../../test/accessibility';
import type { Post } from '../../lib/store';

vi.mock('framer-motion', () => {
  const proxy = new Proxy(
    {},
    {
      get: (_target, key: string) => {
        return ({ children, ...props }: { children?: React.ReactNode }) => React.createElement(key, props, children);
      },
    }
  );

  return {
    motion: proxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('wagmi', () => {
  const configureChains = vi.fn(() => ({
    chains: [],
    publicClient: {},
    webSocketPublicClient: {},
  }));
  const createConfig = vi.fn(() => ({}));

  return {
    useAccount: vi.fn(() => ({
      address: undefined,
      connector: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isReconnecting: false,
      status: 'disconnected',
    })),
    usePublicClient: vi.fn(() => null),
    useNetwork: vi.fn(() => ({ chain: { name: 'Ethereum', id: 1 } })),
    useEnsName: vi.fn(() => ({ data: null })),
    useSwitchNetwork: vi.fn(() => ({ switchNetwork: vi.fn(), isLoading: false, pendingChainId: null })),
    configureChains,
    createConfig,
    WagmiConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('wagmi/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum', rpcUrls: { default: { http: ['https://'] } }, blockExplorers: { default: { url: 'https://etherscan.io' } } },
  polygon: { id: 137, name: 'Polygon', rpcUrls: { default: { http: ['https://'] } }, blockExplorers: { default: { url: 'https://polygonscan.com' } } },
  bsc: { id: 56, name: 'BSC', rpcUrls: { default: { http: ['https://'] } }, blockExplorers: { default: { url: 'https://bscscan.com' } } },
  arbitrum: { id: 42161, name: 'Arbitrum', rpcUrls: { default: { http: ['https://'] } }, blockExplorers: { default: { url: 'https://arbiscan.io' } } },
  optimism: { id: 10, name: 'Optimism', rpcUrls: { default: { http: ['https://'] } }, blockExplorers: { default: { url: 'https://optimistic.etherscan.io' } } },
  base: { id: 8453, name: 'Base', rpcUrls: { default: { http: ['https://'] } }, blockExplorers: { default: { url: 'https://basescan.org' } } },
}));

vi.mock('wagmi/providers/public', () => ({
  publicProvider: vi.fn(() => ({})),
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  RainbowKitProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ConnectButton: {
    Custom: ({ children }: { children: (props: unknown) => React.ReactNode }) =>
      children({
        account: null,
        chain: null,
        openAccountModal: vi.fn(),
        openChainModal: vi.fn(),
        openConnectModal: vi.fn(),
        mounted: true,
      }),
  },
  getDefaultWallets: () => ({ connectors: [] }),
}));

vi.mock('@tanstack/react-query', () => {
  class MockQueryClient {}
  return {
    QueryClient: MockQueryClient,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('../../components/layout/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div role="status">Notifications available</div>,
}));

vi.mock('../../components/wallet/ConnectWalletButton', () => ({
  __esModule: true,
  default: () => <button type="button">Connect Wallet</button>,
}));

vi.mock('../../components/crisis/ZKProofPrompt', () => ({
  __esModule: true,
  default: () => <div role="status">ZK Proof Placeholder</div>,
}));

vi.mock('../../components/crisis/ZKProofStatusBadge', () => ({
  __esModule: true,
  default: () => <span aria-hidden="true">ZK Status</span>,
}));

vi.mock('../../components/feed/CreatePost', () => ({
  __esModule: true,
  default: () => (
    <section aria-label="Create post composer" role="region">
      <h2>Compose a new post</h2>
    </section>
  ),
}));

vi.mock('../../components/feed/PostCard', () => ({
  __esModule: true,
  default: ({ post }: { post: Post }) => (
    <article aria-label={`Post from ${post.studentId}`} data-testid={`post-${post.id}`}>
      <h3>{post.content}</h3>
      <p>Created at {new Date(post.createdAt).toLocaleString()}</p>
    </article>
  ),
}));

vi.mock('../../components/feed/ModeratorPanel', () => ({
  __esModule: true,
  default: () => (
    <section aria-label="Moderator controls" role="region">
      <p>Moderator tools</p>
    </section>
  ),
}));

vi.mock('../../components/community/CommunityDiscoveryPanel', () => ({
  __esModule: true,
  default: ({ onRequestSearch }: { onRequestSearch: () => void }) => (
    <section aria-label="Community discovery" role="region">
      <button type="button" onClick={onRequestSearch}>
        Search communities
      </button>
    </section>
  ),
}));

vi.mock('../../components/community/CommunitySearchModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? (
      <div role="dialog" aria-modal="true" aria-label="Community search modal">
        Community search content
      </div>
    ) : null,
}));

vi.mock('../../components/community/CommunityEvents', () => ({
  __esModule: true,
  default: () => (
    <section aria-label="Upcoming community events" role="region">
      <ul>
        <li>Wellness workshop</li>
      </ul>
    </section>
  ),
}));

vi.mock('../../components/community/CommunityModerationPanel', () => ({
  __esModule: true,
  default: () => (
    <section aria-label="Community moderation" role="region">
      <p>Moderation summary</p>
    </section>
  ),
}));

vi.mock('../../components/community/AnnouncementBanner', () => ({
  __esModule: true,
  default: () => (
    <section role="note" aria-label="Community announcements">
      Community announcement banner
    </section>
  ),
}));

vi.mock('../../components/community/ChannelMuteBanner', () => ({
  __esModule: true,
  default: () => (
    <section role="note" aria-label="Channel mute status">
      Channel mute banner
    </section>
  ),
}));

vi.mock('../../components/community/ModerationLogDisplay', () => ({
  __esModule: true,
  default: () => (
    <section aria-label="Recent moderation actions" role="log">
      <p>No recent moderation actions</p>
    </section>
  ),
}));

type MockStoreState = {
  initStudentId: ReturnType<typeof vi.fn>;
  showCrisisModal: boolean;
  setShowCrisisModal: ReturnType<typeof vi.fn>;
  pendingPost: unknown;
  setPendingPost: ReturnType<typeof vi.fn>;
  addPost: ReturnType<typeof vi.fn>;
  loadWalletData: ReturnType<typeof vi.fn>;
  grantDailyLoginBonus: ReturnType<typeof vi.fn>;
  posts: Post[];
  isModerator: boolean;
  initializeStore: ReturnType<typeof vi.fn>;
  studentId: string;
  zkProofs: Record<string, unknown>;
  toggleModeratorMode: ReturnType<typeof vi.fn>;
  evaluateFingerprintRisk: ReturnType<typeof vi.fn>;
  applyFingerprintMitigations: ReturnType<typeof vi.fn>;
  rotateFingerprintIdentity: ReturnType<typeof vi.fn>;
};

type Selector<T> = (state: MockStoreState) => T;

const createMockStoreState = (): MockStoreState => ({
  initStudentId: vi.fn(),
  showCrisisModal: false,
  setShowCrisisModal: vi.fn(),
  pendingPost: null,
  setPendingPost: vi.fn(),
  addPost: vi.fn(),
  loadWalletData: vi.fn(),
  grantDailyLoginBonus: vi.fn(),
  posts: [],
  isModerator: false,
  initializeStore: vi.fn(),
  studentId: 'Student#0001',
  zkProofs: {},
  toggleModeratorMode: vi.fn(),
  evaluateFingerprintRisk: vi.fn().mockResolvedValue({
    riskLevel: 'low',
    riskScore: 0.1,
    trackers: [],
    recommendation: 'continue',
  }),
  applyFingerprintMitigations: vi.fn().mockResolvedValue(null),
  rotateFingerprintIdentity: vi.fn().mockResolvedValue(null),
});

let storeState: MockStoreState = createMockStoreState();

function baseUseStore<T>(selector: Selector<T>): T;
function baseUseStore(): MockStoreState;
function baseUseStore(selector?: Selector<unknown>) {
  if (selector) {
    return selector(storeState);
  }
  return storeState;
}

baseUseStore.getState = () => storeState;
baseUseStore.setState = (
  updater:
    | Partial<MockStoreState>
    | ((state: MockStoreState) => Partial<MockStoreState>)
) => {
  const nextState = typeof updater === 'function' ? (updater as (state: MockStoreState) => Partial<MockStoreState>)(storeState) : updater;
  storeState = { ...storeState, ...nextState };
};
baseUseStore.subscribe = vi.fn();
baseUseStore.destroy = vi.fn();

vi.mock('../../lib/store', () => ({
  __esModule: true,
  useStore: baseUseStore,
}));

const createPost = (overrides: Partial<Post> = {}): Post => ({
  id: overrides.id ?? `post-${Math.random().toString(36).slice(2)}`,
  studentId: overrides.studentId ?? 'Student#Poster',
  content: overrides.content ?? 'Accessible post content',
  category: overrides.category,
  reactions: overrides.reactions ?? { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
  commentCount: overrides.commentCount ?? 0,
  comments: overrides.comments ?? [],
  createdAt: overrides.createdAt ?? Date.now(),
  isEdited: overrides.isEdited ?? false,
  editedAt: overrides.editedAt ?? null,
  isPinned: overrides.isPinned ?? false,
  reportCount: overrides.reportCount ?? 0,
  helpfulCount: overrides.helpfulCount ?? 0,
  expiresAt: overrides.expiresAt ?? null,
  lifetime: overrides.lifetime ?? '24h',
  customLifetimeHours: overrides.customLifetimeHours ?? null,
  isEncrypted: overrides.isEncrypted ?? false,
  encryptionMeta: overrides.encryptionMeta ?? null,
  imageUrl: overrides.imageUrl ?? null,
  emotionAnalysis: overrides.emotionAnalysis,
  ipfsCid: overrides.ipfsCid ?? null,
  warningShown: overrides.warningShown,
  reports: overrides.reports,
  contentBlurred: overrides.contentBlurred,
  blurReason: overrides.blurReason ?? null,
  moderationStatus: overrides.moderationStatus,
  hiddenReason: overrides.hiddenReason ?? null,
  moderationIssues: overrides.moderationIssues,
  needsReview: overrides.needsReview,
  isCrisisFlagged: overrides.isCrisisFlagged,
  crisisLevel: overrides.crisisLevel,
  supportOffered: overrides.supportOffered,
  flaggedAt: overrides.flaggedAt ?? null,
  flaggedForSupport: overrides.flaggedForSupport,
  pinnedAt: overrides.pinnedAt ?? null,
  isHighlighted: overrides.isHighlighted,
  highlightedAt: overrides.highlightedAt ?? null,
  highlightedUntil: overrides.highlightedUntil ?? null,
  extendedLifetimeHours: overrides.extendedLifetimeHours,
  crossCampusBoostedAt: overrides.crossCampusBoostedAt ?? null,
  crossCampusUntil: overrides.crossCampusUntil ?? null,
  crossCampusBoosts: overrides.crossCampusBoosts ?? [],
  isCommunityPinned: overrides.isCommunityPinned ?? false,
  communityPinnedAt: overrides.communityPinnedAt ?? null,
  communityPinnedBy: overrides.communityPinnedBy ?? null,
  communityId: overrides.communityId ?? null,
  channelId: overrides.channelId ?? null,
  visibility: overrides.visibility,
  isAnonymous: overrides.isAnonymous,
  archived: overrides.archived,
  archivedAt: overrides.archivedAt ?? null,
});

describe('AAA accessibility coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState = createMockStoreState();
    resetThemePreferences();
  });

  afterEach(() => {
    resetThemePreferences();
  });

  describe('App layout', () => {
    it('meets AAA requirements with focus landmarks in light theme', async () => {
      const { container } = render(<App />);

      const navigation = await screen.findByRole('navigation', { name: /primary navigation/i });
      expect(navigation).toBeInTheDocument();

      const axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();

      expect(container.querySelector('main')).not.toBeNull();
      expect(container.querySelector('footer')).not.toBeNull();
    });

    it('remains accessible when switching to dark theme and dyslexic font', async () => {
      const { container } = render(<App />);
      await screen.findByRole('navigation', { name: /primary navigation/i });

      setThemeMode('dark-hc');
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
      });

      let axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();

      setFontProfile('dyslexic');
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-font-profile')).toBe('dyslexic');
      });

      const bodyFontSize = parseFloat(getComputedStyle(document.body).fontSize);
      expect(bodyFontSize).toBeGreaterThanOrEqual(16);

      axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();
    });
  });

  describe('Navbar navigation flow', () => {
    it('provides accessible navigation controls with menus expanded across themes', async () => {
      const { container } = renderWithProviders(<Navbar />);

      const navigation = screen.getByRole('navigation', { name: /primary navigation/i });
      expect(navigation).toBeInTheDocument();

      const menuToggle = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuToggle);
      await waitFor(() => {
        expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      });
      expect(menuToggle).toHaveAttribute('aria-controls', 'mobile-navigation');

      const mobileMenuRegion = screen.getByRole('region', { name: /mobile navigation menu/i });
      expect(mobileMenuRegion).toBeInTheDocument();

      let axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();

      setThemeMode('dark-hc');
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
      });

      axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();
    });
  });

  describe('Crisis workflow', () => {
    it('ensures crisis alert modal meets dialog accessibility expectations', async () => {
      const onAcknowledge = vi.fn();
      storeState.studentId = 'Student#Crisis';
      storeState.zkProofs = {};

      const { container } = renderWithProviders(
        <CrisisAlertModal isOpen onAcknowledge={onAcknowledge} requestId="crisis-1" enableZKProof />
      );

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');

      let axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();

      setThemeMode('dark-hc');
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
      });

      axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();
    });
  });

  describe('Feed content surface', () => {
    it('renders feed timeline without AAA violations in both theme variants', async () => {
      storeState.posts = [
        createPost({ id: 'post-1', createdAt: Date.now() - 1000, content: 'Supportive story shared here.' }),
        createPost({ id: 'post-2', createdAt: Date.now(), content: 'Community update placeholder.' }),
      ];

      const { container } = renderWithProviders(<Feed />);

      await waitFor(() => {
        expect(screen.getAllByRole('article').length).toBeGreaterThanOrEqual(1);
      });

      let axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();

      setThemeMode('dark-hc');
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
      });

      axeResults = await runAxe(container);
      expect(axeResults).toHaveNoViolations();
    });
  });
});
