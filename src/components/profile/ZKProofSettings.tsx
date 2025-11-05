import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertCircle, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { getCommitmentExpiryDate, isCommitmentValid } from '../../lib/zkProof';

export default function ZKProofSettings() {
  const {
    zkProofCommitment,
    zkProofVerificationBadge,
    generateZKProofCommitment,
    verifyZKProofCommitment,
    revokeZKProofCommitment,
    clearZKProofCommitment,
  } = useStore();

  const [studentId, setStudentId] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [enrollmentYear, setEnrollmentYear] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (zkProofCommitment && !isCommitmentValid(zkProofCommitment)) {
      revokeZKProofCommitment();
    }
  }, [zkProofCommitment, revokeZKProofCommitment]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentId.trim() || !institutionId.trim() || !enrollmentYear.trim()) {
      return;
    }

    setIsGenerating(true);
    const success = await generateZKProofCommitment(
      studentId.trim(),
      institutionId.trim(),
      enrollmentYear.trim()
    );
    
    if (success) {
      setStudentId('');
      setInstitutionId('');
      setEnrollmentYear('');
      setShowForm(false);
    }
    
    setIsGenerating(false);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    await verifyZKProofCommitment();
    setIsVerifying(false);
  };

  const handleRevoke = () => {
    if (window.confirm('Are you sure you want to revoke your verification? This cannot be undone.')) {
      revokeZKProofCommitment();
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all verification data?')) {
      clearZKProofCommitment();
    }
  };

  const expiryDate = zkProofCommitment ? getCommitmentExpiryDate(zkProofCommitment) : null;
  const isValid = zkProofCommitment ? isCommitmentValid(zkProofCommitment) : false;

  return (
    <motion.div
      className="glass p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-white">Student Verification</h2>
        </div>
        {zkProofVerificationBadge && isValid && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold text-green-400">Verified</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-blue-300 font-medium">Anonymous Verification</p>
              <p className="text-xs text-gray-400">
                Prove your student status without revealing your identity using zero-knowledge proofs.
                Your personal information never leaves your device.
              </p>
            </div>
          </div>
        </div>

        {!zkProofCommitment && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:shadow-lg transition-all"
            type="button"
          >
            Generate Verification Proof
          </button>
        )}

        {showForm && !zkProofCommitment && (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-300 mb-2">
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g., 2024123456"
                className="w-full px-4 py-2 rounded-lg bg-surface/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="institutionId" className="block text-sm font-medium text-gray-300 mb-2">
                Institution ID
              </label>
              <input
                id="institutionId"
                type="text"
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                placeholder="e.g., MIT, STANFORD, etc."
                className="w-full px-4 py-2 rounded-lg bg-surface/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label htmlFor="enrollmentYear" className="block text-sm font-medium text-gray-300 mb-2">
                Enrollment Year
              </label>
              <input
                id="enrollmentYear"
                type="text"
                value={enrollmentYear}
                onChange={(e) => setEnrollmentYear(e.target.value)}
                placeholder="e.g., 2024"
                className="w-full px-4 py-2 rounded-lg bg-surface/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate Proof'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-3 rounded-lg bg-surface/50 text-gray-300 hover:text-white transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {zkProofCommitment && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-surface/50 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Status</span>
                {isValid ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold text-red-400">
                      {zkProofCommitment.isRevoked ? 'Revoked' : 'Expired'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Created</span>
                <span className="text-sm text-gray-300">
                  {new Date(zkProofCommitment.createdAt).toLocaleDateString()}
                </span>
              </div>

              {expiryDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">Expires</span>
                  <span className="text-sm text-gray-300">
                    {expiryDate.toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-white/10">
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                    View Commitment Hash
                  </summary>
                  <code className="block mt-2 p-2 rounded bg-black/30 text-gray-500 break-all">
                    {zkProofCommitment.commitment}
                  </code>
                </details>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isValid && (
                <>
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-medium hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    {isVerifying ? 'Verifying...' : 'Re-verify'}
                  </button>
                  <button
                    onClick={handleRevoke}
                    className="px-4 py-2 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 font-medium hover:bg-orange-500/30 transition-all"
                    type="button"
                  >
                    Revoke
                  </button>
                </>
              )}
              <button
                onClick={handleClear}
                className={`px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 transition-all flex items-center justify-center space-x-2 ${
                  isValid ? '' : 'col-span-2'
                }`}
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Data</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
