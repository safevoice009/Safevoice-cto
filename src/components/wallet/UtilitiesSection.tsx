import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Download, Edit, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UtilitiesSection() {
  const { studentId, voiceBalance, changeStudentId, downloadDataBackup } = useStore();
  const [showChangeIdModal, setShowChangeIdModal] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleChangeStudentId = () => {
    if (!newStudentId.trim()) {
      toast.error('Please enter a new Student ID');
      return;
    }

    setIsChanging(true);
    const success = changeStudentId(newStudentId);
    setIsChanging(false);

    if (success) {
      setNewStudentId('');
      setShowChangeIdModal(false);
    }
  };

  const handleDownloadBackup = () => {
    downloadDataBackup();
  };

  const changeCost = 50;
  const canChangeId = voiceBalance >= changeCost;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass p-6 space-y-4"
      >
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span>🛠️</span>
          <span>Special Utilities</span>
        </h2>

        <div className="space-y-3">
          {/* Change Student ID */}
          <div className="flex items-center justify-between p-4 bg-surface/30 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-primary" />
                <h3 className="text-white font-semibold">Change Student ID</h3>
              </div>
              <p className="text-sm text-gray-400 mt-1">Customize your anonymous identity</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-gray-500">Current: </span>
                <span className="text-xs text-primary font-mono">{studentId}</span>
              </div>
            </div>
            <button
              onClick={() => setShowChangeIdModal(true)}
              disabled={!canChangeId}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                canChangeId
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  : 'bg-surface/50 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Edit className="w-4 h-4" />
              <span>{changeCost} VOICE</span>
            </button>
          </div>

          {/* Download Data Backup */}
          <div className="flex items-center justify-between p-4 bg-surface/30 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-semibold">Download Data Backup</h3>
              </div>
              <p className="text-sm text-gray-400 mt-1">Export all your data as JSON</p>
              <p className="text-xs text-green-400 mt-1">✓ Free - No VOICE required</p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>

          {/* Info about post lifetime extension */}
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-start space-x-2">
              <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-blue-400 font-semibold text-sm">Post Lifetime Extension</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Extend your post's lifetime by 24 hours for 10 VOICE. Available on each post when expiration is approaching (within 6 hours).
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Change Student ID Modal */}
      {showChangeIdModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-6 rounded-2xl max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Change Student ID</h3>
              <button
                onClick={() => setShowChangeIdModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Current ID</label>
                <div className="p-3 bg-surface/50 rounded-lg">
                  <p className="text-white font-mono">{studentId}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">New Student ID</label>
                <input
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="Enter new ID (min 3 characters)"
                  className="w-full px-4 py-3 bg-surface/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  disabled={isChanging}
                  maxLength={50}
                />
              </div>

              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-300">
                      This will change your Student ID across all posts, comments, and interactions. Cost: <span className="text-primary font-semibold">{changeCost} VOICE</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowChangeIdModal(false)}
                  disabled={isChanging}
                  className="flex-1 px-4 py-3 bg-surface/50 text-white rounded-lg hover:bg-surface/70 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeStudentId}
                  disabled={isChanging || !newStudentId.trim() || newStudentId.trim().length < 3}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isChanging ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Changing...</span>
                    </span>
                  ) : (
                    `Change for ${changeCost} VOICE`
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
