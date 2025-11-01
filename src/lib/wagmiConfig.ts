import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { mainnet, polygon, bsc, arbitrum, optimism, base } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

// Get WalletConnect project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID';

// Polygon network configuration for VOICE token deployment
export const POLYGON_CONFIG = {
  chainId: 137,
  name: 'Polygon',
  network: 'matic',
  rpcUrls: {
    default: {
      http: [
        import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com',
      ],
    },
    public: {
      http: ['https://polygon-rpc.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://polygonscan.com',
    },
  },
  contracts: {
    // Placeholder contract addresses - update when contracts are deployed
    voiceToken: {
      address: import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      abi: [], // Import ERC20 ABI when ready
    },
    staking: {
      address: import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      abi: [], // Import Staking contract ABI when ready
    },
    governor: {
      address: import.meta.env.VITE_GOVERNOR_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      abi: [], // Import Governor contract ABI when ready
    },
  },
  testnet: false,
};

// Configure supported chains
export const { chains, publicClient, webSocketPublicClient } = configureChains(
  [polygon, mainnet, bsc, arbitrum, optimism, base],
  [publicProvider()]
);

// Configure default wallets (includes MetaMask, Coinbase, Rainbow, WalletConnect, Trust, and more)
const { connectors } = getDefaultWallets({
  appName: 'SafeVoice',
  projectId,
  chains,
});

// Create wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

// Helper to check if connected to Polygon
export function isConnectedToPolygon(chainId?: number): boolean {
  return chainId === POLYGON_CONFIG.chainId;
}

// Helper to get contract address
export function getContractAddress(contractType: 'voiceToken' | 'staking' | 'governor'): string {
  return POLYGON_CONFIG.contracts[contractType].address;
}
