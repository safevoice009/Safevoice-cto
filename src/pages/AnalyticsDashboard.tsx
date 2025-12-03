import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Users,
  Clock,
  Flame,
  Shield,
  Heart,
  MessageSquare,
  Download,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useAnalyticsStore } from '../lib/analytics/analyticsStore';
import type { FeatureAdoption } from '../lib/analytics/events';

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const {
    getReport,
    refreshReport,
    getMAU,
    getDAU,
    getAvgSessionDuration,
    getRetentionReport,
    getEngagementTrends,
    getFeatureHeatmap,
    getStickiness,
    exportReport,
    selectedTimeRange,
    setTimeRange,
    trackingEnabled,
    optedOut,
  } = useAnalyticsStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshReport();
    setIsLoading(false);
  }, [refreshReport]);

  const report = getReport();
  const mau = getMAU();
  const dau = getDAU();
  const avgSessionDuration = getAvgSessionDuration();
  const retention = getRetentionReport();
  const engagementTrends = getEngagementTrends();
  const featureHeatmap = getFeatureHeatmap();
  const stickiness = getStickiness();

  // Format duration in minutes
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (optedOut || !trackingEnabled) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center"
        >
          <Shield className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            {t('analytics.optedOut')}
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300">
            {t('analytics.optedOutMessage')}
          </p>
        </motion.div>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const { metrics, features, communityHealth } = report;
  const latestMetrics = metrics[metrics.length - 1] || null;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('analytics.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('analytics.subtitle')}
        </p>
      </motion.div>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['7d', '30d', '90d', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedTimeRange === range
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t(`analytics.timeRange.${range}`)}
          </button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={Users}
          label={t('analytics.mau')}
          value={mau.toString()}
          color="blue"
        />
        <MetricCard
          icon={Flame}
          label={t('analytics.dau')}
          value={dau.toString()}
          color="orange"
        />
        <MetricCard
          icon={Clock}
          label={t('analytics.avgSession')}
          value={formatDuration(avgSessionDuration)}
          color="green"
        />
        <MetricCard
          icon={BarChart3}
          label={t('analytics.totalSessions')}
          value={report.totalSessions.toString()}
          color="purple"
        />
      </div>

      {/* Daily Activity */}
      {latestMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('analytics.dailyActivity')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActivityStat
              icon={MessageSquare}
              label={t('analytics.posts')}
              value={latestMetrics.postsCreated}
            />
            <ActivityStat
              icon={MessageSquare}
              label={t('analytics.comments')}
              value={latestMetrics.commentsCreated}
            />
            <ActivityStat
              icon={Heart}
              label={t('analytics.reactions')}
              value={latestMetrics.reactionsGiven}
            />
            <ActivityStat
              icon={Users}
              label={t('analytics.communities')}
              value={latestMetrics.communitiesJoined}
            />
          </div>
        </motion.div>
      )}

      {/* Feature Adoption */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('analytics.featureAdoption')}
        </h2>
        <div className="space-y-4">
          {features.map((feature) => (
            <FeatureAdoptionBar key={feature.featureName} feature={feature} />
          ))}
          {features.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              {t('analytics.noFeatureData')}
            </p>
          )}
        </div>
      </motion.div>

      {/* Community Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('analytics.communityHealth')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthMetric
            label={t('analytics.totalPosts')}
            value={communityHealth.totalPosts}
          />
          <HealthMetric
            label={t('analytics.avgPostsPerDay')}
            value={communityHealth.avgPostsPerDay.toFixed(1)}
          />
          <HealthMetric
            label={t('analytics.engagementRate')}
            value={`${communityHealth.engagementRate.toFixed(1)}%`}
          />
        </div>
      </motion.div>

      {/* Retention Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('analytics.retention.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('analytics.retention.subtitle')}
            </p>
          </div>
          <TrendingUp className="h-6 w-6 text-primary-500" />
        </div>
        {retention && retention.cohorts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RetentionCard
              label={t('analytics.retention.week1')}
              value={`${retention.overallRetention.week1.toFixed(1)}%`}
              color="green"
            />
            <RetentionCard
              label={t('analytics.retention.week4')}
              value={`${retention.overallRetention.week4.toFixed(1)}%`}
              color="blue"
            />
            <RetentionCard
              label={t('analytics.retention.week12')}
              value={`${retention.overallRetention.week12.toFixed(1)}%`}
              color="purple"
            />
            <RetentionCard
              label={t('analytics.retention.churnRate')}
              value={`${retention.churnRate.toFixed(1)}%`}
              color="orange"
            />
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {t('analytics.retention.noData')}
          </p>
        )}
      </motion.div>

      {/* Engagement Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('analytics.engagement.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('analytics.engagement.subtitle')}
            </p>
          </div>
          <Activity className="h-6 w-6 text-primary-500" />
        </div>
        {engagementTrends.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EngagementMetric
                label={t('analytics.engagement.stickiness')}
                value={`${(stickiness * 100).toFixed(1)}%`}
                description={t('analytics.engagement.stickinessDescription')}
              />
              <EngagementMetric
                label={t('analytics.engagement.engagementScore')}
                value={engagementTrends[engagementTrends.length - 1]?.engagementScore.toFixed(1) || '0'}
                description={t('analytics.engagement.trend')}
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {t('analytics.engagement.noData')}
          </p>
        )}
      </motion.div>

      {/* Feature Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('analytics.heatmap.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('analytics.heatmap.subtitle')}
            </p>
          </div>
        </div>
        {featureHeatmap.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{t('analytics.heatmap.lowUsage')}</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-primary-100 dark:bg-primary-900/20 rounded"></div>
                <div className="w-4 h-4 bg-primary-300 dark:bg-primary-700/40 rounded"></div>
                <div className="w-4 h-4 bg-primary-500 dark:bg-primary-500/60 rounded"></div>
                <div className="w-4 h-4 bg-primary-700 dark:bg-primary-300 rounded"></div>
              </div>
              <span>{t('analytics.heatmap.highUsage')}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t('analytics.heatmap.noData')}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {t('analytics.heatmap.noData')}
          </p>
        )}
      </motion.div>

      {/* Export Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('analytics.export.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('analytics.export.description')}
            </p>
          </div>
          <Download className="h-6 w-6 text-primary-500" />
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => exportReport('csv')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('analytics.export.formatCSV')}
          </button>
          <button
            onClick={() => exportReport('json')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('analytics.export.formatJSON')}
          </button>
        </div>
      </motion.div>

      {/* Privacy Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              {t('analytics.privacyNotice')}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('analytics.privacyMessage')}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: 'blue' | 'orange' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${colorClasses[color]} border rounded-lg p-6`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-6 w-6" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </motion.div>
  );
}

// Activity Stat Component
function ActivityStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

// Feature Adoption Bar Component
function FeatureAdoptionBar({ feature }: { feature: FeatureAdoption }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {feature.featureName}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {feature.totalUsage} uses · {feature.uniqueUsers} users
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(feature.adoptionRate, 100)}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {feature.adoptionRate.toFixed(1)}% adoption rate
      </div>
    </div>
  );
}

// Health Metric Component
function HealthMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

// Retention Card Component
function RetentionCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// Engagement Metric Component
function EngagementMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{label}</div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
    </div>
  );
}
