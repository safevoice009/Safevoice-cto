import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { formatVoiceBalance } from '../lib/tokenEconomics';

type TransactionType = 'all' | 'earn' | 'spend' | 'claim';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';
type SortField = 'timestamp' | 'amount' | 'balance';
type SortOrder = 'asc' | 'desc';

const getMetadataNumber = (metadata: Record<string, unknown> | undefined, key: string): number | null => {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === 'number' ? value : null;
};

const getMetadataString = (metadata: Record<string, unknown> | undefined, key: string): string | null => {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === 'string' ? value : null;
};

export default function Transactions() {
  const { transactionHistory, walletLoading, walletError, loadWalletData } = useStore((state) => ({
    transactionHistory: state.transactionHistory,
    walletLoading: state.walletLoading,
    walletError: state.walletError,
    loadWalletData: state.loadWalletData,
  }));
  
  const transactionCount = transactionHistory.length;
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Category filter for earn transactions
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Get unique categories from earn transactions
  const categories = useMemo(() => {
    const cats = new Set<string>();
    transactionHistory.forEach((tx) => {
      if (tx.type === 'earn' && tx.metadata) {
        const categoryRaw = tx.metadata['category'];
        if (typeof categoryRaw === 'string') {
          cats.add(categoryRaw);
        }
      }
    });
    return ['all', ...Array.from(cats).sort()];
  }, [transactionHistory]);

  // Format date helper
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format relative date
  const formatRelativeDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactionHistory];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === typeFilter);
    }

    // Category filter (only for earn transactions)
    if (categoryFilter !== 'all' && typeFilter === 'earn') {
      filtered = filtered.filter((tx) => {
        if (tx.type === 'earn' && tx.metadata) {
          const categoryRaw = tx.metadata['category'];
          if (typeof categoryRaw === 'string') {
            return categoryRaw === categoryFilter;
          }
        }
        return false;
      });
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      let cutoff = 0;

      switch (dateFilter) {
        case 'today':
          cutoff = now - dayMs;
          break;
        case 'week':
          cutoff = now - 7 * dayMs;
          break;
        case 'month':
          cutoff = now - 30 * dayMs;
          break;
        case 'year':
          cutoff = now - 365 * dayMs;
          break;
      }

      filtered = filtered.filter((tx) => tx.timestamp >= cutoff);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((tx) => {
        return (
          tx.reason.toLowerCase().includes(query) ||
          (tx.reasonCode && tx.reasonCode.toLowerCase().includes(query)) ||
          tx.type.toLowerCase().includes(query)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case 'balance':
          comparison = a.balance - b.balance;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [transactionHistory, typeFilter, categoryFilter, dateFilter, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, categoryFilter, dateFilter, searchQuery, sortField, sortOrder]);

  // Calculate running balance
  const transactionsWithRunningBalance = useMemo(() => {
    return paginatedTransactions.map((tx) => ({
      ...tx,
      runningBalance: tx.balance,
    }));
  }, [paginatedTransactions]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Type',
      'Reason',
      'Amount',
      'Balance After',
      'Pending',
      'Category',
    ];

    const rows = filteredTransactions.map((tx) => {
      const metadata = tx.metadata ?? {};
      const claimedAmount = getMetadataNumber(metadata, 'claimedAmount') ?? 0;
      const rawAmount = tx.type === 'claim' ? claimedAmount : tx.amount;
      const signedAmount = tx.type === 'spend' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
      const category = getMetadataString(metadata, 'category') ?? '';

      return [
        formatDate(tx.timestamp),
        tx.type.toUpperCase(),
        `"${tx.reason}"`,
        signedAmount,
        tx.balance,
        tx.pending || 0,
        category,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Load wallet data on mount
  useEffect(() => {
    if (transactionCount === 0 && !walletLoading) {
      loadWalletData();
    }
  }, [transactionCount, walletLoading, loadWalletData]);

  const isInitialLoading = walletLoading && transactionCount === 0;
  const hasErrorWithoutData = Boolean(walletError) && transactionCount === 0;
  const hasTransactions = transactionCount > 0;

  if (isInitialLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-10 text-center"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary border-t-transparent" />
            <p className="text-gray-300 text-lg font-medium">Loading your transactions...</p>
            <p className="text-sm text-gray-500">Fetching the latest wallet activity</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (hasErrorWithoutData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 space-y-4 border border-red-500/30 bg-red-500/10"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-semibold text-white">Unable to load transactions</h1>
              <p className="text-sm text-gray-300 mt-1">{walletError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadWalletData}
            className="inline-flex items-center justify-center px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <Clock className="w-8 h-8 text-primary" />
              <span>Transaction History</span>
            </h1>
            <p className="text-gray-400 mt-2">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
              {typeFilter !== 'all' && ` · ${typeFilter}`}
              {dateFilter !== 'all' && ` · ${dateFilter}`}
            </p>
            {walletLoading && hasTransactions && (
              <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>Syncing latest transactions...</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-surface/50 hover:bg-surface rounded-lg text-white transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(typeFilter !== 'all' || dateFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
                <span className="ml-1 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                  Active
                </span>
              )}
            </button>
            
            <button
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 border-t border-white/10 space-y-4"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-10 pr-10 py-2 bg-surface/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TransactionType)}
                  className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Types</option>
                  <option value="earn">Earn</option>
                  <option value="spend">Spend</option>
                  <option value="claim">Claim</option>
                </select>
              </div>

              {/* Category Filter (only show if earn type is selected) */}
              {typeFilter === 'earn' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Filter */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last Year</option>
                </select>
              </div>

              {/* Items Per Page */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Items Per Page</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(typeFilter !== 'all' || dateFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setDateFilter('all');
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Transactions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-6 space-y-4"
      >
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No transactions found</p>
            <p className="text-sm mt-2">
              {searchQuery || typeFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start earning VOICE by creating posts!'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="pb-3 text-sm font-medium text-gray-400">
                      <button
                        onClick={() => handleSort('timestamp')}
                        className="flex items-center space-x-1 hover:text-white transition-colors"
                      >
                        <span>Date</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Type</th>
                    <th className="pb-3 text-sm font-medium text-gray-400">Description</th>
                    <th className="pb-3 text-sm font-medium text-gray-400 text-right">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center space-x-1 ml-auto hover:text-white transition-colors"
                      >
                        <span>Amount</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="pb-3 text-sm font-medium text-gray-400 text-right">
                      <button
                        onClick={() => handleSort('balance')}
                        className="flex items-center space-x-1 ml-auto hover:text-white transition-colors"
                      >
                        <span>Balance</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithRunningBalance.map((tx, index) => {
                    const metadata = tx.metadata ?? {};
                    const claimedAmount = getMetadataNumber(metadata, 'claimedAmount') ?? 0;
                    const rawAmount = tx.type === 'claim' ? claimedAmount : tx.amount;
                    const signedAmount = tx.type === 'spend' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
                    const amountColor =
                      tx.type === 'spend'
                        ? 'text-red-400'
                        : tx.type === 'claim'
                        ? 'text-blue-400'
                        : 'text-green-400';
                    const typeIcon =
                      tx.type === 'spend' ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : tx.type === 'claim' ? (
                        <DollarSign className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      );
                    const category = getMetadataString(metadata, 'category');

                    return (
                      <tr
                        key={tx.id}
                        className={`border-b border-white/5 hover:bg-surface/30 transition-colors ${
                          index === 0 ? 'border-t' : ''
                        }`}
                      >
                        <td className="py-4">
                          <div>
                            <p className="text-white text-sm">{formatDate(tx.timestamp)}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{formatRelativeDate(tx.timestamp)}</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className={`flex items-center space-x-2 ${amountColor}`}>
                            {typeIcon}
                            <span className="text-sm font-medium uppercase">{tx.type}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="text-white text-sm">{tx.reason}</p>
                            {tx.reasonCode && (
                              <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                                {tx.reasonCode}
                              </span>
                            )}
                            {category && (
                              <span className="inline-block mt-1 ml-2 text-[10px] uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                {category}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-4 text-right font-semibold ${amountColor}`}>
                          {signedAmount > 0 ? '+' : ''}
                          {formatVoiceBalance(Math.abs(signedAmount))}
                        </td>
                        <td className="py-4 text-right">
                          <p className="text-white font-medium">{formatVoiceBalance(tx.runningBalance)}</p>
                          {typeof tx.pending === 'number' && tx.pending > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Pending: {formatVoiceBalance(tx.pending)}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {transactionsWithRunningBalance.map((tx) => {
                const metadata = tx.metadata ?? {};
                const claimedAmount = getMetadataNumber(metadata, 'claimedAmount') ?? 0;
                const rawAmount = tx.type === 'claim' ? claimedAmount : tx.amount;
                const signedAmount = tx.type === 'spend' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
                const amountColor =
                  tx.type === 'spend'
                    ? 'text-red-400'
                    : tx.type === 'claim'
                    ? 'text-blue-400'
                    : 'text-green-400';
                const typeIcon =
                  tx.type === 'spend' ? (
                    <TrendingDown className="w-5 h-5" />
                  ) : tx.type === 'claim' ? (
                    <DollarSign className="w-5 h-5" />
                  ) : (
                    <TrendingUp className="w-5 h-5" />
                  );
                const category = getMetadataString(metadata, 'category');

                return (
                  <div
                    key={tx.id}
                    className="p-4 bg-surface/30 rounded-lg hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={amountColor}>{typeIcon}</div>
                        <div>
                          <p className="text-white font-medium">{tx.reason}</p>
                          {tx.reasonCode && (
                            <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                              {tx.reasonCode}
                            </span>
                          )}
                          {category && (
                            <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`text-right font-semibold ${amountColor}`}>
                        {signedAmount > 0 ? '+' : ''}
                        {formatVoiceBalance(Math.abs(signedAmount))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formatRelativeDate(tx.timestamp)}</span>
                      </div>
                      <div className="text-gray-300">
                        Balance: <span className="font-medium text-white">{formatVoiceBalance(tx.runningBalance)}</span>
                      </div>
                    </div>

                    {category && (
                      <div className="mt-2">
                        <span className="text-[10px] uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {category}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of{' '}
                  {filteredTransactions.length} transactions
                </p>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-surface/50 hover:bg-surface rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber: number;
                      
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNumber
                              ? 'bg-primary text-white'
                              : 'bg-surface/50 text-gray-400 hover:bg-surface hover:text-white'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-surface/50 hover:bg-surface rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
