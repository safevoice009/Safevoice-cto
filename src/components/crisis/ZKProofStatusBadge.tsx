import { motion } from 'framer-motion';
import { Shield, ShieldCheck, AlertCircle, Loader2, Lock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ZKProofState } from '../../lib/store';

interface ZKProofStatusBadgeProps {
  zkProofState?: ZKProofState;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ZKProofStatusBadge({
  zkProofState,
  showLabel = true,
  size = 'md',
  className = '',
}: ZKProofStatusBadgeProps) {
  const { t } = useTranslation();

  const getStatusIcon = () => {
    switch (zkProofState?.status) {
      case 'pending':
        return <Loader2 className="animate-spin" />;
      case 'success':
        return <Shield />;
      case 'verified':
        return <ShieldCheck />;
      case 'failed':
      case 'verification_failed':
        return <AlertCircle />;
      default:
        return <Lock />;
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
        return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      case 'success':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'verified':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      case 'failed':
      case 'verification_failed':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs gap-1';
      case 'md':
        return 'px-3 py-1.5 text-sm gap-1.5';
      case 'lg':
        return 'px-4 py-2 text-base gap-2';
      default:
        return 'px-3 py-1.5 text-sm gap-1.5';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'md':
        return 'w-4 h-4';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  const statusColor = getStatusColor();
  const sizeClasses = getSizeClasses();
  const iconSize = getIconSize();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center border rounded-full font-medium transition-colors
        ${statusColor}
        ${sizeClasses}
        ${className}
      `}
    >
      <span className={iconSize}>
        {getStatusIcon()}
      </span>
      
      {showLabel && (
        <motion.span
          key={zkProofState?.status || 'default'}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {getStatusText()}
        </motion.span>
      )}

      {zkProofState?.status === 'verified' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          <CheckCircle className={`${iconSize} text-emerald-400`} />
        </motion.div>
      )}
    </motion.div>
  );
}