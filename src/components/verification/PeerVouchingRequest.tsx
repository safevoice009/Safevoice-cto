import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useStudentVerificationStore } from '../../lib/identity/studentVerificationState';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function PeerVouchingRequest() {
  const { t } = useTranslation();
  const { 
    requestPeerVouching, 
    pendingPeers, 
    currentRecord, 
    errors: storeErrors 
  } = useStudentVerificationStore();

  const [peers, setPeers] = useState<string[]>(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate approval progress
  const uniqueSignatures = currentRecord?.peerSignatures 
    ? new Set(currentRecord.peerSignatures.map(s => s.signerWallet)).size 
    : 0;
  const approvalCount = Math.min(uniqueSignatures, 2);
  const isComplete = approvalCount >= 2;

  const handlePeerChange = (index: number, value: string) => {
    const newPeers = [...peers];
    newPeers[index] = value;
    setPeers(newPeers);
    setValidationError(null);
  };

  const validate = (): boolean => {
    // Check for empty fields
    if (peers.some(p => !p.trim())) {
      return false; // Disable button but don't show error yet
    }

    // Check for duplicates within input
    const unique = new Set(peers.map(p => p.trim()));
    if (unique.size !== 3) {
      setValidationError(t('verification.peerVouching.errorDuplicate'));
      return false;
    }

    // Check for duplicates against user's own wallet
    if (currentRecord?.walletAddress && peers.some(p => p.toLowerCase() === currentRecord.walletAddress.toLowerCase())) {
        setValidationError(t('verification.peerVouching.errorSelf'));
        return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setValidationError(null);

    try {
      await requestPeerVouching(peers.map(p => p.trim()));
      toast.success(t('verification.peerVouching.success'));
      setPeers(['', '', '']); // Reset inputs
    } catch (error) {
      console.error(error);
      toast.error(t('verification.peerVouching.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = peers.every(p => p.trim().length > 0) && !isSubmitting && !isComplete;

  return (
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {t('verification.peerVouching.title')}
          </h3>
          <p className="text-gray-400 mt-1">
            {t('verification.peerVouching.description')}
          </p>
        </div>
      </div>

      <div className="glass p-6 rounded-xl border border-white/10 space-y-6">
        {/* Status Indicator */}
        <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-white/5">
          <div className="flex items-center space-x-2">
            {isComplete ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Clock className="w-5 h-5 text-yellow-400" />
            )}
            <span className="text-sm font-medium text-white">
                {isComplete 
                  ? t('verification.status.verified') 
                  : t('verification.peerVouching.waitingApproval', { count: approvalCount })
                }
            </span>
          </div>
          <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isComplete ? 'bg-green-400' : 'bg-primary'}`}
              style={{ width: `${(approvalCount / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Input Form */}
        {!isComplete && (
            <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-400">
                {t('verification.peerVouching.instruction')}
            </p>
            
            <div className="space-y-3">
                {peers.map((peer, index) => (
                <div key={index}>
                    <label className="block text-xs text-gray-500 mb-1">
                    {t('verification.peerVouching.peerLabel', { index: index + 1 })}
                    </label>
                    <input
                    type="text"
                    value={peer}
                    onChange={(e) => handlePeerChange(index, e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                </div>
                ))}
            </div>

            {validationError && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{validationError}</span>
                </div>
            )}

            {storeErrors.length > 0 && (
                <div className="space-y-1">
                    {storeErrors.map((err, i) => (
                        <div key={i} className="flex items-center space-x-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{err}</span>
                        </div>
                    ))}
                </div>
            )}

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {isSubmitting 
                ? t('verification.peerVouching.requesting') 
                : t('verification.peerVouching.requestButton')
                }
            </motion.button>
            </form>
        )}

        {/* Pending Peers List */}
        {pendingPeers.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-gray-300">
              {t('verification.peerVouching.pendingPeers')}
            </h4>
            <div className="space-y-2">
              {pendingPeers.map((peer, i) => (
                <div key={`${peer.walletAddress}-${i}`} className="flex items-center justify-between text-sm p-2 rounded bg-surface/30">
                  <span className="font-mono text-gray-400 truncate max-w-[200px]">
                    {peer.walletAddress}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    peer.status === 'signed' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {peer.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
