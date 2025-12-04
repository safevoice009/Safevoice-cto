import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Database, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../lib/store';
import { 
  exportModerationLogs, 
  exportReports, 
  exportMemberStatuses,
  exportCombinedData 
} from '../../lib/admin/reporting';

type ExportFormat = 'csv' | 'json';
type DateRange = '7d' | '30d' | '90d' | 'all';

export default function ReportingExport() {
  const communityModerationLogs = useStore((state) => state.communityModerationLogs) || [];
  const reports = useStore((state) => state.reports) || [];
  const memberStatuses = useStore((state) => state.memberStatuses) || [];
  
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const getDateRangeFilter = () => {
    if (dateRange === 'all') return 0;
    
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }[dateRange];
    
    return Date.now() - (days * 24 * 60 * 60 * 1000);
  };

  const handleExport = (type: 'logs' | 'reports' | 'members' | 'combined') => {
    try {
      const since = getDateRangeFilter();
      let result;

      switch (type) {
        case 'logs':
          result = exportModerationLogs(communityModerationLogs, format, since);
          break;
        case 'reports':
          result = exportReports(reports, format, since);
          break;
        case 'members':
          result = exportMemberStatuses(memberStatuses, format);
          break;
        case 'combined':
          result = exportCombinedData(
            { communityModerationLogs, reports, memberStatuses },
            format,
            since,
            includeMetadata
          );
          break;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `safevoice_${type}_${timestamp}.${format}`;
      
      const blob = new Blob([result], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <div className="glass p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Filter className="w-5 h-5 text-primary" />
          <span>Export Configuration</span>
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-white/10 bg-surface text-primary focus:ring-primary"
              />
              <span>Include metadata</span>
            </label>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleExport('logs')}
          className="glass p-6 rounded-lg text-left hover:bg-primary/10 transition-colors border border-white/10 hover:border-primary/30"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
            <Download className="w-5 h-5 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Moderation Logs</h4>
          <p className="text-sm text-gray-400 mb-3">
            Export all moderation actions and their details
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{communityModerationLogs.length} entries</span>
            <span className="text-primary">Export →</span>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleExport('reports')}
          className="glass p-6 rounded-lg text-left hover:bg-primary/10 transition-colors border border-white/10 hover:border-primary/30"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-400" />
            </div>
            <Download className="w-5 h-5 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">User Reports</h4>
          <p className="text-sm text-gray-400 mb-3">
            Export all user reports and review statuses
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{reports.length} reports</span>
            <span className="text-primary">Export →</span>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleExport('members')}
          className="glass p-6 rounded-lg text-left hover:bg-primary/10 transition-colors border border-white/10 hover:border-primary/30"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Database className="w-6 h-6 text-green-400" />
            </div>
            <Download className="w-5 h-5 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Member Statuses</h4>
          <p className="text-sm text-gray-400 mb-3">
            Export member bans, warnings, and status history
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{memberStatuses.length} members</span>
            <span className="text-primary">Export →</span>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleExport('combined')}
          className="glass p-6 rounded-lg text-left hover:bg-primary/10 transition-colors border border-white/10 hover:border-primary/30"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <Download className="w-5 h-5 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Combined Export</h4>
          <p className="text-sm text-gray-400 mb-3">
            Export all data in a single comprehensive file
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">All data sources</span>
            <span className="text-primary">Export →</span>
          </div>
        </motion.button>
      </div>

      {/* Export Info */}
      <div className="glass p-6 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-3">Export Information</h4>
        <div className="space-y-2 text-xs text-gray-400">
          <p>• CSV exports are optimized for spreadsheet applications</p>
          <p>• JSON exports preserve full data structures and metadata</p>
          <p>• Date ranges filter by record timestamp</p>
          <p>• Metadata includes additional context like IP addresses (when applicable)</p>
          <p>• All exports are generated client-side for privacy</p>
        </div>
      </div>
    </div>
  );
}
