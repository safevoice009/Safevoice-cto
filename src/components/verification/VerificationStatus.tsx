import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, Clock, Wallet as WalletIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStudentVerificationStore } from '../../lib/identity/studentVerificationState';

interface VerificationStatusProps {
  className?: string;
  badgeClassName?: string;
  walletClassName?: string;
  messageClassName?: string;
  showWallet?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function VerificationStatus({
  className = '',
  badgeClassName = '',
  walletClassName = '',
  messageClassName = '',
  showWallet = true,
  size = 'md',
}: VerificationStatusProps) {
  const { t } = useTranslation();
  const { studentVerification, currentRecord } = useStudentVerificationStore();

  // Determine verification state
  const isVerified = studentVerification?.isVerified ?? false;
  const expiresAt = studentVerification?.expiresAt ?? null;
  const needsReverification = studentVerification?.needsReverification ?? false;
  const walletAddress = currentRecord?.walletAddress ?? null;

  // Check if expired
  const now = Date.now();
  const isExpired = expiresAt !== null && expiresAt < now;

  // Determine status
  const getStatus = (): 'verified' | 'expired' | 'pending' | 'reverify' => {
    if (isExpired) return 'expired';
    if (isVerified && needsReverification) return 'reverify';
    if (isVerified) return 'verified';
    return 'pending';
  };

  const status = getStatus();

  // Status configuration
  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          label: t('verification.status.verified'),
          color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
          iconColor: 'text-emerald-400',
          message: null,
        };
      case 'expired':
        return {
          icon: AlertCircle,
          label: t('verification.status.expired'),
          color: 'text-red-500 bg-red-500/10 border-red-500/30',
          iconColor: 'text-red-400',
          message: t('verification.message.expired'),
        };
      case 'reverify':
        return {
          icon: Clock,
          label: t('verification.status.reverify'),
          color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
          iconColor: 'text-yellow-400',
          message: expiresAt
            ? t('verification.message.reverify', { date: new Date(expiresAt).toLocaleDateString() })
            : t('verification.message.reverifySoon'),
        };
      case 'pending':
      default:
        return {
          icon: Shield,
          label: t('verification.status.pending'),
          color: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
          iconColor: 'text-gray-400',
          message: t('verification.message.pending'),
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          badge: 'px-2 py-1 text-xs gap-1',
          icon: 'w-3 h-3',
          wallet: 'text-xs',
          message: 'text-xs',
        };
      case 'md':
        return {
          badge: 'px-3 py-1.5 text-sm gap-1.5',
          icon: 'w-4 h-4',
          wallet: 'text-sm',
          message: 'text-sm',
        };
      case 'lg':
        return {
          badge: 'px-4 py-2 text-base gap-2',
          icon: 'w-5 h-5',
          wallet: 'text-base',
          message: 'text-base',
        };
      default:
        return {
          badge: 'px-3 py-1.5 text-sm gap-1.5',
          icon: 'w-4 h-4',
          wallet: 'text-sm',
          message: 'text-sm',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col gap-3 ${className}`}
    >
      {/* Wallet Address Display */}
      {showWallet && walletAddress && (
        <div className={`flex items-center gap-2 text-text-muted ${sizeClasses.wallet} ${walletClassName}`}>
          <WalletIcon className={sizeClasses.icon} />
          <span className="font-mono">
            {t('verification.wallet')}: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
      )}

      {/* Status Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          inline-flex items-center border rounded-full font-medium transition-colors
          ${config.color}
          ${sizeClasses.badge}
          ${badgeClassName}
        `}
      >
        <Icon className={`${sizeClasses.icon} ${config.iconColor}`} />
        <motion.span
          key={status}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {config.label}
        </motion.span>
      </motion.div>

      {/* Status Message */}
      {config.message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-text-secondary ${sizeClasses.message} ${messageClassName}`}
        >
          {config.message}
        </motion.p>
      )}
    </motion.div>
  );
}
