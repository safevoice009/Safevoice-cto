import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Play,
  Lock,
  Unlock,
  Database,
  HardDrive,
  FileText,
  XCircle,
} from 'lucide-react';
import { useStore } from '../../lib/store';

export default function ZeroLogAuditPanel() {
  const zeroLogAuditReport = useStore((state) => state.zeroLogAuditReport);
  const isZeroLogAuditRunning = useStore((state) => state.isZeroLogAuditRunning);
  const systemLocked = useStore((state) => state.systemLocked);
  const runZeroLogAudit = useStore((state) => state.runZeroLogAudit);
  const unlockSystem = useStore((state) => state.unlockSystem);

  const [showDetails, setShowDetails] = useState(false);
  const [haltOnViolations, setHaltOnViolations] = useState(false);

  const handleRunAudit = async () => {
    await runZeroLogAudit(haltOnViolations);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/20';
      case 'high':
        return 'text-orange-400 bg-orange-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'low':
        return 'text-blue-400 bg-blue-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-6 rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center space-x-2">
              <Shield className="w-6 h-6 text-primary" />
              <span>Zero-Log Auditor</span>
            </h3>
            <p className="text-gray-400 text-sm">
              Verify that no metadata, user IDs, IPs, or tracking data is stored. Only CID references
              and encrypted content are allowed.
            </p>
          </div>

          {systemLocked && (
            <div className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
              <Lock className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400 font-medium">System Locked</span>
            </div>
          )}
        </div>

        {/* Last Audit Status */}
        {zeroLogAuditReport && (
          <div
            className={`p-4 rounded-lg border ${
              zeroLogAuditReport.clean
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {zeroLogAuditReport.clean ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <p className="text-sm font-semibold text-white">
                    {zeroLogAuditReport.clean
                      ? '✅ Clean Storage - No Violations'
                      : `⚠️ ${zeroLogAuditReport.violations.length} Violation(s) Detected`}
                  </p>
                  <p className="text-xs text-gray-400">
                    Last audit:{' '}
                    {new Date(zeroLogAuditReport.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {!zeroLogAuditReport.clean && (
                <div className="text-right">
                  <div className="text-sm font-semibold text-red-400">
                    {zeroLogAuditReport.summary.criticalViolations} Critical
                  </div>
                  <div className="text-xs text-gray-400">
                    {zeroLogAuditReport.summary.totalViolations} Total
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Controls */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={haltOnViolations}
                onChange={(e) => setHaltOnViolations(e.target.checked)}
                disabled={isZeroLogAuditRunning}
                className="rounded border-white/10 bg-surface text-primary focus:ring-primary"
              />
              <span>Halt operations on violations (lock system)</span>
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRunAudit}
              disabled={isZeroLogAuditRunning || systemLocked}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isZeroLogAuditRunning || systemLocked
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-black hover:bg-primary/90'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>{isZeroLogAuditRunning ? 'Running Audit...' : 'Run Zero-Log Audit'}</span>
            </motion.button>

            {systemLocked && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={unlockSystem}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock System</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Storage Snapshot */}
      {zeroLogAuditReport && (
        <div className="glass p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>Storage Snapshot</span>
          </h4>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">localStorage Keys</span>
                <HardDrive className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {zeroLogAuditReport.storageSnapshot.allowedKeys.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Allowed ·{' '}
                {zeroLogAuditReport.storageSnapshot.forbiddenKeys.length > 0 && (
                  <span className="text-red-400">
                    {zeroLogAuditReport.storageSnapshot.forbiddenKeys.length} Forbidden
                  </span>
                )}
              </div>
            </div>

            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">IndexedDB Databases</span>
                <Database className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {zeroLogAuditReport.storageSnapshot.indexedDBs.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {zeroLogAuditReport.storageSnapshot.indexedDBs.join(', ') || 'None'}
              </div>
            </div>

            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">CID References</span>
                <FileText className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-400">
                {zeroLogAuditReport.storageSnapshot.cidReferences}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                IPFS content identifiers
              </div>
            </div>

            <div className="glass p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Records Checked</span>
                <Shield className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {zeroLogAuditReport.summary.localStorageChecked +
                  zeroLogAuditReport.summary.indexedDBChecked}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {zeroLogAuditReport.summary.localStorageChecked} localStorage ·{' '}
                {zeroLogAuditReport.summary.indexedDBChecked} IndexedDB
              </div>
            </div>
          </div>

          {/* Show Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {showDetails ? '▼ Hide' : '▶ Show'} Allowed Keys
          </button>

          {showDetails && (
            <div className="mt-4 glass p-4 rounded-lg max-h-64 overflow-y-auto">
              <h5 className="text-sm font-semibold text-white mb-2">Allowed Keys:</h5>
              <div className="space-y-1">
                {zeroLogAuditReport.storageSnapshot.allowedKeys.map((key) => (
                  <div
                    key={key}
                    className="text-xs text-gray-400 font-mono bg-surface/50 px-2 py-1 rounded"
                  >
                    {key}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Violations List */}
      {zeroLogAuditReport && zeroLogAuditReport.violations.length > 0 && (
        <div className="glass p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span>Privacy Violations</span>
          </h4>

          <div className="space-y-3">
            {zeroLogAuditReport.violations.map((violation, index) => (
              <div
                key={index}
                className="glass p-4 rounded-lg border border-red-500/30 hover:border-red-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded ${getSeverityColor(violation.severity)}`}>
                      {getSeverityIcon(violation.severity)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {violation.issue}
                      </div>
                      <div className="text-xs text-gray-500">
                        {violation.type} · {violation.location}
                        {violation.key && ` · ${violation.key}`}
                        {violation.table && ` · Table: ${violation.table}`}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(
                      violation.severity
                    )}`}
                  >
                    {violation.severity}
                  </div>
                </div>
                {violation.details && (
                  <p className="text-xs text-gray-400 mt-2">{violation.details}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Guidelines */}
      <div className="glass p-6 rounded-lg">
        <h4 className="text-lg font-semibold text-white mb-3">Zero-Log Privacy Guidelines</h4>
        <div className="space-y-2 text-sm text-gray-400">
          <p>✅ <strong className="text-gray-300">Allowed:</strong> Anonymous student IDs (Student#XXXX), CID references, encrypted content, timestamps</p>
          <p>❌ <strong className="text-gray-300">Forbidden:</strong> Real user IDs, IP addresses, activity timestamps, message content (without CID), location data</p>
          <p>🔒 <strong className="text-gray-300">Storage:</strong> Only whitelisted localStorage keys, encrypted media in IndexedDB with CID references</p>
          <p>🔍 <strong className="text-gray-300">Audit Scope:</strong> All localStorage keys, SafeVoiceMediaDB records, forbidden pattern detection</p>
        </div>
      </div>
    </div>
  );
}
