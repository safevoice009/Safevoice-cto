import type { Report, MemberStatus, CommunityModerationLog } from '../store';

export type ExportFormat = 'csv' | 'json';

const escapeCSVField = (field: string | number | undefined | null): string => {
  if (field === undefined || field === null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const arrayToCSV = (headers: string[], rows: (string | number | undefined | null)[][]): string => {
  const csvHeaders = headers.map(escapeCSVField).join(',');
  const csvRows = rows.map(row => row.map(escapeCSVField).join(',')).join('\n');
  return `${csvHeaders}\n${csvRows}`;
};

export function exportModerationLogs(
  logs: CommunityModerationLog[],
  format: ExportFormat,
  since: number = 0
): string {
  const filteredLogs = logs.filter(log => log.timestamp >= since);

  if (format === 'json') {
    return JSON.stringify(filteredLogs, null, 2);
  }

  const headers = [
    'ID',
    'Timestamp',
    'Moderator ID',
    'Action Type',
    'Target ID',
    'Description',
    'Metadata',
  ];

  const rows = filteredLogs.map(log => [
    log.id,
    new Date(log.timestamp).toISOString(),
    log.moderatorId,
    log.actionType,
    log.targetId,
    log.description,
    JSON.stringify(log.metadata || {}),
  ]);

  return arrayToCSV(headers, rows);
}

export function exportReports(
  reports: Report[],
  format: ExportFormat,
  since: number = 0
): string {
  const filteredReports = reports.filter(report => report.reportedAt >= since);

  if (format === 'json') {
    return JSON.stringify(filteredReports, null, 2);
  }

  const headers = [
    'ID',
    'Reported At',
    'Reporter ID',
    'Post ID',
    'Comment ID',
    'Report Type',
    'Description',
    'Status',
    'Reviewed By',
    'Reviewed At',
  ];

  const rows = filteredReports.map(report => [
    report.id,
    new Date(report.reportedAt).toISOString(),
    report.reporterId,
    report.postId || '',
    report.commentId || '',
    report.reportType,
    report.description,
    report.status,
    report.reviewedBy || '',
    report.reviewedAt ? new Date(report.reviewedAt).toISOString() : '',
  ]);

  return arrayToCSV(headers, rows);
}

export function exportMemberStatuses(
  memberStatuses: MemberStatus[],
  format: ExportFormat
): string {
  if (format === 'json') {
    return JSON.stringify(memberStatuses, null, 2);
  }

  const headers = [
    'Student ID',
    'Is Banned',
    'Banned At',
    'Banned Until',
    'Ban Reason',
    'Warning Count',
    'Last Warning At',
    'Warnings',
  ];

  const rows = memberStatuses.map(member => [
    member.studentId,
    member.isBanned ? 'Yes' : 'No',
    member.bannedAt ? new Date(member.bannedAt).toISOString() : '',
    member.bannedUntil ? new Date(member.bannedUntil).toISOString() : '',
    member.banReason || '',
    member.warnings.length,
    member.lastWarningAt ? new Date(member.lastWarningAt).toISOString() : '',
    JSON.stringify(member.warnings),
  ]);

  return arrayToCSV(headers, rows);
}

export interface CombinedExportData {
  communityModerationLogs: CommunityModerationLog[];
  reports: Report[];
  memberStatuses: MemberStatus[];
}

export function exportCombinedData(
  data: CombinedExportData,
  format: ExportFormat,
  since: number = 0,
  includeMetadata: boolean = true
): string {
  const filteredData = {
    communityModerationLogs: data.communityModerationLogs.filter(log => log.timestamp >= since),
    reports: data.reports.filter(report => report.reportedAt >= since),
    memberStatuses: data.memberStatuses,
  };

  if (format === 'json') {
    if (!includeMetadata) {
      return JSON.stringify({
        logs: filteredData.communityModerationLogs.map(({ id, timestamp, moderatorId, actionType, targetId, description }) => ({
          id,
          timestamp,
          moderatorId,
          actionType,
          targetId,
          description,
        })),
        reports: filteredData.reports.map(({ id, reportedAt, reporterId, reportType, status }) => ({
          id,
          reportedAt,
          reporterId,
          reportType,
          status,
        })),
        memberStatuses: filteredData.memberStatuses.map(({ studentId, isBanned, warnings }) => ({
          studentId,
          isBanned,
          warningCount: warnings.length,
        })),
      }, null, 2);
    }
    return JSON.stringify(filteredData, null, 2);
  }

  let csvOutput = 'MODERATION LOGS\n';
  csvOutput += exportModerationLogs(filteredData.communityModerationLogs, 'csv') + '\n\n';
  
  csvOutput += 'REPORTS\n';
  csvOutput += exportReports(filteredData.reports, 'csv') + '\n\n';
  
  csvOutput += 'MEMBER STATUSES\n';
  csvOutput += exportMemberStatuses(filteredData.memberStatuses, 'csv');

  return csvOutput;
}

export function generateReportSummary(data: CombinedExportData, dateRange: number = 30): {
  totalModerationActions: number;
  totalReports: number;
  totalBannedMembers: number;
  totalWarnedMembers: number;
  topModerators: { id: string; count: number }[];
  commonReportTypes: { type: string; count: number }[];
} {
  const since = Date.now() - (dateRange * 24 * 60 * 60 * 1000);
  
  const recentLogs = data.communityModerationLogs.filter(log => log.timestamp >= since);
  const recentReports = data.reports.filter(report => report.reportedAt >= since);
  
  const moderatorCounts = recentLogs.reduce((acc, log) => {
    acc[log.moderatorId] = (acc[log.moderatorId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topModerators = Object.entries(moderatorCounts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const reportTypeCounts = recentReports.reduce((acc, report) => {
    acc[report.reportType] = (acc[report.reportType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const commonReportTypes = Object.entries(reportTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    totalModerationActions: recentLogs.length,
    totalReports: recentReports.length,
    totalBannedMembers: data.memberStatuses.filter(m => m.isBanned).length,
    totalWarnedMembers: data.memberStatuses.filter(m => m.warnings.length > 0 && !m.isBanned).length,
    topModerators,
    commonReportTypes,
  };
}
