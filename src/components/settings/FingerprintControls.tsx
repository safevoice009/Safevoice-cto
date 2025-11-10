import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, Eye, EyeOff, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFingerprintStore } from '../../lib/fingerprintStore';

export default function FingerprintControls() {
  const { t } = useTranslation();
  
  const {
    currentSnapshot,
    detectionEnabled,
    mitigationEnabled,
    lastRotation,
    getRiskLevel,
    getRiskScore,
    getDetectionStatus,
    isHighRisk,
    getMatchedTrackers,
    collectFingerprint,
    rotateSalt,
    toggleDetection,
    toggleMitigation,
  } = useFingerprintStore();

  const riskLevel = getRiskLevel();
  const riskScore = getRiskScore();
  const detectionStatus = getDetectionStatus();
  const highRisk = isHighRisk();
  const matchedTrackers = getMatchedTrackers();

  // Collect fingerprint on mount if detection is enabled
  useEffect(() => {
    if (detectionEnabled && detectionStatus === 'idle') {
      collectFingerprint();
    }
  }, [detectionEnabled, detectionStatus, collectFingerprint]);

  // Format timestamp
  const formatTimestamp = (timestamp: number | null | undefined) => {
    if (!timestamp) return t('settings.fingerprint.never', 'Never');
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Risk level styling
  const getRiskStyles = () => {
    switch (riskLevel) {
      case 'high':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          icon: AlertTriangle,
        };
      case 'medium':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          icon: AlertTriangle,
        };
      case 'low':
      default:
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          icon: CheckCircle2,
        };
    }
  };

  const riskStyles = getRiskStyles();
  const RiskIcon = riskStyles.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
        <Shield className="w-5 h-5 text-primary" />
        <span>{t('settings.fingerprint.title', 'Browser Fingerprint Protection')}</span>
      </h3>

      <p className="text-sm text-gray-400">
        {t(
          'settings.fingerprint.description',
          'Monitor and protect against browser fingerprinting techniques used by trackers to identify you across websites.'
        )}
      </p>

      {/* Detection Status Banner */}
      <div className={`p-4 ${riskStyles.bgColor} border ${riskStyles.borderColor} rounded-lg`}>
        <div className="flex items-start space-x-3">
          <RiskIcon className={`w-6 h-6 ${riskStyles.color} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <h4 className={`font-semibold ${riskStyles.color} mb-2`}>
              {detectionStatus === 'collected'
                ? t(`settings.fingerprint.riskLevel.${riskLevel}`, `Risk Level: ${riskLevel.toUpperCase()}`)
                : t('settings.fingerprint.notDetected', 'Not Detected')}
            </h4>
            <div className="space-y-1 text-sm text-gray-300">
              <div className="flex justify-between items-center">
                <span>{t('settings.fingerprint.riskScore', 'Risk Score:')}</span>
                <span className="font-mono font-semibold">{(riskScore * 100).toFixed(0)}%</span>
              </div>
              {currentSnapshot && (
                <>
                  <div className="flex justify-between items-center">
                    <span>{t('settings.fingerprint.signalsDetected', 'Signals Detected:')}</span>
                    <span className="font-mono">{currentSnapshot.signals.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('settings.fingerprint.lastChecked', 'Last Checked:')}</span>
                    <span className="text-xs">{formatTimestamp(currentSnapshot.timestamp)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Matched Trackers Alert */}
      {matchedTrackers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300 font-semibold mb-1">
                {t('settings.fingerprint.trackersDetected', 'High-Risk Tracking Signals Detected')}
              </p>
              <div className="text-xs text-gray-400 space-y-0.5">
                {matchedTrackers.map((tracker) => (
                  <div key={tracker}>• {tracker}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {/* Detection Toggle */}
        <div className="p-4 bg-surface/50 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {detectionEnabled ? (
                <Eye className="w-5 h-5 text-blue-400 mt-0.5" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-400 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  {t('settings.fingerprint.detectionToggle', 'Fingerprint Detection')}
                </h4>
                <p className="text-xs text-gray-400">
                  {t(
                    'settings.fingerprint.detectionDesc',
                    'Monitor browser fingerprinting signals and track your privacy risk score.'
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDetection}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                detectionEnabled ? 'bg-primary' : 'bg-gray-600'
              }`}
              role="switch"
              aria-checked={detectionEnabled}
              aria-label={t('settings.fingerprint.toggleDetection', 'Toggle fingerprint detection')}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  detectionEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mitigation Toggle */}
        <div className="p-4 bg-surface/50 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  {t('settings.fingerprint.mitigationToggle', 'Auto-Mitigation')}
                </h4>
                <p className="text-xs text-gray-400">
                  {t(
                    'settings.fingerprint.mitigationDesc',
                    'Automatically apply countermeasures when high-risk fingerprinting is detected.'
                  )}
                </p>
                {mitigationEnabled && highRisk && (
                  <div className="mt-2 flex items-center space-x-1 text-xs text-purple-300">
                    <Activity className="w-3 h-3" />
                    <span>{t('settings.fingerprint.mitigationActive', 'Mitigation active')}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={toggleMitigation}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                mitigationEnabled ? 'bg-primary' : 'bg-gray-600'
              }`}
              role="switch"
              aria-checked={mitigationEnabled}
              aria-label={t('settings.fingerprint.toggleMitigation', 'Toggle auto-mitigation')}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mitigationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Salt Rotation */}
        <div className="p-4 bg-surface/50 rounded-lg border border-white/10">
          <div className="flex items-start space-x-3">
            <RefreshCw className="w-5 h-5 text-green-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1">
                {t('settings.fingerprint.saltRotation', 'Anonymization Salt')}
              </h4>
              <p className="text-xs text-gray-400 mb-2">
                {t(
                  'settings.fingerprint.saltRotationDesc',
                  'Rotate the anonymization salt to refresh your fingerprint signature.'
                )}
              </p>
              <div className="text-xs text-gray-500 mb-3">
                {t('settings.fingerprint.lastRotation', 'Last rotated:')}{' '}
                {formatTimestamp(lastRotation?.timestamp)}
              </div>
              <button
                onClick={() => rotateSalt('User initiated rotation')}
                className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                aria-label={t('settings.fingerprint.rotateSalt', 'Rotate salt')}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('settings.fingerprint.rotateNow', 'Rotate Now')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Refresh Detection */}
        {detectionEnabled && (
          <div className="flex justify-end">
            <button
              onClick={() => collectFingerprint()}
              className="px-4 py-2 bg-surface/70 hover:bg-surface text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 border border-white/10"
              aria-label={t('settings.fingerprint.refreshDetection', 'Refresh detection')}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t('settings.fingerprint.refreshNow', 'Refresh Detection')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
