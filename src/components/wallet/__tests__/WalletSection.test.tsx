import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletSection from '../WalletSection';
import { useAccount, useEnsName, useNetwork } from 'wagmi';
import { useStore } from '../../../lib/store';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useEnsName: vi.fn(),
  useNetwork: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../ReferralSection', () => ({ default: () => <div data-testid="referral-section" /> }));
vi.mock('../PremiumSettings', () => ({ default: () => <div data-testid="premium-settings" /> }));
vi.mock('../NFTBadgeStore', () => ({ default: () => <div data-testid="nft-store" /> }));
vi.mock('../UtilitiesSection', () => ({ default: () => <div data-testid="utilities" /> }));

const mockedUseAccount = useAccount as unknown as MockedFunction<typeof useAccount>;
const mockedUseEnsName = useEnsName as unknown as MockedFunction<typeof useEnsName>;
const mockedUseNetwork = useNetwork as unknown as MockedFunction<typeof useNetwork>;

const initialStoreState = useStore.getState();
let claimRewardsStub: ReturnType<typeof vi.fn>;

const setupStore = (overrides: Partial<ReturnType<typeof useStore.getState>> = {}) => {
  const now = Date.now();

  claimRewardsStub = vi.fn(async () => {
    const state = useStore.getState();
    const claimAmount = state.pendingRewards;
    await Promise.resolve();
    act(() => {
      useStore.setState((current) => ({
        ...current,
        pendingRewards: 0,
        claimedRewards: current.claimedRewards + claimAmount,
        availableBalance: current.availableBalance + claimAmount,
        pendingRewardBreakdown: [],
        transactionHistory: [
          {
            id: 'claim-test',
            type: 'claim',
            amount: claimAmount,
            reason: 'Claimed pending rewards',
            reasonCode: 'claim_rewards',
            metadata: { claimedAmount: claimAmount },
            timestamp: Date.now(),
            balance: current.voiceBalance,
            pending: 0,
            claimed: current.claimedRewards + claimAmount,
          },
          ...current.transactionHistory,
        ],
      }));
    });
  });

  act(() => {
    useStore.setState((state) => ({
      ...state,
      voiceBalance: overrides.voiceBalance ?? 180,
      pendingRewards: overrides.pendingRewards ?? 45,
      totalRewardsEarned: overrides.totalRewardsEarned ?? 360,
      claimedRewards: overrides.claimedRewards ?? 220,
      spentRewards: overrides.spentRewards ?? 105,
      availableBalance: overrides.availableBalance ?? 75,
      pendingRewardBreakdown:
        overrides.pendingRewardBreakdown ?? [
          { category: 'posts', amount: 25, timestamp: now - 4000 },
          { category: 'reactions', amount: 20, timestamp: now - 2500 },
        ],
      earningsBreakdown:
        overrides.earningsBreakdown ?? {
          posts: 150,
          reactions: 90,
          comments: 40,
          helpful: 30,
          streaks: 20,
          bonuses: 15,
          crisis: 5,
          reporting: 5,
          referrals: 5,
        },
      transactionHistory:
        overrides.transactionHistory ?? [
          {
            id: 'earn-1',
            type: 'earn',
            amount: 25,
            reason: 'Post reward',
            reasonCode: 'posts',
            metadata: {},
            timestamp: now - 3000,
            balance: 180,
            pending: 45,
          },
          {
            id: 'spend-1',
            type: 'spend',
            amount: -15,
            reason: 'Badge purchase',
            metadata: {},
            timestamp: now - 7000,
            balance: 140,
            spent: 90,
          },
        ],
      anonymousWalletAddress: overrides.anonymousWalletAddress ?? null,
      connectedAddress:
        overrides.connectedAddress ?? '0x1234567890abcdef1234567890abcdef12345678',
      claimRewards: overrides.claimRewards ?? claimRewardsStub,
      walletLoading: overrides.walletLoading ?? false,
      walletError: overrides.walletError ?? null,
    }));
  });
};

beforeEach(() => {
  mockedUseAccount.mockReturnValue({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    connector: undefined,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    isReconnecting: false,
    status: 'connected',
  } as unknown as ReturnType<typeof useAccount>);
  mockedUseEnsName.mockReturnValue({ data: null } as unknown as ReturnType<typeof useEnsName>);
  mockedUseNetwork.mockReturnValue({ chain: { name: 'Ethereum' } } as unknown as ReturnType<typeof useNetwork>);
  setupStore();
});

afterEach(() => {
  act(() => {
    useStore.setState(initialStoreState, true);
  });
});

describe('WalletSection', () => {
  it('renders aggregated balance facets', () => {
    render(<WalletSection />);

    expect(screen.getByText('Total Earned')).toBeInTheDocument();
    expect(screen.getByText('Pending Rewards')).toBeInTheDocument();
    expect(screen.getByText('Claimed')).toBeInTheDocument();
    expect(screen.getByText('Spent')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Total Balance')).toBeInTheDocument();

    expect(screen.getByText('360.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('45.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('220.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('105.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('75.0 VOICE')).toBeInTheDocument();
    expect(screen.getByText('180.0 VOICE')).toBeInTheDocument();
  });

  it('disables claim button when no pending rewards', () => {
    setupStore({ pendingRewards: 0, pendingRewardBreakdown: [] });
    render(<WalletSection />);

    const button = screen.getByRole('button', { name: /no rewards to claim/i });
    expect(button).toBeDisabled();
  });

  it('shows syncing state when wallet loading', () => {
    setupStore({ walletLoading: true });
    render(<WalletSection />);

    expect(screen.getByText(/syncing wallet/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /syncing wallet/i });
    expect(button).toBeDisabled();
  });

  it('shows error alert when wallet error is present', () => {
    setupStore({ walletError: 'Network issue' });
    render(<WalletSection />);

    expect(screen.getByText('Network issue')).toBeInTheDocument();
  });

  it('handles claim flow and updates UI state', async () => {
    render(<WalletSection />);

    const button = screen.getByRole('button', { name: /claim rewards/i });
    fireEvent.click(button);

    expect(screen.getByText(/claiming/i)).toBeInTheDocument();
    await waitFor(() => expect(claimRewardsStub).toHaveBeenCalled());

    const pendingCard = screen.getByText('Pending Rewards').closest('div');
    expect(pendingCard).not.toBeNull();
    await waitFor(() => {
      expect(within(pendingCard as HTMLElement).getByText('0.0 VOICE')).toBeInTheDocument();
    });

    const claimedCard = screen.getByText('Claimed').closest('div');
    expect(claimedCard).not.toBeNull();
    await waitFor(() => {
      expect(within(claimedCard as HTMLElement).getByText('265.0 VOICE')).toBeInTheDocument();
    });
  });
});
