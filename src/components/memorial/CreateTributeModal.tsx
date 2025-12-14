import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, AlertTriangle, Info } from 'lucide-react';
import { useStore } from '../../lib/store';

interface CreateTributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tributeToEdit?: {
    id: string;
    personName: string;
    message: string;
    dateOfRemembrance?: string;
    college?: string;
    cosigners?: Array<{ peerId: string }>;
  };
}

export default function CreateTributeModal({ isOpen, onClose, tributeToEdit }: CreateTributeModalProps) {
  const [personName, setPersonName] = useState('');
  const [message, setMessage] = useState('');
  const [dateOfRemembrance, setDateOfRemembrance] = useState('');
  const [college, setCollege] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const createTribute = useStore((state) => state.createTribute);

  useEffect(() => {
    if (isOpen && tributeToEdit) {
      setPersonName(tributeToEdit.personName);
      setMessage(tributeToEdit.message);
      setDateOfRemembrance(tributeToEdit.dateOfRemembrance || '');
      setCollege(tributeToEdit.college || '');
      
      if (tributeToEdit.cosigners && tributeToEdit.cosigners.length > 0) {
        setShowEditWarning(true);
      }
    } else if (isOpen) {
      setPersonName('');
      setMessage('');
      setDateOfRemembrance('');
      setCollege('');
      setShowEditWarning(false);
    }
  }, [isOpen, tributeToEdit]);

  const validateInput = () => {
    const trimmedName = personName.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length === 0) {
      return 'Person name is required';
    }
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return 'Name must be between 1 and 100 characters';
    }
    if (trimmedMessage.length < 10) {
      return 'Message must be at least 10 characters';
    }
    if (trimmedMessage.length > 600) {
      return 'Message must not exceed 600 characters';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateInput();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const success = createTribute(
        personName,
        message,
        dateOfRemembrance || undefined,
        college || undefined
      );
      
      if (success) {
        setPersonName('');
        setMessage('');
        setDateOfRemembrance('');
        setCollege('');
        setShowEditWarning(false);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPersonName('');
      setMessage('');
      setDateOfRemembrance('');
      setCollege('');
      setValidationError(null);
      setShowEditWarning(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass p-6 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Heart className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-white">
                    {tributeToEdit ? 'Edit Tribute' : 'Create Tribute'}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {showEditWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <p className="font-medium mb-1">Editing will clear signatures</p>
                    <p className="text-yellow-300/80">
                      This tribute has cosigner signatures. Editing it will clear all signatures and require re-approval.
                    </p>
                  </div>
                </motion.div>
              )}

              {validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-200">
                    <p className="font-medium">{validationError}</p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name of the person *
                  </label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => {
                      setPersonName(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Enter the name..."
                    maxLength={100}
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {personName.length}/100 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tribute message *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Share a memory, express your feelings, or write a message of remembrance..."
                    maxLength={600}
                    rows={5}
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {message.length}/600 characters (min. 10)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date of remembrance (optional)
                  </label>
                  <input
                    type="date"
                    value={dateOfRemembrance}
                    onChange={(e) => setDateOfRemembrance(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Specify a meaningful date to remember
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    College affiliation (optional)
                  </label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g., MIT, Stanford, Harvard..."
                    maxLength={100}
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Help others find tributes from their community
                  </p>
                </div>

                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-gray-300">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-white mb-1">🕊️ Consensus Required</p>
                      <p className="text-xs text-gray-300">
                        Your tribute will be created as a draft. It needs <strong>3 cosigner signatures</strong> from peers before it can be published. Once published, you'll earn <strong>+20 VOICE</strong> tokens.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!personName.trim() || !message.trim() || isSubmitting}
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </span>
                    ) : (
                      tributeToEdit ? 'Update Tribute' : 'Create Tribute'
                    )}
                  </motion.button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
