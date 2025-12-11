import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStudentVerificationStore } from '../../lib/identity/studentVerificationState';
import { BiometricRegistration } from './BiometricRegistration';
import PeerVouchingRequest from './PeerVouchingRequest';
import VerificationStatus from './VerificationStatus';
import { ApprovalTimeline } from './ApprovalTimeline';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VerificationModal({ isOpen, onClose }: VerificationModalProps) {
  const { t } = useTranslation();
  const { studentVerification } = useStudentVerificationStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Save previous focus element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus trap - keep focus within modal
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Tab' && contentRef.current) {
        const focusableElements = contentRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    },
    []
  );

  // Close modal on Backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const isVerified = studentVerification?.isVerified ?? false;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center sm:items-center overflow-y-auto"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="presentation"
          aria-modal="true"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl mx-4 my-8 sm:my-auto max-h-[90vh] sm:max-h-[85vh] bg-surface/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 sm:py-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2
                    id="modal-title"
                    className="text-lg sm:text-xl font-semibold text-white"
                  >
                    {t('verification.title', 'Student Verification')}
                  </h2>
                  <p
                    id="modal-description"
                    className="text-xs sm:text-sm text-text-muted mt-0.5"
                  >
                    {isVerified
                      ? t('verification.status.verified', 'Your account is verified')
                      : t('verification.message.pending', 'Complete the steps below to verify your identity')}
                  </p>
                </div>
              </div>

              {/* Verification Badge */}
              {isVerified && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-xs font-medium text-emerald-400">
                    {t('verification.status.verified', 'Verified')}
                  </span>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={t('common.close', 'Close')}
                title={t('common.close', 'Close')}
              >
                <X className="w-5 h-5 text-text-muted hover:text-text" />
              </button>
            </div>

            {/* Content */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6"
            >
              {/* Status Overview */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <VerificationStatus
                  className="mb-6"
                  badgeClassName=""
                  showWallet={true}
                  size="md"
                />
              </motion.div>

              {/* Main Components Grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Left Column: Registration Steps */}
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <BiometricRegistration />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <PeerVouchingRequest />
                  </motion.div>
                </div>

                {/* Right Column: Timeline */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 bg-surface/30 backdrop-blur-sm rounded-xl border border-white/10"
                >
                  <ApprovalTimeline className="space-y-4" />
                </motion.div>
              </motion.div>

              {/* Info Box */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="p-4 bg-info/10 border border-info/20 rounded-lg"
              >
                <p className="text-sm text-info">
                  <span className="font-medium">ℹ️ {t('common.info', 'Info')}: </span>
                  {t(
                    'verification.modalInfo',
                    'Verification is secured using WebAuthn biometrics and peer attestations. Your data is stored locally and never sent to central servers.'
                  )}
                </p>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors hover:bg-white/10 text-text-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
