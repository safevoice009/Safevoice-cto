import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import WalletSection from '../WalletSection';
import { useAccount, useEnsName, useNetwork } from 'wagmi';
import { useStore } from '../../../lib/store';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useEnsName: vi.fn(),
  useNetwork: vi.fn(),
  useSwitchNetwork: vi.fn(() => ({
    switchNetwork: vi.fn(),
    isLoading: false,
    pendingChainId: undefined,
  })),
}));

vi.mock('wagmi/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  polygon: { id: 137, name: 'Polygon' },
  bsc: { id: 56, name: 'BSC' },
  arbitrum: { id: 42161, name: 'Arbitrum' },
  optimism: { id: 10, name: 'Optimism' },
  base: { id: 8453, name: 'Base' },
}));

vi.mock('react-hot-toast', () => {
  const success = vi.fn();
  const error = vi.fn();
  const toast = { success, error };

  return {
    __esModule: true,
    default: toast,
    success,
    error,
  };
});

vi.mock('../ReferralSection', () => ({ default: () => <div data-testid="referral-section" /> }));
vi.mock('../PremiumSettings', () => ({ default: () => <div data-testid="premium-settings" /> }));
vi.mock('../NFTBadgeStore', () => ({ default: () => <div data-testid="nft-store" /> }));
vi.mock('../UtilitiesSection', () => ({ default: () => <div data-testid="utilities" /> }));
vi.mock('../TransactionHistory', () => ({ default: () => <div data-testid="transaction-history" /> }));

const mockedUseAccount = useAccount as unknown as MockedFunction<typeof useAccount>;
const mockedUseEnsName = useEnsName as unknown as MockedFunction<typeof useEnsName>;
const mockedUseNetwork = useNetwork as unknown as MockedFunction<typeof useNetwork>;

const initialStoreState = useStore.getState();
let claimRewardsStub: ReturnType<typeof vi.fn>;

const renderWalletSection = () =>
  render(
    <MemoryRouter>
      <WalletSection />
    </MemoryRouter>
  );

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
  vi.clearAllMocks();
});

describe('WalletSection - Rendering Tests', () => {
  it('renders all balance cards with correct values', () => {
    renderWalletSection();

    expect(screen.getAllByText('Total Earned').length).toBeGreaterThan(0);
    expect(screen.getByText('Pending Rewards')).toBeInTheDocument();
    expect(screen.getByText('Claimed')).toBeInTheDocument();
    expect(screen.getByText('Spent')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Total Balance')).toBeInTheDocument();

    expect(screen.getAllByText('360.0 VOICE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('45.0 VOICE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('220.0 VOICE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('105.0 VOICE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('75.0 VOICE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('180.0 VOICE').length).toBeGreaterThan(0);
  });

  it('renders with zero balance state', () => {
    setupStore({
      voiceBalance: 0,
      pendingRewards: 0,
      totalRewardsEarned: 0,
      claimedRewards: 0,
      spentRewards: 0,
      availableBalance: 0,
      pendingRewardBreakdown: [],
      transactionHistory: [],
      earningsBreakdown: {
        posts: 0,
        reactions: 0,
        comments: 0,
        helpful: 0,
        streaks: 0,
        bonuses: 0,
        crisis: 0,
        reporting: 0,
        referrals: 0,
      },
    });
    renderWalletSection();

    const zeroBalances = screen.getAllByText('0.0 VOICE');
    expect(zeroBalances.length).toBeGreaterThan(0);

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('renders with low balance and shows alert', () => {
    setupStore({
      availableBalance: 5,
      voiceBalance: 5,
    });
    renderWalletSection();

    expect(screen.getByText('Low Balance Alert')).toBeInTheDocument();
    expect(screen.getByText(/Your available balance is low/i)).toBeInTheDocument();
  });

  it('does not show low balance alert when balance is above threshold', () => {
    setupStore({
      availableBalance: 100,
      voiceBalance: 100,
    });
    renderWalletSection();

    expect(screen.queryByText('Low Balance Alert')).not.toBeInTheDocument();
  });

  it('renders with high balance values', () => {
    setupStore({
      voiceBalance: 15000,
      pendingRewards: 5000,
      totalRewardsEarned: 50000,
      claimedRewards: 40000,
      spentRewards: 25000,
      availableBalance: 15000,
    });
    renderWalletSection();

    expect(screen.getByText('50.0K VOICE')).toBeInTheDocument();
    expect(screen.getByText('5.0K VOICE')).toBeInTheDocument();
    expect(screen.getByText('40.0K VOICE')).toBeInTheDocument();
    expect(screen.getByText('25.0K VOICE')).toBeInTheDocument();
    expect(screen.getAllByText('15.0K VOICE').length).toBeGreaterThan(0);
  });

  it('renders connected wallet address correctly', () => {
    renderWalletSection();

    expect(screen.getByText('Connected Wallets')).toBeInTheDocument();
    expect(screen.getByText(/0x1234...5678/)).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
  });

  it('renders ENS name when available', () => {
    mockedUseEnsName.mockReturnValue({ 
      data: 'vitalik.eth' 
    } as unknown as ReturnType<typeof useEnsName>);
    renderWalletSection();

    expect(screen.getByText('vitalik.eth')).toBeInTheDocument();
  });

  it('shows no wallet connected state', () => {
    mockedUseAccount.mockReturnValue({
      address: undefined,
      connector: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isReconnecting: false,
      status: 'disconnected',
    } as unknown as ReturnType<typeof useAccount>);

    setupStore({ connectedAddress: null });
    renderWalletSection();

    expect(screen.getByText('No wallet connected')).toBeInTheDocument();
    expect(screen.getByText(/Connect your wallet to claim rewards/i)).toBeInTheDocument();
  });

  it('renders pending rewards breakdown when available', () => {
    renderWalletSection();

    expect(screen.getByText('Pending Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('posts').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+25 VOICE/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('reactions').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+20 VOICE/).length).toBeGreaterThan(0);
  });

  it('renders earnings breakdown section', () => {
    renderWalletSection();

    expect(screen.getByText('📊 How You Earned')).toBeInTheDocument();
    expect(screen.getByText(/\+150 VOICE/)).toBeInTheDocument();
    expect(screen.getByText(/\+90 VOICE/)).toBeInTheDocument();
    expect(screen.getByText(/\+40 VOICE/)).toBeInTheDocument();
  });

  it('renders all child sections', () => {
    renderWalletSection();

    expect(screen.getByTestId('referral-section')).toBeInTheDocument();
    expect(screen.getByTestId('premium-settings')).toBeInTheDocument();
    expect(screen.getByTestId('nft-store')).toBeInTheDocument();
    expect(screen.getByTestId('utilities')).toBeInTheDocument();
  });

  it('renders transaction history when available', () => {
    renderWalletSection();

    expect(screen.getByText('🕒 Recent Transactions')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
  });

  it('shows loading state for transactions', () => {
    setupStore({
      walletLoading: true,
      transactionHistory: [],
    });
    renderWalletSection();

    expect(screen.getByText(/Loading transactions/i)).toBeInTheDocument();
  });

  it('shows syncing message when loading with existing transactions', () => {
    setupStore({
      walletLoading: true,
    });
    renderWalletSection();

    expect(screen.getByText(/Syncing latest activity/i)).toBeInTheDocument();
  });
});

describe('WalletSection - Claim Rewards Interaction', () => {
  it('enables claim button when pending rewards exist and wallet is connected', () => {
    renderWalletSection();

    const button = screen.getByRole('button', { name: /claim rewards/i });
    expect(button).not.toBeDisabled();
  });

  it('disables claim button when no pending rewards', () => {
    setupStore({ pendingRewards: 0, pendingRewardBreakdown: [] });
    renderWalletSection();

    const button = screen.getByRole('button', { name: /no rewards to claim/i });
    expect(button).toBeDisabled();
  });

  it('disables claim button when wallet not connected', () => {
    mockedUseAccount.mockReturnValue({
      address: undefined,
      connector: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isReconnecting: false,
      status: 'disconnected',
    } as unknown as ReturnType<typeof useAccount>);
    renderWalletSection();

    const button = screen.getByRole('button', { name: /connect wallet to claim/i });
    expect(button).toBeDisabled();
  });

  it('shows claiming state during claim operation', async () => {
    renderWalletSection();

    const button = screen.getByRole('button', { name: /claim rewards/i });
    fireEvent.click(button);

    expect(screen.getByText(/claiming/i)).toBeInTheDocument();
    await waitFor(() => expect(claimRewardsStub).toHaveBeenCalled());
  });

  it('handles claim flow and updates UI state', async () => {
    renderWalletSection();

    const button = screen.getByRole('button', { name: /claim rewards/i });
    fireEvent.click(button);

    expect(screen.getByText(/claiming/i)).toBeInTheDocument();
    await waitFor(() => expect(claimRewardsStub).toHaveBeenCalled());

    await screen.findByText('0.0 VOICE', {}, { timeout: 2000 });
    await screen.findByText('265.0 VOICE', {}, { timeout: 2000 });
  });

  it('handles claim error correctly', async () => {
    const errorClaimStub = vi.fn(async () => {
      throw new Error('Network error');
    });

    setupStore({ claimRewards: errorClaimStub });
    renderWalletSection();

    const button = screen.getByRole('button', { name: /claim rewards/i });
    fireEvent.click(button);

    await waitFor(() => expect(errorClaimStub).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('disables claim button during loading', () => {
    setupStore({ walletLoading: true });
    renderWalletSection();

    const button = screen.getByRole('button', { name: /syncing wallet/i });
    expect(button).toBeDisabled();
  });
});

describe('WalletSection - Animated Counters', () => {
  it('displays animated counter values for all balance cards', () => {
    renderWalletSection();

    const totalEarnedCard = screen.getAllByText('360.0 VOICE');
    expect(totalEarnedCard.length).toBeGreaterThan(0);

    const pendingCard = screen.getAllByText('45.0 VOICE');
    expect(pendingCard.length).toBeGreaterThan(0);

    const claimedCard = screen.getAllByText('220.0 VOICE');
    expect(claimedCard.length).toBeGreaterThan(0);
  });

  it('animates counter updates when values change', async () => {
    const { rerender } = renderWalletSection();

    expect(screen.getAllByText('45.0 VOICE').length).toBeGreaterThan(0);

    act(() => {
      useStore.setState({ pendingRewards: 100 });
    });

    rerender(
      <MemoryRouter>
        <WalletSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('100.0 VOICE').length).toBeGreaterThan(0);
    });
  });

  it('handles zero values in animated counters', () => {
    setupStore({
      voiceBalance: 0,
      pendingRewards: 0,
      totalRewardsEarned: 0,
      claimedRewards: 0,
      spentRewards: 0,
      availableBalance: 0,
    });
    renderWalletSection();

    const zeroValues = screen.getAllByText('0.0 VOICE');
    expect(zeroValues.length).toBeGreaterThanOrEqual(5);
  });
});

describe('WalletSection - Error States', () => {
  it('shows syncing state when wallet loading', () => {
    setupStore({ walletLoading: true });
    renderWalletSection();

    expect(screen.getByText(/syncing wallet/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /syncing wallet/i });
    expect(button).toBeDisabled();
  });

  it('shows error alert when wallet error is present', () => {
    setupStore({ walletError: 'Network issue' });
    renderWalletSection();

    expect(screen.getAllByText('Network issue').length).toBeGreaterThan(0);
  });

  it('displays error in claim section', () => {
    setupStore({ walletError: 'Connection timeout' });
    renderWalletSection();

    expect(screen.getAllByText('Connection timeout').length).toBeGreaterThan(0);
  });

  it('shows error when both local and wallet errors exist', () => {
    setupStore({ walletError: 'Wallet error' });
    renderWalletSection();

    expect(screen.getAllByText('Wallet error').length).toBeGreaterThan(0);
  });

  it('displays transaction error when present', () => {
    setupStore({
      walletError: 'Failed to load transactions',
      transactionHistory: [
        {
          id: 'earn-1',
          type: 'earn',
          amount: 25,
          reason: 'Post reward',
          reasonCode: 'posts',
          metadata: {},
          timestamp: Date.now(),
          balance: 180,
          pending: 45,
        },
      ],
    });
    renderWalletSection();

    expect(screen.getAllByText('Failed to load transactions').length).toBeGreaterThan(0);
  });
});

describe('WalletSection - Copy Address Functionality', () => {
  it('copies address to clipboard on button click', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    renderWalletSection();

    const addressRow = screen.getByText(/0x1234...5678/).closest('div');
    expect(addressRow).not.toBeNull();

    const copyButton = within(addressRow as HTMLElement).getByRole('button');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
    });
  });
});

describe('WalletSection - Quick Actions', () => {
  it('renders disabled quick action buttons', () => {
    renderWalletSection();

    expect(screen.getByText('Send VOICE')).toBeInTheDocument();
    expect(screen.getByText('View Staking')).toBeInTheDocument();

    const sendButton = screen.getByText('Send VOICE').closest('button');
    const viewStakingButton = screen.getByText('View Staking').closest('button');

    expect(sendButton).toBeDisabled();
    expect(viewStakingButton).not.toBeDisabled();
  });
});
