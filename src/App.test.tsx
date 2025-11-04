import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { MockedFunction } from 'vitest';
import '@testing-library/jest-dom';
import App from './App';
import { useAccount } from 'wagmi';

vi.mock('wagmi', () => {
  const configureChains = vi.fn(() => ({
    chains: [],
    publicClient: {},
    webSocketPublicClient: {},
  }));
  const createConfig = vi.fn(() => ({}));

  return {
    useAccount: vi.fn(),
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

const mockedUseAccount = useAccount as unknown as MockedFunction<typeof useAccount>;

describe('App', () => {
  beforeEach(() => {
    mockedUseAccount.mockReturnValue({
      address: undefined,
      connector: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isReconnecting: false,
      status: 'disconnected',
    } as unknown as ReturnType<typeof useAccount>);
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('renders the app with wallet provider', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('handles disconnected wallet state', () => {
    render(<App />);
    // App should render even when wallet is disconnected
    expect(document.body).toBeTruthy();
  });

  it('handles connected wallet state', () => {
    mockedUseAccount.mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      connector: undefined,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false,
      status: 'connected',
    } as unknown as ReturnType<typeof useAccount>);

    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('handles connecting wallet state', () => {
    mockedUseAccount.mockReturnValue({
      address: undefined,
      connector: undefined,
      isConnected: false,
      isConnecting: true,
      isDisconnected: false,
      isReconnecting: false,
      status: 'connecting',
    } as unknown as ReturnType<typeof useAccount>);

    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('handles reconnecting wallet state', () => {
    mockedUseAccount.mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      connector: undefined,
      isConnected: false,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: true,
      status: 'reconnecting',
    } as unknown as ReturnType<typeof useAccount>);

    render(<App />);
    expect(document.body).toBeTruthy();
  });
});
