import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { useStore } from '../../lib/store';

interface MentorReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  mentorId: string;
  mentorName?: string;
}

export default function MentorReviewModal({
  isOpen,
  onClose,
  matchId,
  mentorId,
  mentorName = 'Mentor',
}: MentorReviewModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const { studentId, submitMentorReview } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      return;
    }

    submitMentorReview(matchId, mentorId, studentId, rating, feedback || undefined);
    setSubmitted(true);
    
    setTimeout(() => {
      setRating(0);
      setFeedback('');
      setSubmitted(false);
      onClose();
    }, 1500);
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
          role="dialog"
          aria-labelledby="mentor-review-title"
          aria-modal="true"
        >
          <div className="flex items-center justify-between">
            <h2 id="mentor-review-title" className="text-xl font-bold text-white">
              Review {mentorName}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close review modal"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-3 py-4"
            >
              <div className="text-4xl">✨</div>
              <p className="text-white font-medium">Thank you for your feedback!</p>
              <p className="text-sm text-gray-400">Your review helps us match better mentors.</p>
            </motion.div>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                How was your mentoring experience? Your honest feedback helps us improve.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star Rating */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Rating
                  </label>
                  <div className="flex gap-2" role="group" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded-lg p-1"
                        aria-label={`${star} stars`}
                        aria-pressed={rating === star}
                      >
                        <Star
                          className="w-8 h-8 transition-colors"
                          fill={
                            star <= (hoveredRating || rating)
                              ? '#fbbf24'
                              : 'none'
                          }
                          color={
                            star <= (hoveredRating || rating)
                              ? '#fbbf24'
                              : '#6b7280'
                          }
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-xs text-primary font-medium">
                      {rating === 5 && 'Excellent!'}
                      {rating === 4 && 'Good'}
                      {rating === 3 && 'Average'}
                      {rating === 2 && 'Fair'}
                      {rating === 1 && 'Poor'}
                    </p>
                  )}
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <label htmlFor="feedback" className="block text-sm font-medium text-gray-300">
                    Comments (Optional)
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Share what you liked or what could be improved..."
                    maxLength={500}
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary transition-colors"
                    rows={3}
                  />
                  <div className="text-xs text-gray-400 text-right">
                    {feedback.length}/500
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rating === 0}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
