import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { mainnet, polygon, bsc, arbitrum, optimism, base } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

// Get WalletConnect project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID';

// Configure supported chains
export const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, polygon, bsc, arbitrum, optimism, base],
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
