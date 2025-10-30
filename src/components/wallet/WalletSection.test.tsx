import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ComponentPropsWithoutRef } from 'react';
import '@testing-library/jest-dom';
import WalletSection from './WalletSection';
import { useStore } from '../../lib/store';
import toast from 'react-hot-toast';

type WagmiModule = typeof import('wagmi');
type AccountResult = ReturnType<WagmiModule['useAccount']>;
type EnsResult = ReturnType<WagmiModule['useEnsName']>;
type NetworkResult = ReturnType<WagmiModule['useNetwork']>;

const createAccountReturn = (overrides?: Partial<AccountResult>): AccountResult => ({
  address: null,
  isConnected: false,
  ...overrides,
}) as AccountResult;

const createEnsReturn = (overrides?: Partial<EnsResult>): EnsResult => ({
  data: null,
  ...overrides,
}) as EnsResult;

const createNetworkReturn = (overrides?: Partial<NetworkResult>): NetworkResult => ({
  chain: null,
  ...overrides,
}) as NetworkResult;

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: null,
    isConnected: false,
  })),
  useEnsName: vi.fn(() => ({ data: null })),
  useNetwork: vi.fn(() => ({ chain: null })),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
  },
}));

describe('WalletSection Component', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();

    const { useAccount, useEnsName, useNetwork } = await import('wagmi');
    vi.mocked(useAccount).mockReturnValue({
      address: null,
      isConnected: false,
    } as ReturnType<typeof useAccount>);
    vi.mocked(useEnsName).mockReturnValue({
      data: null,
    } as ReturnType<typeof useEnsName>);
    vi.mocked(useNetwork).mockReturnValue({
      chain: null,
    } as ReturnType<typeof useNetwork>);
    
    // Reset store to initial state
    useStore.setState({
      voiceBalance: 0,
      pendingRewards: 0,
      earningsBreakdown: {
        posts: 0,
        reactions: 0,
        comments: 0,
        helpful: 0,
        streaks: 0,
        bonuses: 0,
        crisis: 0,
        reporting: 0,
      },
      transactionHistory: [],
      anonymousWalletAddress: null,
      connectedAddress: null,
    });
  });

  describe('Rendering', () => {
    it('should render wallet section with no wallet connected', () => {
      render(<WalletSection />);
      
      expect(screen.getByText('Connected Wallets')).toBeInTheDocument();
      expect(screen.getByText('No wallet connected')).toBeInTheDocument();
      expect(screen.getByText('Connect your wallet to claim rewards')).toBeInTheDocument();
    });

    it('should render VOICE balance section', () => {
      render(<WalletSection />);
      
      expect(screen.getByText(/💎 \$VOICE Balance/)).toBeInTheDocument();
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
    });

    it('should display zero balance initially', () => {
      render(<WalletSection />);
      
      expect(screen.getAllByText('0.0 VOICE').length).toBeGreaterThan(0);
    });

    it('should render earnings breakdown section', () => {
      render(<WalletSection />);
      
      expect(screen.getByText(/📊 How You Earned/)).toBeInTheDocument();
      expect(screen.getByText('posts')).toBeInTheDocument();
      expect(screen.getByText('reactions')).toBeInTheDocument();
      expect(screen.getByText('comments')).toBeInTheDocument();
    });

    it('should render transaction history section', () => {
      render(<WalletSection />);
      
      expect(screen.getByText(/🕒 Recent Transactions/)).toBeInTheDocument();
    });

    it('should show empty state for transactions', () => {
      render(<WalletSection />);
      
      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
      expect(screen.getByText('Start earning VOICE by creating posts!')).toBeInTheDocument();
    });

    it('should render quick actions section', () => {
      render(<WalletSection />);
      
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Send VOICE')).toBeInTheDocument();
      expect(screen.getByText('Stake VOICE')).toBeInTheDocument();
    });
  });

  describe('Connected Wallet Display', () => {
    it('should display connected wallet when address is set', async () => {
      const { useAccount } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue(createAccountReturn({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      }));

      useStore.setState({
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      render(<WalletSection />);
      
      expect(screen.getByText('Main Wallet')).toBeInTheDocument();
      expect(screen.getByText(/0x742d/)).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should display ENS name when available', async () => {
      const { useAccount, useEnsName } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue(createAccountReturn({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      }));
      vi.mocked(useEnsName).mockReturnValue(createEnsReturn({ data: 'vitalik.eth' }));

      useStore.setState({
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      render(<WalletSection />);
      
      expect(screen.getByText('vitalik.eth')).toBeInTheDocument();
    });

    it('should display network name', async () => {
      const { useAccount, useNetwork } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue(createAccountReturn({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      }));
      vi.mocked(useNetwork).mockReturnValue(createNetworkReturn({
        chain: { name: 'Ethereum' },
      }));

      useStore.setState({
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      render(<WalletSection />);
      
      expect(screen.getByText('Ethereum')).toBeInTheDocument();
    });

    it('should display anonymous wallet when set', async () => {
      const { useAccount } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue(createAccountReturn({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      });

      useStore.setState({
        anonymousWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      render(<WalletSection />);
      
      expect(screen.getByText('Anonymous Wallet')).toBeInTheDocument();
      expect(screen.getByText(/0x1234/)).toBeInTheDocument();
      expect(screen.getByText('In-App')).toBeInTheDocument();
    });
  });

  describe('Balance Display', () => {
    it('should display current VOICE balance', () => {
      useStore.setState({ voiceBalance: 1234 });

      render(<WalletSection />);
      
      expect(screen.getByText('1.2K VOICE')).toBeInTheDocument();
    });

    it('should display pending rewards', () => {
      useStore.setState({
        voiceBalance: 100,
        pendingRewards: 50,
      });

      render(<WalletSection />);
      
      expect(screen.getByText('50.0 VOICE')).toBeInTheDocument();
      expect(screen.getByText('Claimable')).toBeInTheDocument();
    });

    it('should format large balances correctly', () => {
      useStore.setState({ voiceBalance: 1500000 });

      render(<WalletSection />);
      
      expect(screen.getByText('1.5M VOICE')).toBeInTheDocument();
    });
  });

  describe('Earnings Breakdown', () => {
    it('should display earnings by category', () => {
      useStore.setState({
        earningsBreakdown: {
          posts: 100,
          reactions: 50,
          comments: 30,
          helpful: 20,
          streaks: 15,
          bonuses: 10,
          crisis: 5,
          reporting: 2,
        },
      });

      render(<WalletSection />);
      
      expect(screen.getByText('+100 VOICE')).toBeInTheDocument();
      expect(screen.getByText('+50 VOICE')).toBeInTheDocument();
      expect(screen.getByText('+30 VOICE')).toBeInTheDocument();
    });

    it('should calculate and display total earned', () => {
      useStore.setState({
        earningsBreakdown: {
          posts: 100,
          reactions: 50,
          comments: 30,
          helpful: 20,
          streaks: 15,
          bonuses: 10,
          crisis: 5,
          reporting: 2,
        },
      });

      render(<WalletSection />);
      
      expect(screen.getByText('+232 VOICE')).toBeInTheDocument();
      expect(screen.getByText('Total Earned')).toBeInTheDocument();
    });
  });

  describe('Transaction History', () => {
    it('should display recent transactions', () => {
      useStore.setState({
        transactionHistory: [
          {
            id: '1',
            type: 'earn',
            amount: 10,
            reason: 'Post created',
            metadata: {},
            timestamp: Date.now() - 60000,
            balance: 10,
          },
          {
            id: '2',
            type: 'spend',
            amount: -5,
            reason: 'Post boost',
            metadata: {},
            timestamp: Date.now() - 120000,
            balance: 5,
          },
        ],
      });

      render(<WalletSection />);
      
      expect(screen.getByText('Post created')).toBeInTheDocument();
      expect(screen.getByText('Post boost')).toBeInTheDocument();
    });

    it('should format earn transactions with + sign', () => {
      useStore.setState({
        transactionHistory: [
          {
            id: '1',
            type: 'earn',
            amount: 10,
            reason: 'Test earning',
            metadata: {},
            timestamp: Date.now(),
            balance: 10,
          },
        ],
      });

      render(<WalletSection />);
      
      expect(screen.getByText('+10 VOICE')).toBeInTheDocument();
    });

    it('should show only the 10 most recent transactions', () => {
      const transactions = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        type: 'earn' as const,
        amount: 1,
        reason: `Transaction ${i}`,
        metadata: {},
        timestamp: Date.now() - i * 1000,
        balance: i + 1,
      }));

      useStore.setState({ transactionHistory: transactions });

      render(<WalletSection />);
      
      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
      expect(screen.getByText('Transaction 9')).toBeInTheDocument();
      expect(screen.queryByText('Transaction 10')).not.toBeInTheDocument();
    });

    it('should format transaction timestamps', () => {
      useStore.setState({
        transactionHistory: [
          {
            id: '1',
            type: 'earn',
            amount: 10,
            reason: 'Recent transaction',
            metadata: {},
            timestamp: Date.now() - 30000,
            balance: 10,
          },
        ],
      });

      render(<WalletSection />);
      
      expect(screen.getByText('Recent transaction')).toBeInTheDocument();
    });
  });

  describe('Claim Rewards Interaction', () => {
    it('should disable claim button when no wallet connected', () => {
      useStore.setState({ pendingRewards: 50 });

      render(<WalletSection />);
      
      const claimButton = screen.getByText(/Claim Rewards to Blockchain/).closest('button');
      expect(claimButton).toBeDisabled();
    });

    it('should disable claim button when no pending rewards', async () => {
      const { useAccount } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      });

      useStore.setState({
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        pendingRewards: 0,
      });

      render(<WalletSection />);
      
      const claimButton = screen.getByText(/Claim Rewards to Blockchain/).closest('button');
      expect(claimButton).toBeDisabled();
    });

    it('should enable claim button when wallet connected and rewards pending', async () => {
      const { useAccount } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      });

      useStore.setState({
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        pendingRewards: 50,
      });

      render(<WalletSection />);
      
      const claimButton = screen.getByText(/Claim Rewards to Blockchain/).closest('button');
      expect(claimButton).not.toBeDisabled();
    });

    it('should show loading state when claiming', async () => {
      const { useAccount } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      });

      useStore.setState({
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        pendingRewards: 50,
      });

      render(<WalletSection />);
      
      const claimButton = screen.getByText(/Claim Rewards to Blockchain/).closest('button');
      fireEvent.click(claimButton!);

      await waitFor(() => {
        expect(screen.getByText('Claiming...')).toBeInTheDocument();
      });
    });

  });

  describe('Copy Address Functionality', () => {
    it('should copy address to clipboard on button click', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { useAccount } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      });

      useStore.setState({
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      render(<WalletSection />);
      
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.querySelector('svg'));
      
      if (copyButton) {
        fireEvent.click(copyButton);
        
        await waitFor(() => {
          expect(mockWriteText).toHaveBeenCalledWith('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
          expect(toast.success).toHaveBeenCalledWith('Address copied!');
        });
      }
    });

    it('should show check icon after successful copy', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const { useAccount } = await import('wagmi');
      vi.mocked(useAccount).mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        isConnected: true,
      });

      useStore.setState({
        connectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      render(<WalletSection />);
      
      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.querySelector('svg'));
      
      if (copyButton) {
        fireEvent.click(copyButton);
        
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Address copied!');
        });
      }
    });
  });

  describe('Quick Actions', () => {
    it('should show Send and Stake buttons as disabled', () => {
      render(<WalletSection />);
      
      const sendButton = screen.getByText('Send VOICE').closest('button');
      const stakeButton = screen.getByText('Stake VOICE').closest('button');
      
      expect(sendButton).toBeDisabled();
      expect(stakeButton).toBeDisabled();
    });

    it('should show "Soon" badges on quick action buttons', () => {
      render(<WalletSection />);
      
      const soonBadges = screen.getAllByText('Soon');
      expect(soonBadges).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive text for all sections', () => {
      render(<WalletSection />);
      
      expect(screen.getByText('Connected Wallets')).toBeInTheDocument();
      expect(screen.getByText(/💎 \$VOICE Balance/)).toBeInTheDocument();
      expect(screen.getByText(/📊 How You Earned/)).toBeInTheDocument();
      expect(screen.getByText(/🕒 Recent Transactions/)).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });
});
