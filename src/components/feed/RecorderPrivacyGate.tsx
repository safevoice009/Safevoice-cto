import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useRecorderPrivacyStore,
  type RecorderPrivacyDecision,
} from '../../lib/recorderPrivacyStore';
import { getPrivacyStatus } from '../../lib/privacy/middleware';
import { useFingerprintStore } from '../../lib/fingerprintStore';

interface RecorderPrivacyGateProps {
  onApproved: (decision: RecorderPrivacyDecision) => void;
  onDismissed?: () => void;
  isOpen: boolean;
  isCrisisMode?: boolean;
}

export default function RecorderPrivacyGate({
  onApproved,
  onDismissed,
  isOpen,
  isCrisisMode = false,
}: RecorderPrivacyGateProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const fingerprintState = useFingerprintStore();

  const {
    currentDecision,
    createPrivacyDecision,
    acknowledgeDataHandling,
    acknowledgeAnonymization,
    recordRiskLevel,
    canProceedWithRecording,
    getChecklistStatus,
  } = useRecorderPrivacyStore();

  // Initialize privacy decision when gate opens
  useEffect(() => {
    if (isOpen && !currentDecision) {
      setLoading(true);
      // Evaluate fingerprint risk
      const riskLevel = fingerprintState.currentSnapshot?.isHighRisk
        ? 'high'
        : fingerprintState.currentSnapshot?.riskScore ?? 0 > 0.5
          ? 'medium'
          : 'low';

      createPrivacyDecision(riskLevel);
      recordRiskLevel(riskLevel);
      setLoading(false);
    }
  }, [isOpen, currentDecision, createPrivacyDecision, recordRiskLevel, fingerprintState]);

  const privacyStatus = getPrivacyStatus();
  const checklistStatus = getChecklistStatus();
  const isBlocked = !canProceedWithRecording();

  const handleDataHandlingCheck = () => {
    acknowledgeDataHandling();
  };

  const handleAnonymizationCheck = () => {
    acknowledgeAnonymization();
  };

  const handleApprove = () => {
    if (currentDecision && canProceedWithRecording()) {
      onApproved(currentDecision);
    }
  };

  const handleDismiss = () => {
    onDismissed?.();
  };

  if (loading) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="glass rounded-2xl border border-white/10 p-6 max-w-md"
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-white">{t('common.loading')}</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && currentDecision && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
              {/* Header */}
              <div className="sticky top-0 glass p-6 border-b border-white/10 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <ShieldAlert className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      🔒 Privacy Check
                    </h2>
                    <p className="text-gray-300 text-sm">
                      {isCrisisMode
                        ? 'We take extra care with your sensitive information.'
                        : 'Review privacy settings before sharing.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Privacy Status Summary */}
                <div className="bg-surface/50 rounded-lg border border-white/10 p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <span>🛡️ Your Privacy Status</span>
                  </h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                      <span
                        className={
                          privacyStatus.webrtcProtected
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }
                      >
                        ✓
                      </span>
                      <span>WebRTC IP leak protection: {privacyStatus.webrtcProtected ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={
                          privacyStatus.cookiesBlocked
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }
                      >
                        ✓
                      </span>
                      <span>Cookies blocked: {privacyStatus.cookiesBlocked ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span>HTTPS enforced: {privacyStatus.httpsEnforced ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Level */}
                {currentDecision.riskLevel && (
                  <div
                    className={`rounded-lg border p-4 ${
                      currentDecision.riskLevel === 'high'
                        ? 'bg-red-500/10 border-red-500/30'
                        : currentDecision.riskLevel === 'medium'
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-green-500/10 border-green-500/30'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <AlertCircle
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          currentDecision.riskLevel === 'high'
                            ? 'text-red-400'
                            : currentDecision.riskLevel === 'medium'
                              ? 'text-yellow-400'
                              : 'text-green-400'
                        }`}
                      />
                      <div className="text-sm">
                        <p className="font-semibold text-white mb-1">
                          Fingerprint Risk:{' '}
                          <span
                            className={
                              currentDecision.riskLevel === 'high'
                                ? 'text-red-400'
                                : currentDecision.riskLevel === 'medium'
                                  ? 'text-yellow-400'
                                  : 'text-green-400'
                            }
                          >
                            {currentDecision.riskLevel.toUpperCase()}
                          </span>
                        </p>
                        <p className="text-gray-300">
                          {currentDecision.riskLevel === 'high'
                            ? 'Multiple tracking signals detected. Consider enabling additional protections.'
                            : currentDecision.riskLevel === 'medium'
                              ? 'Some tracking signals detected. Enhanced protections recommended.'
                              : 'Your fingerprint looks unique but stable. Standard protections apply.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checklist */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">
                    ✅ Acknowledgments Required
                  </h3>

                  {/* Data Handling */}
                  <button
                    type="button"
                    onClick={handleDataHandlingCheck}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      checklistStatus.dataHandlingAcknowledged
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-surface/50 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          checklistStatus.dataHandlingAcknowledged
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-400'
                        }`}
                      >
                        {checklistStatus.dataHandlingAcknowledged && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="text-sm flex-1">
                        <p className="font-semibold text-white">
                          Data Handling Transparency
                        </p>
                        <p className="text-gray-300 mt-1">
                          Your content is encrypted, stored locally, and never sold. We collect no behavioral tracking data.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Anonymization */}
                  <button
                    type="button"
                    onClick={handleAnonymizationCheck}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      checklistStatus.anonymizationAcknowledged
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-surface/50 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          checklistStatus.anonymizationAcknowledged
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-400'
                        }`}
                      >
                        {checklistStatus.anonymizationAcknowledged && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="text-sm flex-1">
                        <p className="font-semibold text-white">
                          Anonymization & Privacy
                        </p>
                        <p className="text-gray-300 mt-1">
                          Your identity remains protected. We use cryptographic techniques to verify authenticity without exposing who you are.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Fingerprint Protection */}
                  <div
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      fingerprintState.detectionEnabled
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-surface/50 border-white/10'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          fingerprintState.detectionEnabled
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-400'
                        }`}
                      >
                        {fingerprintState.detectionEnabled && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="text-sm flex-1">
                        <p className="font-semibold text-white">
                          Browser Fingerprint Protection
                        </p>
                        <p className="text-gray-300 mt-1">
                          Status: {fingerprintState.detectionEnabled ? '✓ Active' : '○ Disabled'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Enable in Settings → Privacy → Browser Fingerprint Protection
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 border-t border-white/10 pt-6">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="flex-1 px-4 py-3 text-gray-300 hover:text-white rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleApprove}
                    disabled={isBlocked}
                    whileHover={!isBlocked ? { scale: 1.02 } : {}}
                    whileTap={!isBlocked ? { scale: 0.98 } : {}}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                      isBlocked
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-50'
                        : 'bg-primary text-white hover:shadow-glow'
                    }`}
                  >
                    {isCrisisMode
                      ? 'Continue to Crisis Support'
                      : 'Continue to Recording'}
                  </motion.button>
                </div>

                {isBlocked && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-300">
                      ⚠️ Please acknowledge all privacy terms before proceeding.
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="text-xs text-gray-400 text-center">
                  Your privacy is protected by SafeVoice's end-to-end encryption
                  and zero-tracking policies. {isCrisisMode && 'Crisis support is confidential.'}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
