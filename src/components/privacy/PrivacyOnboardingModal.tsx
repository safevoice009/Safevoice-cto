import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import PrivacyProgressBar from './PrivacyProgressBar';

export default function PrivacyOnboardingModal() {
  const { t } = useTranslation();
  const privacyOnboarding = useStore((state) => state.privacyOnboarding);
  const openPrivacyOnboarding = useStore((state) => state.openPrivacyOnboarding);
  const closePrivacyOnboarding = useStore((state) => state.closePrivacyOnboarding);
  const advancePrivacyOnboardingStep = useStore((state) => state.advancePrivacyOnboardingStep);
  const goBackPrivacyOnboardingStep = useStore((state) => state.goBackPrivacyOnboardingStep);
  const completePrivacyOnboarding = useStore((state) => state.completePrivacyOnboarding);
  const snoozePrivacyOnboarding = useStore((state) => state.snoozePrivacyOnboarding);
  const shouldShowPrivacyOnboarding = useStore((state) => state.shouldShowPrivacyOnboarding);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Auto-open on first visit if not completed or snoozed
    if (shouldShowPrivacyOnboarding() && !privacyOnboarding.isOpen && !privacyOnboarding.startedAt) {
      openPrivacyOnboarding();
    }
  }, [shouldShowPrivacyOnboarding, privacyOnboarding.isOpen, privacyOnboarding.startedAt, openPrivacyOnboarding]);

  // Keyboard navigation
  useEffect(() => {
    if (!privacyOnboarding.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePrivacyOnboarding();
      } else if (e.key === 'ArrowRight') {
        if (privacyOnboarding.currentStep < 3) {
          advancePrivacyOnboardingStep();
        }
      } else if (e.key === 'ArrowLeft') {
        if (privacyOnboarding.currentStep > 1) {
          goBackPrivacyOnboardingStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    privacyOnboarding.isOpen,
    privacyOnboarding.currentStep,
    closePrivacyOnboarding,
    advancePrivacyOnboardingStep,
    goBackPrivacyOnboardingStep,
  ]);

  // Focus management
  useEffect(() => {
    if (privacyOnboarding.isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [privacyOnboarding.isOpen]);

  const getStepContent = () => {
    const step = privacyOnboarding.currentStep;
    const keyPrefix = `privacyOnboarding.step${step}`;

    return {
      title: t(`${keyPrefix}.title`),
      description: t(`${keyPrefix}.description`),
      highlights: t(`${keyPrefix}.highlights`, { returnObjects: true }) as string[],
    };
  };

  const content = getStepContent();
  const isLastStep = privacyOnboarding.currentStep === 3;

  return (
    <AnimatePresence>
      {privacyOnboarding.isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePrivacyOnboarding}
            className="fixed inset-0 bg-black/50 z-40"
            aria-hidden="true"
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-onboarding-title"
          >
            <div className="glass p-8 rounded-2xl space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2
                    id="privacy-onboarding-title"
                    className="text-3xl font-bold text-white mb-2"
                  >
                    {t('privacyOnboarding.title')}
                  </h2>
                  <p className="text-gray-400">
                    {t('privacyOnboarding.description')}
                  </p>
                </div>

                <button
                  ref={closeButtonRef}
                  onClick={closePrivacyOnboarding}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-surface/50"
                  aria-label="Close privacy onboarding"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Progress */}
              <PrivacyProgressBar currentStep={privacyOnboarding.currentStep} />

              {/* Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={privacyOnboarding.currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-48 space-y-4"
                >
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-3">
                      {content.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {content.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4">
                    {Array.isArray(content.highlights) && content.highlights.map((highlight, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-3 text-gray-300"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{highlight}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/10">
                <div className="flex gap-3">
                  <button
                    onClick={closePrivacyOnboarding}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-surface/50 text-sm font-medium"
                  >
                    {t('privacyOnboarding.skipButton')}
                  </button>
                  <button
                    onClick={() => snoozePrivacyOnboarding(30)}
                    className="px-4 py-2 text-gray-400 hover:text-gray-300 text-xs transition-colors"
                  >
                    Remind in 30 days
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={goBackPrivacyOnboardingStep}
                    disabled={privacyOnboarding.currentStep === 1}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-surface/50"
                    aria-label="Previous step"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {isLastStep ? (
                    <button
                      onClick={completePrivacyOnboarding}
                      className="px-6 py-2 bg-gradient-to-r from-primary to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t('privacyOnboarding.completeButton')}
                    </button>
                  ) : (
                    <button
                      onClick={advancePrivacyOnboardingStep}
                      className="px-6 py-2 bg-gradient-to-r from-primary to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center gap-2"
                    >
                      {t('privacyOnboarding.nextButton')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
