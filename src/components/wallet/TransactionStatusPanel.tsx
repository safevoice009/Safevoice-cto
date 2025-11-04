import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { QueuedTransaction } from '../../lib/web3/types';

interface TransactionStatusPanelProps {
  transactions: QueuedTransaction[];
  className?: string;
}

export default function TransactionStatusPanel({ transactions, className = '' }: TransactionStatusPanelProps) {
  const [visible, setVisible] = useState(true);

  const pendingTxs = transactions.filter(tx => 
    tx.status === 'pending' || tx.status === 'submitted'
  );
  const recentTxs = transactions
    .filter(tx => tx.status === 'confirmed' || tx.status === 'failed')
    .sort((a, b) => (b.confirmationTimestamp || b.timestamp) - (a.confirmationTimestamp || a.timestamp))
    .slice(0, 3);

  const allTxs = [...pendingTxs, ...recentTxs];

  useEffect(() => {
    setVisible(allTxs.length > 0);
  }, [allTxs.length]);

  if (!visible || allTxs.length === 0) {
    return null;
  }

  const getStatusIcon = (status: QueuedTransaction['status']) => {
    switch (status) {
      case 'pending':
      case 'submitted':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusText = (status: QueuedTransaction['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'submitted':
        return 'Submitted';
      case 'confirmed':
        return 'Confirmed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
    }
  };

  const getTypeLabel = (type: QueuedTransaction['type']) => {
    switch (type) {
      case 'claim':
        return 'Claim Rewards';
      case 'burn':
        return 'Burn Tokens';
      case 'stake':
        return 'Stake';
      case 'unstake':
        return 'Unstake';
      case 'claimStaking':
        return 'Claim Staking';
      case 'mintNFT':
        return 'Mint NFT';
      case 'vote':
        return 'Vote';
      case 'transfer':
        return 'Transfer';
    }
  };

  const getExplorerUrl = (hash: string) => {
    // This should be dynamic based on the chain
    return `https://etherscan.io/tx/${hash}`;
  };

  return (
    <div className={`glass p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
          <Clock className="w-4 h-4 text-primary" />
          <span>Transaction Status</span>
        </h3>
        {allTxs.length > 0 && (
          <button
            onClick={() => setVisible(false)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Hide
          </button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {allTxs.map((tx) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex items-center justify-between p-3 bg-surface/30 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(tx.status)}
              <div className="flex flex-col">
                <span className="text-sm text-white font-medium">{getTypeLabel(tx.type)}</span>
                <span className="text-xs text-gray-400">{getStatusText(tx.status)}</span>
              </div>
            </div>
            
            {tx.hash && (
              <a
                href={getExplorerUrl(tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
                title="View on Explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
