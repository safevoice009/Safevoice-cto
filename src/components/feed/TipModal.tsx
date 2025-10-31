import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign } from 'lucide-react';
import { useStore } from '../../lib/store';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  postId: string;
}

export default function TipModal({ isOpen, onClose, userId, postId }: TipModalProps) {
  const [tipAmount, setTipAmount] = useState(10);
  const { tipUser, voiceBalance, sendAnonymousGift } = useStore();

  const handleTip = () => {
    const success = tipUser(userId, postId, tipAmount);
    if (success) {
      onClose();
      setTipAmount(10); // Reset to default
    }
  };

  const handleGift = () => {
    const success = sendAnonymousGift(userId, 10);
    if (success) {
      onClose();
      setTipAmount(10);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTipAmount(Number(e.target.value));
  };

  const insufficientBalance = voiceBalance < tipAmount;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="glass p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <DollarSign className="w-6 h-6 text-primary" />
                  <span>Send a Tip 💰</span>
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  type="button"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  Show appreciation for this post by sending a tip to{' '}
                  <span className="text-primary font-semibold">{userId}</span>
                </p>

                {/* Tip Amount Display */}
                <div className="text-center py-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
                  <p className="text-5xl font-bold text-white">{tipAmount}</p>
                  <p className="text-gray-400 mt-2">VOICE</p>
                </div>

                {/* Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>1 VOICE</span>
                    <span>100 VOICE</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={tipAmount}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${tipAmount}%, rgb(30, 41, 59) ${tipAmount}%, rgb(30, 41, 59) 100%)`,
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setTipAmount(Math.max(1, tipAmount - 5))}
                      className="px-3 py-1 bg-surface hover:bg-surface/80 rounded-lg text-sm text-gray-300 transition-colors"
                    >
                      -5
                    </button>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setTipAmount(5)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          tipAmount === 5
                            ? 'bg-primary text-white'
                            : 'bg-surface hover:bg-surface/80 text-gray-300'
                        }`}
                      >
                        5
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipAmount(10)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          tipAmount === 10
                            ? 'bg-primary text-white'
                            : 'bg-surface hover:bg-surface/80 text-gray-300'
                        }`}
                      >
                        10
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipAmount(25)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          tipAmount === 25
                            ? 'bg-primary text-white'
                            : 'bg-surface hover:bg-surface/80 text-gray-300'
                        }`}
                      >
                        25
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipAmount(50)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          tipAmount === 50
                            ? 'bg-primary text-white'
                            : 'bg-surface hover:bg-surface/80 text-gray-300'
                        }`}
                      >
                        50
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTipAmount(Math.min(100, tipAmount + 5))}
                      className="px-3 py-1 bg-surface hover:bg-surface/80 rounded-lg text-sm text-gray-300 transition-colors"
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* Balance Info */}
                <div className="flex items-center justify-between text-sm p-3 bg-surface/50 rounded-lg">
                  <span className="text-gray-400">Your Balance:</span>
                  <span className={`font-semibold ${insufficientBalance ? 'text-red-400' : 'text-primary'}`}>
                    {voiceBalance.toFixed(1)} VOICE
                  </span>
                </div>

                {insufficientBalance && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-sm text-red-300">Insufficient balance to send this tip</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-surface hover:bg-surface/80 text-gray-300 rounded-lg font-semibold transition-colors"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTip}
                    disabled={insufficientBalance}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    type="button"
                  >
                    Send Tip
                  </button>
                </div>
                <button
                  onClick={handleGift}
                  disabled={voiceBalance < 10}
                  className="w-full px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-semibold hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center space-x-2"
                  type="button"
                >
                  <span>🎁</span>
                  <span>Send Anonymous Gift (10 VOICE)</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
