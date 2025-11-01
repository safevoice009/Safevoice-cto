import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../lib/store';
import TransactionHistory from '../components/wallet/TransactionHistory';

export default function TransactionHistoryPage() {
  const navigate = useNavigate();
  const transactionHistory = useStore((state) => state.transactionHistory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center space-x-2 px-4 py-2 bg-surface/50 text-gray-400 rounded-lg hover:bg-surface/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </button>
        </div>

        {/* Transaction History Component */}
        <TransactionHistory
          transactions={transactionHistory}
          pageSize={20}
          showFilters={true}
          showPagination={true}
          maxHeight="max-h-[800px]"
        />
      </motion.div>
    </div>
  );
}
