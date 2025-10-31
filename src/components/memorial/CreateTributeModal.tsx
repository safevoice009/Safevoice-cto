import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { useStore } from '../../lib/store';

interface CreateTributeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTributeModal({ isOpen, onClose }: CreateTributeModalProps) {
  const [personName, setPersonName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTribute = useStore((state) => state.createTribute);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!personName.trim() || !message.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const success = createTribute(personName, message);
      if (success) {
        setPersonName('');
        setMessage('');
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
              className="glass p-6 max-w-lg w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Heart className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-white">Create Tribute</h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name of the person
                  </label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
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
                    Tribute message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share a memory, express your feelings, or write a message of remembrance..."
                    maxLength={600}
                    rows={5}
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {message.length}/600 characters
                  </p>
                </div>

                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm text-gray-300">
                  <p className="font-medium text-white mb-1">🕊️ Earn +20 VOICE</p>
                  <p className="text-xs">
                    Creating a tribute honors their memory and earns you 20 VOICE tokens.
                  </p>
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
                      'Create Tribute'
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
