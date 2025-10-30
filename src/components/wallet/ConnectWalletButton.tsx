import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';

import { useStore } from '../../lib/store';
import { formatVoiceBalance } from '../../lib/tokenEconomics';

export default function ConnectWalletButton() {
  const voiceBalance = useStore((state) => state.voiceBalance);
  const setConnectedAddress = useStore((state) => state.setConnectedAddress);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    setConnectedAddress(isConnected ? address ?? null : null);
  }, [address, isConnected, setConnectedAddress]);

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
                  <motion.button
                    onClick={openChainModal}
                    className="hidden md:flex items-center space-x-2 px-3 py-2 bg-surface/50 text-white rounded-lg hover:bg-surface transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img src={chain.iconUrl} alt={chain.name} className="w-5 h-5 rounded-full" />
                    )}
                    <span className="text-sm font-medium">{chain.name}</span>
                  </motion.button>

                  <div className="hidden md:flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
                    <span className="text-xl">💎</span>
                    <span className="text-sm font-bold text-white">
                      {formatVoiceBalance(voiceBalance)}
                    </span>
                  </div>

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
