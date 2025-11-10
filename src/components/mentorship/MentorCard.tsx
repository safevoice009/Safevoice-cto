import { useState } from 'react';
import { Star, MessageSquare, Zap } from 'lucide-react';
import { useStore } from '../../lib/store';
import type { MentorProfile } from '../../lib/mentorship';
import MentorReviewModal from './MentorReviewModal';

interface MentorCardProps {
  mentor: MentorProfile;
  matchId?: string;
  isMatchCompleted?: boolean;
  onReviewClick?: () => void;
}

export default function MentorCard({
  mentor,
  matchId,
  isMatchCompleted = false,
  onReviewClick,
}: MentorCardProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const getMentorReviewSummary = useStore((state) => state.getMentorReviewSummary);
  
  const reviewSummary = getMentorReviewSummary(mentor.id);
  const averageRating = reviewSummary.averageRating || mentor.rating;
  const latestReview = reviewSummary.recentReviews[0];

  const handleReviewClick = () => {
    setIsReviewModalOpen(true);
    onReviewClick?.();
  };

  return (
    <>
      <div className="glass rounded-lg p-4 space-y-3 border border-white/10 hover:border-white/20 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-white">
              {mentor.displayName || 'Mentor'}
            </h3>
            <p className="text-xs text-gray-400">{mentor.college}</p>
          </div>
          {/* Rating */}
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
            <Star className="w-3 h-3 fill-primary text-primary" />
            <span className="text-sm font-medium text-white">
              {averageRating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Bio */}
        {mentor.bio && (
          <p className="text-xs text-gray-300 line-clamp-2">{mentor.bio}</p>
        )}

        {/* Topics */}
        <div className="flex flex-wrap gap-1">
          {mentor.topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="inline-block px-2 py-0.5 bg-primary/20 text-primary rounded text-xs"
            >
              {topic.replace(/_/g, ' ')}
            </span>
          ))}
          {mentor.topics.length > 3 && (
            <span className="inline-block px-2 py-0.5 bg-white/10 text-gray-300 rounded text-xs">
              +{mentor.topics.length - 3} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1 text-gray-300">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>Karma: {mentor.karma}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-300">
            <MessageSquare className="w-3 h-3 text-blue-400" />
            <span>{reviewSummary.totalReviews} reviews</span>
          </div>
        </div>

        {/* Latest Review */}
        {latestReview && (
          <div className="p-2 bg-white/5 rounded border border-white/5 space-y-1">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-3 h-3"
                  fill={i < latestReview.rating ? '#fbbf24' : 'none'}
                  color={i < latestReview.rating ? '#fbbf24' : '#6b7280'}
                />
              ))}
            </div>
            {latestReview.feedback && (
              <p className="text-xs text-gray-300 line-clamp-2">
                "{latestReview.feedback}"
              </p>
            )}
          </div>
        )}

        {/* Review Button */}
        {isMatchCompleted && matchId && (
          <button
            onClick={handleReviewClick}
            className="w-full mt-2 px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors text-sm font-medium"
          >
            Leave Review
          </button>
        )}
      </div>

      {matchId && (
        <MentorReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          matchId={matchId}
          mentorId={mentor.id}
          mentorName={mentor.displayName || 'Mentor'}
        />
      )}
    </>
  );
}
