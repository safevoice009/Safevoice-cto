import { motion } from 'framer-motion';
import type { PrivacyOnboardingStep } from '../../lib/store';

interface PrivacyProgressBarProps {
  currentStep: PrivacyOnboardingStep;
  totalSteps?: number;
}

export default function PrivacyProgressBar({ currentStep, totalSteps = 3 }: PrivacyProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="text-xs text-gray-400">{Math.round(progress)}%</p>
      </div>
      
      <div className="w-full h-2 bg-surface/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-purple-500"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        {[1, 2, 3].map((step) => (
          <motion.div
            key={step}
            className={`h-2 flex-1 rounded-full ${
              step <= currentStep ? 'bg-primary' : 'bg-surface/50'
            }`}
            initial={false}
            animate={{ scaleX: step <= currentStep ? 1 : 0.8 }}
          />
        ))}
      </div>
    </div>
  );
}
