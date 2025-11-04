import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useNetwork, useSwitchNetwork } from 'wagmi';
import { mainnet, polygon, bsc, arbitrum, optimism, base } from 'wagmi/chains';
import toast from 'react-hot-toast';

const SUPPORTED_CHAINS = [mainnet, polygon, bsc, arbitrum, optimism, base];

export default function NetworkSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { chain } = useNetwork();
  const { switchNetwork, isLoading, pendingChainId } = useSwitchNetwork({
    onSuccess: (data) => {
      toast.success(`Switched to ${data.name}`);
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to switch network: ${error.message}`);
    },
  });

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-surface/50 text-white rounded-lg hover:bg-surface transition-all border border-white/10"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
      >
        <Network className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">{chain?.name || 'Select Network'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 right-0 w-56 bg-surface border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {SUPPORTED_CHAINS.map((supportedChain) => {
                const isActive = chain?.id === supportedChain.id;
                const isSwitching = isLoading && pendingChainId === supportedChain.id;

                return (
                  <button
                    key={supportedChain.id}
                    onClick={() => {
                      if (!isActive && switchNetwork) {
                        switchNetwork(supportedChain.id);
                      }
                    }}
                    disabled={isActive || isSwitching}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-primary/10 transition-colors ${
                      isActive ? 'bg-primary/20' : ''
                    } ${isActive || isSwitching ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-xs font-bold">
                        {supportedChain.name.charAt(0)}
                      </div>
                      <span className="text-sm text-white font-medium">{supportedChain.name}</span>
                    </div>
                    {isSwitching && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                    {isActive && !isSwitching && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
