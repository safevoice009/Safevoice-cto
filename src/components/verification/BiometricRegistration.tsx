import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Fingerprint, Smartphone, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStudentVerificationStore } from '../../lib/identity/studentVerificationState';

export const BiometricRegistration: React.FC = () => {
  const { t } = useTranslation();
  const [deviceLabel, setDeviceLabel] = useState(t('verification.biometric.currentDevice', 'Current Device'));
  const [isRegistering, setIsRegistering] = useState(false);
  
  const { 
    currentRecord, 
    submitBiometricCommitment,
    errors 
  } = useStudentVerificationStore();

  const registeredCount = currentRecord?.biometricCommitments?.length || 0;
  const isLimitReached = registeredCount >= 3;
  const canRegister = !isLimitReached && deviceLabel.trim().length > 0;

  const handleRegister = async () => {
    if (isLimitReached) {
      toast.error(t('verification.biometric.limitError'));
      return;
    }

    if (!deviceLabel.trim()) {
      return;
    }

    setIsRegistering(true);
    try {
      await submitBiometricCommitment(deviceLabel);
      toast.success(t('verification.biometric.success'));
      setDeviceLabel(t('verification.biometric.currentDevice', 'Current Device'));
    } catch (error) {
      console.error('Biometric registration failed:', error);
      toast.error(t('verification.biometric.error'));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-4 p-6 bg-surface/30 backdrop-blur-sm rounded-xl border border-white/10">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            {t('verification.biometric.title')}
          </h3>
          <p className="text-sm text-text-muted">
            {t('verification.biometric.description')}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
          isLimitReached 
            ? 'bg-warning/10 text-warning border-warning/20' 
            : 'bg-primary/10 text-primary border-primary/20'
        }`}>
          {t('verification.biometric.progress', { count: registeredCount })}
        </div>
      </div>

      {isLimitReached && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm text-warning">
            <p className="font-semibold mb-1">{t('verification.biometric.limitReached')}</p>
            <p>{t('verification.biometric.limitError')}</p>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor="device-label" className="block text-sm font-medium text-text-muted mb-1">
            {t('verification.biometric.deviceLabel')}
          </label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="device-label"
              type="text"
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              disabled={isRegistering || isLimitReached}
              className="w-full pl-9 pr-4 py-2 bg-background/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={t('verification.biometric.deviceLabel')}
            />
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={!canRegister || isRegistering}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            !canRegister || isRegistering
              ? 'bg-white/5 text-text-muted cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20'
          }`}
        >
          {isRegistering ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('verification.biometric.registering')}
            </>
          ) : (
            <>
              {isLimitReached ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Fingerprint className="w-4 h-4" />
              )}
              {isLimitReached ? t('verification.biometric.limitReached') : t('verification.biometric.registerButton')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
