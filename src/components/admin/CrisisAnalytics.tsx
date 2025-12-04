import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Activity,
  TrendingDown
} from 'lucide-react';
import { getCrisisQueueService, type CrisisRequest } from '../../lib/crisisQueue';

interface CrisisMetrics {
  totalRequests: number;
  pendingRequests: number;
  assignedRequests: number;
  resolvedRequests: number;
  criticalRequests: number;
  highRequests: number;
  averageTimeToAssign: number;
  averageTimeToResolve: number;
}

export default function CrisisAnalytics() {
  const [metrics, setMetrics] = useState<CrisisMetrics>({
    totalRequests: 0,
    pendingRequests: 0,
    assignedRequests: 0,
    resolvedRequests: 0,
    criticalRequests: 0,
    highRequests: 0,
    averageTimeToAssign: 0,
    averageTimeToResolve: 0,
  });

  useEffect(() => {
    const crisisService = getCrisisQueueService();
    
    const calculateMetrics = (requests: CrisisRequest[]) => {
      const pending = requests.filter(r => r.status === 'pending');
      const assigned = requests.filter(r => r.status === 'assigned');
      const resolved = requests.filter(r => r.status === 'resolved');
      const critical = requests.filter(r => r.crisisLevel === 'critical');
      const high = requests.filter(r => r.crisisLevel === 'high');

      const assignedWithTimestamp = assigned.filter(r => r.metadata?.assignedAt);
      const avgTimeToAssign = assignedWithTimestamp.length > 0
        ? assignedWithTimestamp.reduce((sum, r) => {
            const assignedAt = r.metadata?.assignedAt as number;
            return sum + (assignedAt - r.timestamp);
          }, 0) / assignedWithTimestamp.length
        : 0;

      const resolvedWithTimestamp = resolved.filter(r => r.metadata?.resolvedAt);
      const avgTimeToResolve = resolvedWithTimestamp.length > 0
        ? resolvedWithTimestamp.reduce((sum, r) => {
            const resolvedAt = r.metadata?.resolvedAt as number;
            return sum + (resolvedAt - r.timestamp);
          }, 0) / resolvedWithTimestamp.length
        : 0;

      setMetrics({
        totalRequests: requests.length,
        pendingRequests: pending.length,
        assignedRequests: assigned.length,
        resolvedRequests: resolved.length,
        criticalRequests: critical.length,
        highRequests: high.length,
        averageTimeToAssign: avgTimeToAssign / 1000 / 60, // Convert to minutes
        averageTimeToResolve: avgTimeToResolve / 1000 / 60, // Convert to minutes
      });
    };

    const initialRequests = crisisService.getSnapshot();
    calculateMetrics(initialRequests);

    const unsubscribe = crisisService.subscribe('crisis-analytics', () => {
      const updatedRequests = crisisService.getSnapshot();
      calculateMetrics(updatedRequests);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const formatTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-gray-400">Total</span>
          </div>
          <p className="text-3xl font-bold text-white">{metrics.totalRequests}</p>
          <p className="text-sm text-gray-400 mt-1">Requests</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-4 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-gray-400">Pending</span>
          </div>
          <p className="text-3xl font-bold text-white">{metrics.pendingRequests}</p>
          <p className="text-sm text-gray-400 mt-1">Awaiting Response</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-4 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <span className="text-xs text-gray-400">Assigned</span>
          </div>
          <p className="text-3xl font-bold text-white">{metrics.assignedRequests}</p>
          <p className="text-sm text-gray-400 mt-1">In Progress</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-4 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-xs text-gray-400">Resolved</span>
          </div>
          <p className="text-3xl font-bold text-white">{metrics.resolvedRequests}</p>
          <p className="text-sm text-gray-400 mt-1">Completed</p>
        </motion.div>
      </div>

      {/* Severity Distribution */}
      <div className="glass p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Severity Distribution</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface/50 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Critical</span>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                High Priority
              </span>
            </div>
            <p className="text-2xl font-bold text-red-400">{metrics.criticalRequests}</p>
            <p className="text-xs text-gray-400 mt-1">
              {metrics.totalRequests > 0 
                ? `${Math.round((metrics.criticalRequests / metrics.totalRequests) * 100)}% of total`
                : 'No data'}
            </p>
          </div>

          <div className="bg-surface/50 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">High</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                Medium Priority
              </span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{metrics.highRequests}</p>
            <p className="text-xs text-gray-400 mt-1">
              {metrics.totalRequests > 0 
                ? `${Math.round((metrics.highRequests / metrics.totalRequests) * 100)}% of total`
                : 'No data'}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="glass p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300">Avg. Time to Assign</span>
              <TrendingDown className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatTime(metrics.averageTimeToAssign)}
            </p>
            <p className="text-xs text-gray-400 mt-2">MTTA (Mean Time to Assign)</p>
          </div>

          <div className="bg-surface/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300">Avg. Time to Resolve</span>
              <TrendingDown className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatTime(metrics.averageTimeToResolve)}
            </p>
            <p className="text-xs text-gray-400 mt-2">MTTR (Mean Time to Resolve)</p>
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className="glass p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Response Rate</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 h-2 bg-surface rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ 
                    width: metrics.totalRequests > 0 
                      ? `${((metrics.assignedRequests + metrics.resolvedRequests) / metrics.totalRequests) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <span className="text-sm font-medium text-white">
                {metrics.totalRequests > 0 
                  ? `${Math.round(((metrics.assignedRequests + metrics.resolvedRequests) / metrics.totalRequests) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Resolution Rate</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 h-2 bg-surface rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ 
                    width: metrics.totalRequests > 0 
                      ? `${(metrics.resolvedRequests / metrics.totalRequests) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <span className="text-sm font-medium text-white">
                {metrics.totalRequests > 0 
                  ? `${Math.round((metrics.resolvedRequests / metrics.totalRequests) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
