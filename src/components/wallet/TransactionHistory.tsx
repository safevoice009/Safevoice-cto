import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
  Info,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatVoiceBalance } from '../../lib/tokenEconomics';
import type { VoiceTransaction } from '../../lib/store';

interface TransactionHistoryProps {
  transactions: VoiceTransaction[];
  pageSize?: number;
  showFilters?: boolean;
  showPagination?: boolean;
  maxHeight?: string;
  title?: string;
  subtitle?: string;
  showExport?: boolean;
  visibleCount?: number;
  showHeader?: boolean;
}

type TransactionType = 'all' | 'earn' | 'spend' | 'claim';
type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

interface FilterState {
  type: TransactionType;
  dateRange: DateRangeFilter;
  customStartDate: string;
  customEndDate: string;
  reasonCategory: string;
}

export default function TransactionHistory({
  transactions,
  pageSize = 20,
  showFilters = true,
  showPagination = true,
  maxHeight = 'max-h-[600px]',
  title = 'Transaction History',
  subtitle,
  showExport = true,
  visibleCount,
  showHeader = true,
}: TransactionHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    dateRange: 'all',
    customStartDate: '',
    customEndDate: '',
    reasonCategory: 'all',
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [hoveredTransaction, setHoveredTransaction] = useState<string | null>(null);

  // Extract unique reason categories
  const reasonCategories = useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.reasonCode) {
        categories.add(tx.reasonCode);
      }
    });
    return ['all', ...Array.from(categories).sort()];
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((tx) => tx.type === filters.type);
    }

    // Reason category filter
    if (filters.reasonCategory !== 'all') {
      filtered = filtered.filter((tx) => tx.reasonCode === filters.reasonCategory);
    }

    // Date range filter
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    switch (filters.dateRange) {
      case 'today':
        filtered = filtered.filter((tx) => tx.timestamp >= today);
        break;
      case 'week':
        filtered = filtered.filter((tx) => tx.timestamp >= weekAgo);
        break;
      case 'month':
        filtered = filtered.filter((tx) => tx.timestamp >= monthAgo);
        break;
      case 'custom':
        if (filters.customStartDate) {
          const startTime = new Date(filters.customStartDate).getTime();
          filtered = filtered.filter((tx) => tx.timestamp >= startTime);
        }
        if (filters.customEndDate) {
          const endTime = new Date(filters.customEndDate).setHours(23, 59, 59, 999);
          filtered = filtered.filter((tx) => tx.timestamp <= endTime);
        }
        break;
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    return filtered;
  }, [transactions, filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const startIndex = (currentPageClamped - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = showPagination
    ? filteredTransactions.slice(startIndex, endIndex)
    : filteredTransactions;
  const displayedTransactions = showPagination
    ? paginatedTransactions
    : visibleCount
    ? filteredTransactions.slice(0, visibleCount)
    : filteredTransactions;

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      dateRange: 'all',
      customStartDate: '',
      customEndDate: '',
      reasonCategory: 'all',
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.type !== 'all' || filters.dateRange !== 'all' || filters.reasonCategory !== 'all';
  const headerSubtitle = subtitle !== undefined
    ? subtitle
    : `Showing ${displayedTransactions.length} of ${filteredTransactions.length} transactions`;

  // CSV Export
  const exportToCSV = async () => {
    setExportLoading(true);

    try {
      // Prepare CSV data
      const headers = ['Timestamp', 'Date', 'Type', 'Description', 'Reason Code', 'Amount', 'Running Balance'];
      const rows = filteredTransactions.map((tx) => {
        const date = new Date(tx.timestamp).toLocaleString();
        const claimedAmount = typeof tx.metadata.claimedAmount === 'number' ? tx.metadata.claimedAmount : 0;
        const rawAmount = tx.type === 'claim' ? claimedAmount : tx.amount;
        const signedAmount = tx.type === 'spend' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
        
        return [
          tx.timestamp.toString(),
          date,
          tx.type,
          tx.reason,
          tx.reasonCode || '',
          signedAmount.toString(),
          tx.balance.toString(),
        ];
      });

      // Generate CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `transaction_history_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return formatDate(timestamp);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earn':
        return 'text-green-400';
      case 'spend':
        return 'text-red-400';
      case 'claim':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'earn':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'spend':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'claim':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Export */}
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              {headerSubtitle && (
                <p className="text-sm text-gray-400">
                  {headerSubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {showFilters && (
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  hasActiveFilters
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-surface/50 text-gray-400 hover:bg-surface/70'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 bg-primary rounded-full text-xs font-semibold">
                    Active
                  </span>
                )}
              </button>
            )}

            {showExport && (
              <button
                onClick={exportToCSV}
                disabled={exportLoading || filteredTransactions.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilterPanel && showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Clear all</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Transaction Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange({ type: e.target.value as TransactionType })}
                  className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="earn">Earn</option>
                  <option value="spend">Spend</option>
                  <option value="claim">Claim</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange({ dateRange: e.target.value as DateRangeFilter })}
                  className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Reason Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Category
                </label>
                <select
                  value={filters.reasonCategory}
                  onChange={(e) => handleFilterChange({ reasonCategory: e.target.value })}
                  className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                >
                  {reasonCategories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === 'custom' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.customStartDate}
                    onChange={(e) => handleFilterChange({ customStartDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.customEndDate}
                    onChange={(e) => handleFilterChange({ customEndDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction List */}
      <div className={`glass overflow-hidden ${maxHeight} overflow-y-auto`}>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg">No transactions found</p>
            <p className="text-gray-500 text-sm mt-2">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Start earning VOICE by engaging with the community!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Running Balance
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Info
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {displayedTransactions.map((tx) => {
                  const claimedAmount = typeof tx.metadata.claimedAmount === 'number' ? tx.metadata.claimedAmount : 0;
                  const rawAmount = tx.type === 'claim' ? claimedAmount : tx.amount;
                  const signedAmount = tx.type === 'spend' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
                  const isHovered = hoveredTransaction === tx.id;

                  return (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-surface/30 transition-colors"
                      onMouseEnter={() => setHoveredTransaction(tx.id)}
                      onMouseLeave={() => setHoveredTransaction(null)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-white text-sm">{formatRelativeTime(tx.timestamp)}</span>
                          <span className="text-gray-500 text-xs">{formatDate(tx.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeBadgeColor(tx.type)}`}>
                          {tx.type === 'earn' && <TrendingUp className="w-3 h-3 mr-1" />}
                          {tx.type === 'spend' && <TrendingDown className="w-3 h-3 mr-1" />}
                          {tx.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-white text-sm">{tx.reason}</span>
                          {tx.reasonCode && (
                            <span className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">
                              {tx.reasonCode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${getTypeColor(tx.type)}`}>
                          {signedAmount > 0 ? '+' : ''}{signedAmount} VOICE
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-white text-sm font-medium">
                          {formatVoiceBalance(tx.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="relative inline-block">
                          <Info data-testid="transaction-info-icon" className="w-4 h-4 text-gray-400 hover:text-primary transition-colors cursor-help" />
                          {isHovered && Object.keys(tx.metadata).length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute right-0 top-6 z-50 w-64 p-3 bg-surface border border-white/20 rounded-lg shadow-xl"
                            >
                              <div className="text-xs space-y-1">
                                <p className="font-semibold text-white mb-2">Transaction Details</p>
                                {typeof tx.pending === 'number' && (
                                  <p className="text-gray-400">
                                    Pending: <span className="text-white">{formatVoiceBalance(tx.pending)}</span>
                                  </p>
                                )}
                                {typeof tx.claimed === 'number' && (
                                  <p className="text-gray-400">
                                    Claimed: <span className="text-white">{formatVoiceBalance(tx.claimed)}</span>
                                  </p>
                                )}
                                {typeof tx.spent === 'number' && (
                                  <p className="text-gray-400">
                                    Spent: <span className="text-white">{formatVoiceBalance(tx.spent)}</span>
                                  </p>
                                )}
                                {Object.entries(tx.metadata).map(([key, value]) => (
                                  <p key={key} className="text-gray-400">
                                    {key}: <span className="text-white">{String(value)}</span>
                                  </p>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {showPagination && filteredTransactions.length > 0 && (
        <div className="glass p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              Page {currentPageClamped} of {totalPages} ({filteredTransactions.length} total transactions)
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPageClamped === 1}
                className="flex items-center space-x-1 px-3 py-2 bg-surface/50 rounded-lg text-white hover:bg-surface/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPageClamped <= 3) {
                    pageNum = i + 1;
                  } else if (currentPageClamped >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPageClamped - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        currentPageClamped === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-surface/50 text-gray-400 hover:bg-surface/70 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPageClamped === totalPages}
                className="flex items-center space-x-1 px-3 py-2 bg-surface/50 rounded-lg text-white hover:bg-surface/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
