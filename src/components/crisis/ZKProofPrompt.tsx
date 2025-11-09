import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, AlertCircle, Loader2, RefreshCw, Lock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../lib/store';

interface ZKProofPromptProps {
  requestId: string;
  witness: string | Uint8Array;
  additionalData?: string | Uint8Array;
  onProofComplete?: (success: boolean) => void;
  className?: string;
}

export default function ZKProofPrompt({
  requestId,
  witness,
  additionalData,
  onProofComplete,
  className = '',
}: ZKProofPromptProps) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const zkProofState = useStore((state) => state.zkProofs[requestId]);
  const prepareZKProof = useStore((state) => state.prepareZKProof);
  const submitZKProof = useStore((state) => state.submitZKProof);
  const verifyZKProof = useStore((state) => state.verifyZKProof);
  const clearZKProof = useStore((state) => state.clearZKProof);

  // Auto-generate proof when component mounts and no proof exists
  useEffect(() => {
    if (!zkProofState && !isGenerating) {
      handleGenerateProof();
    }
  }, [zkProofState, isGenerating, handleGenerateProof]);

  const handleGenerateProof = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      const result = await prepareZKProof(requestId, witness);
      if (result.success && result.artifacts) {
        await submitZKProof(requestId, witness, additionalData);
        const verifyResult = await verifyZKProof(requestId, witness);
        onProofComplete?.(verifyResult.success && verifyResult.verified);
      } else {
        onProofComplete?.(false);
      }
    } catch (error) {
      console.error('ZK proof generation failed:', error);
      onProofComplete?.(false);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, requestId, witness, additionalData, prepareZKProof, submitZKProof, verifyZKProof, onProofComplete]);

  const handleRetry = async () => {
    clearZKProof(requestId);
    await handleGenerateProof();
  };

  const getStatusIcon = () => {
    switch (zkProofState?.status) {
      case 'pending':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <Shield className="w-5 h-5 text-green-500" />;
      case 'verified':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'failed':
      case 'verification_failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Lock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (zkProofState?.status) {
      case 'pending':
        return t('zkProof.status.pending');
      case 'success':
        return t('zkProof.status.success');
      case 'verified':
        return t('zkProof.status.verified');
      case 'failed':
        return t('zkProof.status.failed');
      case 'verification_failed':
        return t('zkProof.status.verificationFailed');
      default:
        return t('zkProof.status.notStarted');
    }
  };

  const getStatusColor = () => {
    switch (zkProofState?.status) {
      case 'pending':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-300';
      case 'verified':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
      case 'failed':
      case 'verification_failed':
        return 'bg-red-500/10 border-red-500/30 text-red-300';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-300';
    }
  };

  const showRetryButton = zkProofState?.status === 'failed' || zkProofState?.status === 'verification_failed';
  const isLoading = isGenerating || isVerifying || zkProofState?.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-lg p-4 border border-white/10 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-sm font-medium text-white">
              {t('zkProof.title')}
            </h3>
            <p className="text-xs text-gray-400">
              {t('zkProof.description')}
            </p>
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {showRetryButton && !isLoading && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleRetry}
              disabled={isLoading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="text-xs text-red-300">
                {t('zkProof.retry')}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className={`flex items-center justify-between px-3 py-2 rounded-md border ${getStatusColor()}`}>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-xs font-medium">
            {getStatusText()}
          </span>
        </div>
        
        {zkProofState?.status === 'verified' && (
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        )}
      </div>

      {zkProofState?.error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-md"
        >
          <p className="text-xs text-red-300">
            {t('zkProof.error')}: {zkProofState.error}
          </p>
        </motion.div>
      )}

      {isLoading && (
        <div className="mt-3 flex items-center space-x-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>
            {isGenerating ? t('zkProof.generating') : t('zkProof.verifying')}
          </span>
        </div>
      )}

      {zkProofState?.status === 'verified' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md"
        >
          <p className="text-xs text-emerald-300">
            {t('zkProof.verifiedMessage')}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}