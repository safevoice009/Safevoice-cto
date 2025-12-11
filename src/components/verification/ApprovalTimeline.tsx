/**
 * Approval Timeline Component
 * 
 * Displays a visual timeline of the student verification process with three phases:
 * 1. Biometric commitment
 * 2. Peer vouching  
 * 3. Final verification status
 * 
 * Uses useStudentVerificationStore (read-only) to display current state.
 * Purely presentational component with no side effects.
 */

import { CheckCircle2, Clock, XCircle, Fingerprint, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStudentVerificationStore } from '../../lib/identity/studentVerificationState';

// Helper function to format dates using Intl.DateTimeFormat
const formatDate = (timestamp: number): string => {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
};

interface TimelineItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip: string;
  status: 'completed' | 'in-progress' | 'pending' | 'expired';
  timestamp?: string;
  details?: string;
  className?: string;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  icon,
  title,
  description,
  tip,
  status,
  timestamp,
  details,
  className,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" aria-label="Completed" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-yellow-500" aria-label="In Progress" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-400" aria-label="Pending" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" aria-label="Expired" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" aria-label="Pending" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'in-progress':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'pending':
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';
      case 'expired':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';
    }
  };

  return (
    <div className={[
      'flex gap-4 p-4 rounded-lg border transition-colors',
      getStatusColor(),
      className || ''
    ].filter(Boolean).join(' ')}>
      <div className="flex-shrink-0">
        {icon}
        <div className="flex justify-center mt-2">
          {getStatusIcon()}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {description}
        </p>
        
        {timestamp && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {timestamp}
          </p>
        )}
        
        {details && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-medium">
            {details}
          </p>
        )}
        
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-2" title={tip}>
          {tip}
        </p>
      </div>
    </div>
  );
};

interface ApprovalTimelineProps {
  className?: string;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ className }) => {
  const { currentRecord, studentVerification } = useStudentVerificationStore();
  const { t } = useTranslation();

  // Early return if no data available
  if (!currentRecord || !studentVerification) {
    return (
      <div className={[
        'space-y-4',
        className || ''
      ].filter(Boolean).join(' ')}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('verification.timeline.title', 'Verification Progress')}
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('verification.timeline.noData', 'No verification data available')}
        </div>
      </div>
    );
  }

  // Determine biometric status
  const biometricCommitments = currentRecord.biometricCommitments || [];
  const hasBiometric = studentVerification.hasActiveBiometric;
  const mostRecentBiometric = biometricCommitments.length > 0 
    ? biometricCommitments.reduce((latest, current) => 
        current.createdAt > latest.createdAt ? current : latest
      )
    : null;

  // Determine peer vouching status  
  const peerSignatures = currentRecord.peerSignatures || [];
  const requiredSignatures = 2;
  const hasPeers = studentVerification.hasPeerVouching;
  const signatureCount = peerSignatures.length;

  // Determine final verification status
  let finalStatus: 'completed' | 'in-progress' | 'pending' | 'expired';
  let finalDescription = '';
  
  if (studentVerification.isVerified) {
    finalStatus = 'completed';
    finalDescription = t('verification.timeline.verified.checkmark');
  } else if (studentVerification.needsReverification) {
    finalStatus = 'expired';
    finalDescription = t('verification.timeline.verified.expired');
  } else if (hasBiometric || hasPeers) {
    finalStatus = 'in-progress';
    finalDescription = t('verification.timeline.verified.pending');
  } else {
    finalStatus = 'pending';
    finalDescription = t('verification.timeline.verified.pending');
  }

  return (
    <div className={[
      'space-y-4',
      className || ''
    ].filter(Boolean).join(' ')}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t('verification.timeline.title', 'Verification Progress')}
      </h2>
      
      <div className="space-y-4">
        {/* Step 1: Biometric */}
        <TimelineItem
          icon={<Fingerprint className="h-6 w-6 text-blue-500" />}
          title={t('verification.timeline.biometric.title')}
          description={
            hasBiometric 
              ? t('verification.timeline.biometric.description')
              : t('verification.timeline.biometric.tip')
          }
          tip={t('verification.timeline.biometric.tip')}
          status={hasBiometric ? 'completed' : 'pending'}
          timestamp={
            hasBiometric && mostRecentBiometric
              ? t('verification.timeline.committed', 'Committed {{date}}', {
                  date: formatDate(mostRecentBiometric.createdAt)
                })
              : undefined
          }
          details={
            mostRecentBiometric?.deviceLabel
              ? `Device: ${mostRecentBiometric.deviceLabel}`
              : undefined
          }
        />

        {/* Step 2: Peer Vouching */}
        <TimelineItem
          icon={<Users className="h-6 w-6 text-purple-500" />}
          title={t('verification.timeline.peer.title')}
          description={
            hasPeers
              ? t('verification.timeline.peer.description')
              : t('verification.timeline.peer.tip')
          }
          tip={t('verification.timeline.peer.tip')}
          status={hasPeers ? 'completed' : 'in-progress'}
          timestamp={
            signatureCount > 0
              ? t('verification.timeline.signedBy', 'Signed by {{count}} peer{{plural}}', {
                  count: signatureCount,
                  plural: signatureCount === 1 ? '' : 's'
                })
              : undefined
          }
          details={
            peerSignatures.length > 0
              ? t('verification.timeline.peer.progress', '{{count}}/{{required}} required', {
                  count: signatureCount,
                  required: requiredSignatures
                })
              : undefined
          }
        />

        {/* Step 3: Final Verification */}
        <TimelineItem
          icon={
            finalStatus === 'completed' 
              ? <CheckCircle2 className="h-6 w-6 text-green-500" />
              : finalStatus === 'expired'
              ? <XCircle className="h-6 w-6 text-red-500" />
              : <Clock className="h-6 w-6 text-yellow-500" />
          }
          title={t('verification.timeline.verified.title')}
          description={finalDescription}
          tip={t('verification.timeline.verified.tip')}
          status={finalStatus}
          timestamp={
            finalStatus === 'completed' && studentVerification.expiresAt
              ? t('verification.timeline.expiresOn', 'Expires {{date}}', {
                  date: formatDate(studentVerification.expiresAt)
                })
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default ApprovalTimeline;