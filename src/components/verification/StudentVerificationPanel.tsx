/**
 * Student Verification Panel
 *
 * Displays the full verification workflow inside a modal-style portal so it can
 * sit above any page content without fighting local stacking contexts.
 */

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useStudentVerificationStore } from '../../lib/identity/studentVerificationState';
import { BiometricRegistration } from './BiometricRegistration';
import PeerVouchingRequest from './PeerVouchingRequest';
import VerificationStatus from './VerificationStatus';
import ApprovalTimeline from './ApprovalTimeline';
import type { PeerSignature } from '../../lib/identity/PeerVouchingService';

interface StudentVerificationPanelProps {
  className?: string;
  showTimeline?: boolean;
  compact?: boolean;
  /** Controls whether the modal should be visible */
  isOpen?: boolean;
  /** Called when the user requests to close the modal */
  onClose?: () => void;
}

export const StudentVerificationPanel: React.FC<StudentVerificationPanelProps> = ({
  className = '',
  showTimeline = true,
  compact = false,
  isOpen = true,
  onClose,
}) => {
  const { t } = useTranslation();
  const {
    currentRecord,
    studentVerification,
    pendingPeers,
    isInitialized,
    initStudentRegistry,
    refreshStatus,
    errors,
    clearErrors,
  } = useStudentVerificationStore();

  const [portalNode] = React.useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;

    let node = document.getElementById('modal-root') as HTMLElement | null;

    if (!node) {
      node = document.createElement('div');
      node.id = 'modal-root';
      document.body.appendChild(node);
    }

    return node;
  });

  React.useEffect(() => {
    if (!isOpen) return;
    if (typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !onClose) return;
    if (typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Memoize peerSignatures to prevent unnecessary re-renders
  const peerSignatures = useMemo(() => {
    return currentRecord?.peerSignatures || [];
  }, [currentRecord?.peerSignatures]);

  // Memoize verification progress for UI updates
  const verificationProgress = useMemo(() => {
    if (!studentVerification) return null;

    const { hasActiveBiometric, hasPeerVouching, isVerified, needsReverification } = studentVerification;
    const completedSteps = [
      hasActiveBiometric,
      hasPeerVouching,
      isVerified && !needsReverification,
    ].filter(Boolean).length;

    return {
      completed: completedSteps,
      total: 3,
      percentage: Math.round((completedSteps / 3) * 100),
    };
  }, [studentVerification]);

  // Handle initialization when component mounts
  React.useEffect(() => {
    if (!isInitialized && currentRecord) {
      initStudentRegistry(currentRecord.walletAddress).catch(console.error);
    }
  }, [isInitialized, currentRecord, initStudentRegistry]);

  // Auto-refresh status every 30 seconds when verified
  React.useEffect(() => {
    if (studentVerification?.isVerified) {
      const interval = setInterval(() => {
        refreshStatus().catch(console.error);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [studentVerification?.isVerified, refreshStatus]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  if (!isOpen) {
    return null;
  }

  if (typeof document !== 'undefined' && portalNode == null) {
    return null;
  }

  const showHeaderActions = errors.length > 0 || Boolean(onClose);

  const renderPanelBody = () => {
    if (!currentRecord) {
      return (
        <div
          className={`p-6 text-center ${className}`}
          data-testid="student-verification-panel-content"
        >
          <div className="text-text-muted">
            {t('verification.noRecord', 'No verification record found')}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`space-y-6 ${className}`}
        data-testid="student-verification-panel-content"
      >
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {t('verification.title', 'Student Verification')}
            </h2>
            {studentVerification && (
              <div className="flex items-center gap-4 text-sm">
                <VerificationStatus size="sm" />
                {verificationProgress && (
                  <div className="text-text-muted">
                    {verificationProgress.completed}/{verificationProgress.total}{' '}
                    {t('verification.stepsCompleted', 'steps completed')}
                  </div>
                )}
              </div>
            )}
          </div>

          {showHeaderActions && (
            <div className="flex items-center gap-3">
              {errors.length > 0 && (
                <button
                  onClick={clearErrors}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  {t('common.clearErrors', 'Clear Errors')}
                </button>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={t('common.close', 'Close')}
                  title={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <h4 className="text-red-400 font-medium mb-2">
              {t('verification.errors', 'Verification Errors')}
            </h4>
            <ul className="text-red-300 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Main Verification Components */}
        <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
          {/* Biometric Registration */}
          <div className="space-y-4">
            <BiometricRegistration />

            {/* Peer Vouching */}
            <PeerVouchingRequest />
          </div>

          {/* Verification Status and Timeline */}
          <div className="space-y-6">
            {showTimeline && <ApprovalTimeline className="compact" />}

            {/* Progress Summary */}
            {verificationProgress && (
              <div className="glass p-4 rounded-xl border border-white/10">
                <h3 className="text-lg font-medium text-white mb-3">
                  {t('verification.progress', 'Verification Progress')}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">
                      {t('verification.completion', 'Completion')}
                    </span>
                    <span className="text-primary font-medium">
                      {verificationProgress.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <motion.div
                      className="h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${verificationProgress.percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="text-xs text-text-muted">
                    {verificationProgress.completed} {t('verification.of', 'of')}{' '}
                    {verificationProgress.total} {t('verification.stepsComplete', 'steps complete')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Peer Signatures Summary */}
        {peerSignatures.length > 0 && (
          <div className="glass p-4 rounded-xl border border-white/10">
            <h3 className="text-lg font-medium text-white mb-3">
              {t('verification.peerSignatures', 'Peer Signatures')} ({peerSignatures.length})
            </h3>
            <div className="space-y-2">
              {peerSignatures.map((signature: PeerSignature) => (
                <div key={signature.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">{signature.signerWallet}</span>
                  <span className="text-green-400">
                    {t('verification.signed', 'Signed')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Peers */}
        {pendingPeers.length > 0 && (
          <div className="glass p-4 rounded-xl border border-white/10">
            <h3 className="text-lg font-medium text-white mb-3">
              {t('verification.pendingPeers', 'Pending Invitations')} ({pendingPeers.length})
            </h3>
            <div className="space-y-2">
              {pendingPeers.map((peer) => (
                <div key={peer.walletAddress} className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    {peer.displayName || peer.walletAddress}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      peer.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : peer.status === 'signed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {t(`verification.status.${peer.status}`, peer.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto px-4 py-8 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('verification.title', 'Student Verification')}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" aria-hidden="true" />
      <div
        className="relative z-[10000] w-full max-w-5xl rounded-2xl border border-white/10 bg-surface/95 p-4 sm:p-6 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        data-testid="student-verification-panel"
        role="document"
        onClick={(event) => event.stopPropagation()}
      >
        {renderPanelBody()}
      </div>
    </div>
  );

  if (!portalNode) {
    return null;
  }

  return createPortal(modalContent, portalNode);
};

export default StudentVerificationPanel;
