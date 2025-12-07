/**
 * Storage Stats Dashboard
 * Shows network health, storage usage, media library, and cost savings
 */

import { useEffect, useState } from 'react';
import { useStorageStore } from '../../lib/storageStore';
import { getStorageRouter } from '../../lib/storage/router/StorageRouter';
import { getStorageService } from '../../lib/storage/StorageService';
import {
  HardDrive,
  Wifi,
  TrendingDown,
  Database,
  Users,
  Zap,
  DollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';

export function StorageStats() {
  const storageStore = useStorageStore();
  const [storageStats, setStorageStats] = useState<Awaited<
    ReturnType<Awaited<ReturnType<typeof getStorageService>>['getStats']>
  > | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const service = await getStorageService();
        const stats = await service.getStats();
        setStorageStats(stats);
      } catch (error) {
        console.error('Failed to load storage stats:', error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    storageStore.updateNetworkHealth();
  }, [storageStore]);

  const router = getStorageRouter();
  const capacity = router.getTotalCapacity();
  const costAnalysis = router.getCostAnalysis();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    unit,
    color,
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    unit?: string;
    color: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-background border border-border rounded-lg p-4 space-y-2 ${color}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">{title}</p>
        <div className="p-2 bg-background rounded">{Icon}</div>
      </div>
      <p className="text-2xl font-bold text-text">
        {value}
        {unit && <span className="text-sm ml-1 text-text-muted">{unit}</span>}
      </p>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Network Health */}
      {storageStore.networkHealth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-background border border-border rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-info" />
            <h3 className="text-lg font-semibold text-text">Network Health</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-text-muted">P2P Health</p>
              <div className="w-full bg-border rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-success to-info h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${storageStore.networkHealth.p2pHealth}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm font-medium">{storageStore.networkHealth.p2pHealth}%</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-text-muted">IPFS Network</p>
              <div className="w-full bg-border rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-warning to-info h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${storageStore.networkHealth.ipfsHealth}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm font-medium">{storageStore.networkHealth.ipfsHealth}%</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-text-muted">Overall Availability</p>
              <div className="w-full bg-border rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-primary to-info h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${storageStore.networkHealth.estimatedAvailability}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm font-medium">
                {storageStore.networkHealth.estimatedAvailability}%
              </p>
            </div>
          </div>

          <p className="text-sm text-text-muted">
            Status:{' '}
            <span className="text-text font-medium capitalize">
              {storageStore.networkHealth.status}
            </span>
          </p>
        </motion.div>
      )}

      {/* Storage Stats Grid */}
      {storageStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<HardDrive className="h-5 w-5 text-primary" />}
            title="Local Storage Used"
            value={formatBytes(storageStats.localStorageStats.totalSize)}
            color="border-primary/20"
          />

          <StatCard
            icon={<Database className="h-5 w-5 text-info" />}
            title="Media Files"
            value={storageStats.totalMediaCount}
            color="border-info/20"
          />

          <StatCard
            icon={<Users className="h-5 w-5 text-success" />}
            title="Connected Peers"
            value={storageStats.routerMetrics.availablePeers}
            color="border-success/20"
          />

          <StatCard
            icon={<Zap className="h-5 w-5 text-warning" />}
            title="P2P Bandwidth"
            value={
              storageStats.routerMetrics.availablePeers > 0
                ? `${(storageStats.routerMetrics.availablePeers * 1.5).toFixed(1)}`
                : '0'
            }
            unit="MB/s"
            color="border-warning/20"
          />
        </div>
      )}

      {/* Cost Savings Analysis */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-background border border-success/30 rounded-lg p-6 space-y-4 bg-success/5"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-success" />
          <h3 className="text-lg font-semibold text-text">Cost Comparison</h3>
        </div>

        <div className="space-y-3">
          {costAnalysis.map((analysis) => (
            <div
              key={analysis.strategy}
              className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
            >
              <div className="space-y-1">
                <p className="font-medium text-text">{analysis.strategy}</p>
                <p className="text-xs text-text-muted">{analysis.description}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-text">
                  ${analysis.yearlyCost.toLocaleString()}/year
                </p>
                {analysis.yearlyCost > 0 && (
                  <p className="text-xs text-success flex items-center gap-1 justify-end">
                    <TrendingDown className="h-3 w-3" />
                    Save ${analysis.yearlyCost.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-success font-medium">
          💚 SafeVoice Hybrid P2P: Free forever, powered by community
        </p>
      </motion.div>

      {/* Media Library */}
      {storageStore.mediaItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-background border border-border rounded-lg p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-text">Media Library</h3>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {storageStore.mediaItems.map((media) => (
              <div
                key={media.id}
                className="flex items-center justify-between p-3 bg-background/50 rounded border border-border/50"
              >
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium text-text truncate">{media.fileName}</p>
                  <p className="text-xs text-text-muted">
                    {formatBytes(media.size)} • {new Date(media.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-info/10 text-info rounded">
                    {media.redundancy} copies
                  </span>
                  <span className="px-2 py-1 bg-success/10 text-success rounded">
                    {media.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Total Capacity */}
      {storageStats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-background border border-border rounded-lg p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-text">Storage Capacity</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 text-center p-3 bg-background/50 rounded">
              <p className="text-xs text-text-muted">Local</p>
              <p className="font-semibold text-text">{formatBytes(capacity.localCapacity)}</p>
            </div>
            <div className="space-y-2 text-center p-3 bg-background/50 rounded">
              <p className="text-xs text-text-muted">P2P</p>
              <p className="font-semibold text-text">{formatBytes(capacity.p2pCapacity)}</p>
            </div>
            <div className="space-y-2 text-center p-3 bg-background/50 rounded">
              <p className="text-xs text-text-muted">IPFS</p>
              <p className="font-semibold text-text">Unlimited</p>
            </div>
            <div className="space-y-2 text-center p-3 bg-background/50 rounded">
              <p className="text-xs text-text-muted">GitHub</p>
              <p className="font-semibold text-text">{formatBytes(capacity.githubCapacity)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-text-muted">Total Available Capacity</p>
            <p className="text-2xl font-bold text-text">
              {capacity.totalCapacity === Infinity ? '∞' : formatBytes(capacity.totalCapacity)}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
