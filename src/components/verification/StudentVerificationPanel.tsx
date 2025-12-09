/**
 * Student Verification Panel
 * 
 * Displays verification status timeline and provides re-verification CTAs.
 * Integrates with the ZK student identity system.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Fingerprint,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore, type VerificationStatus } from '../../lib/store';
import { VERIFICATION_CONSTANTS } from '../../lib/identity/types';

interface VerificationStep {
  id: 'email' | 'biometric' | 'peer';
  label: string;
  description: string;
  icon: typeof Mail;
  status: 'pending' | 'in_progress' | 'completed' | 'error' | 'expired';
  expiresAt?: number | null;
}

const getStepStatus = (
  verificationStatus: VerificationStatus,
  step: 'email' | 'biometric' | 'peer',
  emailProof: boolean,
  biometric: boolean,
  peerConsensus: 'pending' | 'approved' | 'rejected' | 'expired' | null
): VerificationStep['status'] => {
  if (verificationStatus === 'expired') return 'expired';
  if (verificationStatus === 'revoked') return 'error';

  switch (step) {
    case 'email':
      if (emailProof) return 'completed';
      if (verificationStatus === 'email_pending') return 'in_progress';
      return 'pending';
    case 'biometric':
      if (biometric) return 'completed';
      if (verificationStatus === 'biometric_pending') return 'in_progress';
      if (!emailProof) return 'pending';
      return 'pending';
    case 'peer':
      if (peerConsensus === 'approved') return 'completed';
      if (peerConsensus === 'rejected') return 'error';
      if (peerConsensus === 'expired') return 'expired';
      if (peerConsensus === 'pending') return 'in_progress';
      return 'pending';
  }
};

const StatusIcon = ({ status }: { status: VerificationStep['status'] }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'expired':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-gray-400" />;
  }
};

export default function StudentVerificationPanel() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const studentVerification = useStore((state) => state.studentVerification);
  const initStudentVerificationFlow = useStore((state) => state.initStudentVerificationFlow);

  const handleInitialize = async () => {
    setIsInitializing(true);
    await initStudentVerificationFlow();
    setIsInitializing(false);
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!studentVerification.expiresAt) return null;
    const msUntilExpiry = studentVerification.expiresAt - Date.now();
    return Math.max(0, Math.floor(msUntilExpiry / (24 * 60 * 60 * 1000)));
  };

  const daysUntilExpiry = getDaysUntilExpiry();
  const needsReverification = daysUntilExpiry !== null && daysUntilExpiry <= VERIFICATION_CONSTANTS.REVERIFICATION_WARNING_DAYS;

  const steps: VerificationStep[] = [
    {
      id: 'email',
      label: 'Email Domain',
      description: 'Verify your .edu email via DKIM signature',
      icon: Mail,
      status: getStepStatus(
        studentVerification.status,
        'email',
        !!studentVerification.emailProof,
        studentVerification.biometricCommitments.length > 0,
        studentVerification.peerConsensus?.status ?? null
      ),
      expiresAt: studentVerification.emailProof?.expiresAt,
    },
    {
      id: 'biometric',
      label: 'Biometric',
      description: `WebAuthn commitment (max ${VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS} accounts)`,
      icon: Fingerprint,
      status: getStepStatus(
        studentVerification.status,
        'biometric',
        !!studentVerification.emailProof,
        studentVerification.biometricCommitments.length > 0,
        studentVerification.peerConsensus?.status ?? null
      ),
    },
    {
      id: 'peer',
      label: 'Peer Consensus',
      description: `Requires ${VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM} peer approvals`,
      icon: Users,
      status: getStepStatus(
        studentVerification.status,
        'peer',
        !!studentVerification.emailProof,
        studentVerification.biometricCommitments.length > 0,
        studentVerification.peerConsensus?.status ?? null
      ),
    },
  ];

  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const getStatusColor = () => {
    switch (studentVerification.status) {
      case 'fully_verified':
        return 'bg-green-500/20 border-green-500/50';
      case 'expired':
      case 'revoked':
        return 'bg-red-500/20 border-red-500/50';
      case 'unverified':
        return 'bg-gray-500/20 border-gray-500/50';
      default:
        return 'bg-yellow-500/20 border-yellow-500/50';
    }
  };

  const getStatusLabel = () => {
    switch (studentVerification.status) {
      case 'fully_verified':
        return '✅ Verified';
      case 'expired':
        return '⏰ Expired';
      case 'revoked':
        return '🚫 Revoked';
      case 'unverified':
        return '⚪ Unverified';
      case 'email_verified':
        return '📧 Email Verified';
      case 'biometric_verified':
        return '🔐 Biometric Verified';
      case 'peer_pending':
        return '🤝 Awaiting Peers';
      default:
        return '⏳ In Progress';
    }
  };

  return (
    <div className={`rounded-xl border ${getStatusColor()} overflow-hidden`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-info" />
          <div className="text-left">
            <div className="font-medium text-text">{t('verification.title', 'Student Verification')}</div>
            <div className="text-sm text-text-muted">{getStatusLabel()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {needsReverification && (
            <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full">
              {daysUntilExpiry}d left
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Progress</span>
                  <span className="text-text">{completedSteps}/{steps.length} steps</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-info to-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Steps timeline */}
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="p-2 rounded-lg bg-surface/50">
                        <step.icon className="w-4 h-4 text-text-muted" />
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-0.5 h-8 mt-1 ${
                          step.status === 'completed' ? 'bg-green-500' : 'bg-gray-600'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">{step.label}</span>
                        <StatusIcon status={step.status} />
                      </div>
                      <p className="text-sm text-text-muted">{step.description}</p>
                      {step.expiresAt && step.status === 'completed' && (
                        <p className="text-xs text-text-muted mt-1">
                          Expires: {new Date(step.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Challenge nonce display */}
              {studentVerification.currentChallenge && (
                <div className="p-3 bg-surface/50 rounded-lg">
                  <p className="text-sm text-text-muted mb-1">Your verification code:</p>
                  <code className="block text-xs text-info font-mono break-all">
                    {studentVerification.currentChallenge}
                  </code>
                  {studentVerification.challengeExpiresAt && (
                    <p className="text-xs text-text-muted mt-1">
                      Expires: {new Date(studentVerification.challengeExpiresAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}

              {/* Error message */}
              {studentVerification.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{studentVerification.error}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {studentVerification.status === 'unverified' && (
                  <motion.button
                    onClick={handleInitialize}
                    disabled={isInitializing || studentVerification.isVerifying}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-info text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isInitializing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    Start Verification
                  </motion.button>
                )}

                {(studentVerification.status === 'expired' || needsReverification) && (
                  <motion.button
                    onClick={handleInitialize}
                    disabled={isInitializing || studentVerification.isVerifying}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RefreshCw className={`w-4 h-4 ${isInitializing ? 'animate-spin' : ''}`} />
                    Re-verify Now
                  </motion.button>
                )}
              </div>

              {/* Privacy note */}
              <p className="text-xs text-text-muted text-center">
                🔒 Only hashed commitments are stored. No PII is persisted.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
