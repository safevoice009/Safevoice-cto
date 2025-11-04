import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatGwei } from 'viem';

import { useStore } from '../../lib/store';
import { formatVoiceBalance } from '../../lib/tokenEconomics';
import GasEstimateDisplay from './GasEstimateDisplay';

const HIGH_GAS_THRESHOLD = 50; // Gwei

export default function ConnectWalletButton() {
  const voiceBalance = useStore((state) => state.voiceBalance);
  const setConnectedAddress = useStore((state) => state.setConnectedAddress);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);

  useEffect(() => {
    setConnectedAddress(isConnected ? address ?? null : null);
  }, [address, isConnected, setConnectedAddress]);

  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;

    const fetchGasPrice = async () => {
      if (!publicClient) return;
      try {
        const price = await publicClient.getGasPrice();
        if (mounted) {
          setGasPrice(price);
        }
      } catch (error) {
        console.error('Failed to fetch gas price:', error);
      }
    };

    if (isConnected && publicClient) {
      fetchGasPrice();
      interval = setInterval(fetchGasPrice, 15000);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [isConnected, publicClient]);

  const isHighGas = gasPrice ? Number(formatGwei(gasPrice)) > HIGH_GAS_THRESHOLD : false;

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            className="flex items-center gap-2"
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <motion.button
                    onClick={openConnectModal}
                    className="flex items-center space-x-2 btn-primary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Connect Wallet</span>
                  </motion.button>
                );
              }

              if (chain.unsupported) {
                return (
                  <motion.button
                    onClick={openChainModal}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                  >
                    ⚠️ Wrong Network
                  </motion.button>
                );
              }

              return (
                <>
                  {/* Gas Warning Badge - Mobile */}
                  {isHighGas && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="md:hidden flex items-center space-x-1 px-2 py-1 bg-yellow-500/20 rounded-lg"
                      title="High gas fees"
                    >
                      <AlertTriangle className="w-3 h-3 text-yellow-400" />
                    </motion.div>
                  )}

                  {/* Gas Display - Desktop */}
                  <div className="hidden lg:block">
                    <GasEstimateDisplay />
                  </div>

                  {/* Network Selector */}
                  <motion.button
                    onClick={openChainModal}
                    className="hidden md:flex items-center space-x-2 px-3 py-2 bg-surface/50 text-white rounded-lg hover:bg-surface transition-all border border-white/10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img src={chain.iconUrl} alt={chain.name} className="w-5 h-5 rounded-full" />
                    )}
                    <span className="text-sm font-medium">{chain.name}</span>
                  </motion.button>

                  {/* Balance Display */}
                  <div className="hidden md:flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
                    <span className="text-xl">💎</span>
                    <span className="text-sm font-bold text-white">
                      {formatVoiceBalance(voiceBalance)}
                    </span>
                  </div>

                  {/* Account Button */}
                  <motion.button
                    onClick={openAccountModal}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                  >
                    <span className="text-sm font-medium">{account.displayName}</span>
                    {account.displayBalance && (
                      <span className="text-xs opacity-75">({account.displayBalance})</span>
                    )}
                  </motion.button>
                </>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
