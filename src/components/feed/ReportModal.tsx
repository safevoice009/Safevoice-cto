import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '../../lib/store';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  commentId?: string;
}

const reportOptions = [
  { value: 'spam', label: '🚫 Spam or Misleading' },
  { value: 'harassment', label: '😡 Harassment or Hate Speech' },
  { value: 'privacy', label: '🔒 Personal Information Exposed' },
  { value: 'self-harm', label: '🆘 Self-Harm or Suicide Risk' },
  { value: 'other', label: '⚠️ Other' },
];

export default function ReportModal({ isOpen, onClose, postId, commentId }: ReportModalProps) {
  const [selectedOption, setSelectedOption] = useState('');
  const [description, setDescription] = useState('');
  const { addReport, studentId } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    addReport({
      postId,
      commentId,
      reportType: reportOptions.find((opt) => opt.value === selectedOption)?.label || selectedOption,
      description,
      reporterId: studentId,
    });

    setSelectedOption('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="glass max-w-md w-full p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Report Content</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <p className="text-sm text-gray-400">
            Help us understand what's wrong. Your report will be reviewed by our team.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {reportOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedOption === option.value
                      ? 'bg-primary/20 border-primary text-white'
                      : 'border-white/10 hover:border-white/30 text-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={option.value}
                    checked={selectedOption === option.value}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>

            {selectedOption === 'other' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide more details..."
                  className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary transition-colors"
                  rows={3}
                  maxLength={200}
                />
                <div className="mt-1 text-xs text-gray-400 text-right">
                  {description.length}/200
                </div>
              </motion.div>
            )}

            {selectedOption === 'self-harm' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg space-y-2"
              >
                <p className="text-sm text-red-400 font-medium">🆘 Crisis Support Available</p>
                <p className="text-xs text-gray-300">
                  If you or someone you know is in crisis, please contact:
                </p>
                <div className="text-xs text-gray-300 space-y-1">
                  <p>• Aasra Suicide Prevention: 91-9820466726</p>
                  <p>• Kiran Mental Health: 1800-599-0019</p>
                </div>
              </motion.div>
            )}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedOption}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Report
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
