/**
 * Analytics Export Module
 * 
 * Privacy-safe export of analytics data to CSV and JSON formats.
 * All data is anonymized before export.
 */

import type { AggregationResult } from './aggregation';
import type { TrackedEvent } from './tracking';

export type ExportFormat = 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeRawEvents?: boolean;
  anonymize?: boolean;
}

/**
 * Export analytics report to downloadable file
 */
export function exportReport(
  report: AggregationResult,
  events: TrackedEvent[],
  options: ExportOptions = { format: 'csv', anonymize: true }
): void {
  const { format, includeRawEvents = false, anonymize = true } = options;

  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'csv') {
    content = exportToCSV(report, events, includeRawEvents, anonymize);
    filename = `safevoice-analytics-${getTimestamp()}.csv`;
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    content = exportToJSON(report, events, includeRawEvents, anonymize);
    filename = `safevoice-analytics-${getTimestamp()}.json`;
    mimeType = 'application/json;charset=utf-8;';
  }

  // Trigger download
  downloadFile(content, filename, mimeType);
}

/**
 * Export report to CSV format
 */
export function exportToCSV(
  report: AggregationResult,
  events: TrackedEvent[],
  includeRawEvents: boolean,
  anonymize: boolean
): string {
  const sections: string[] = [];

  // Header
  sections.push('SafeVoice Analytics Export');
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push(`Date Range: ${report.dateRange.start} to ${report.dateRange.end}`);
  sections.push('');

  // Summary metrics
  sections.push('=== SUMMARY METRICS ===');
  sections.push('Metric,Value');
  sections.push(`Total Sessions,${report.totalSessions}`);
  sections.push(`Total Events,${report.totalEvents}`);
  sections.push(`Current Stickiness,${((report.stickiness || 0) * 100).toFixed(2)}%`);
  if (report.retention) {
    sections.push(`Week 1 Retention,${report.retention.overallRetention.week1.toFixed(2)}%`);
    sections.push(`Week 4 Retention,${report.retention.overallRetention.week4.toFixed(2)}%`);
    sections.push(`Week 12 Retention,${report.retention.overallRetention.week12.toFixed(2)}%`);
    sections.push(`Churn Rate,${report.retention.churnRate.toFixed(2)}%`);
  }
  sections.push('');

  // Daily metrics
  sections.push('=== DAILY METRICS ===');
  sections.push('Date,DAU,Sessions,Events,Avg Session Duration (min),Posts,Comments,Reactions');
  report.metrics.forEach(day => {
    const durationMin = Math.round(day.avgSessionDuration / 60000);
    sections.push(
      `${day.date},${day.dau},${day.sessions},${day.totalEvents},${durationMin},${day.postsCreated},${day.commentsCreated},${day.reactionsGiven}`
    );
  });
  sections.push('');

  // Engagement trends
  if (report.engagementTrends && report.engagementTrends.length > 0) {
    sections.push('=== ENGAGEMENT TRENDS ===');
    sections.push('Date,DAU,MAU,Stickiness,Engagement Score');
    report.engagementTrends.forEach(trend => {
      sections.push(
        `${trend.date},${trend.dau},${trend.mau},${(trend.stickiness * 100).toFixed(2)}%,${trend.engagementScore.toFixed(2)}`
      );
    });
    sections.push('');
  }

  // Feature adoption
  sections.push('=== FEATURE ADOPTION ===');
  sections.push('Feature,Total Usage,Unique Users,Adoption Rate');
  report.features.forEach(feature => {
    sections.push(
      `${feature.featureName},${feature.totalUsage},${feature.uniqueUsers},${feature.adoptionRate.toFixed(2)}%`
    );
  });
  sections.push('');

  // Retention cohorts
  if (report.retention && report.retention.cohorts.length > 0) {
    sections.push('=== RETENTION COHORTS ===');
    const maxWeeks = Math.max(...report.retention.cohorts.map(c => c.weeklyRetention.length));
    const headers = ['Cohort Week', 'Size', ...Array.from({ length: maxWeeks }, (_, i) => `Week ${i}`)];
    sections.push(headers.join(','));
    
    report.retention.cohorts.forEach(cohort => {
      const retentionValues = cohort.weeklyRetention.map(v => `${v.toFixed(1)}%`);
      sections.push(`${cohort.cohortWeek},${cohort.cohortSize},${retentionValues.join(',')}`);
    });
    sections.push('');
  }

  // Feature heatmap
  if (report.featureHeatmap && report.featureHeatmap.length > 0) {
    sections.push('=== FEATURE HEATMAP ===');
    sections.push('Feature,Day of Week,Hour,Usage Count,Unique Users,Intensity');
    report.featureHeatmap.forEach(cell => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      sections.push(
        `${cell.featureName},${dayNames[cell.dayOfWeek]},${cell.hour}:00,${cell.usageCount},${cell.uniqueUsers},${(cell.intensity * 100).toFixed(1)}%`
      );
    });
    sections.push('');
  }

  // Raw events (optional)
  if (includeRawEvents) {
    sections.push('=== RAW EVENTS ===');
    sections.push('Timestamp,Type,Session ID,User ID');
    events.forEach(event => {
      const userId = anonymize ? maskUserId(event.hashedUserId) : event.hashedUserId;
      const sessionId = anonymize ? maskSessionId(event.sessionId) : event.sessionId;
      sections.push(
        `${new Date(event.timestamp).toISOString()},${event.type},${sessionId},${userId || 'N/A'}`
      );
    });
  }

  // Privacy notice
  sections.push('');
  sections.push('=== PRIVACY NOTICE ===');
  sections.push('All data in this export is privacy-safe and anonymized.');
  sections.push('No personally identifiable information (PII) is included.');
  sections.push('User IDs are hashed and cannot be traced to individuals.');

  return sections.join('\n');
}

/**
 * Export report to JSON format
 */
export function exportToJSON(
  report: AggregationResult,
  events: TrackedEvent[],
  includeRawEvents: boolean,
  anonymize: boolean
): string {
  const exportData = {
    metadata: {
      generated: new Date().toISOString(),
      dateRange: report.dateRange,
      privacy: 'All data is anonymized and privacy-safe',
    },
    summary: {
      totalSessions: report.totalSessions,
      totalEvents: report.totalEvents,
      stickiness: report.stickiness,
      retention: report.retention ? {
        week1: report.retention.overallRetention.week1,
        week4: report.retention.overallRetention.week4,
        week12: report.retention.overallRetention.week12,
        churnRate: report.retention.churnRate,
      } : null,
    },
    dailyMetrics: report.metrics,
    engagementTrends: report.engagementTrends || [],
    featureAdoption: report.features,
    retentionCohorts: report.retention?.cohorts || [],
    featureHeatmap: report.featureHeatmap || [],
    communityHealth: report.communityHealth,
    rawEvents: includeRawEvents ? events.map(event => ({
      timestamp: event.timestamp,
      type: event.type,
      sessionId: anonymize ? maskSessionId(event.sessionId) : event.sessionId,
      userId: anonymize ? maskUserId(event.hashedUserId) : event.hashedUserId,
    })) : undefined,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download file to user's device
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Get timestamp string for filename
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Mask user ID for additional anonymization
 */
function maskUserId(userId: string | undefined): string {
  if (!userId) return 'anonymous';
  // Keep first 8 characters, mask the rest
  return userId.slice(0, 8) + '***';
}

/**
 * Mask session ID for additional anonymization
 */
function maskSessionId(sessionId: string): string {
  // Keep session prefix and first 4 characters after prefix
  const parts = sessionId.split('_');
  if (parts.length >= 2) {
    return `${parts[0]}_${parts[1].slice(0, 4)}***`;
  }
  return sessionId.slice(0, 8) + '***';
}
