import { motion } from 'framer-motion';
import { Star, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import type { MentorProfile, MatchExplanation } from '../../lib/mentorship';

interface MatchInsightPanelProps {
  mentor: MentorProfile;
  explanation: MatchExplanation;
  onBookClick?: () => void;
}

export default function MatchInsightPanel({ mentor, explanation, onBookClick }: MatchInsightPanelProps) {
  const scorePercentage = Math.round(explanation.totalScore);
  const scoreColor =
    scorePercentage >= 80 ? 'text-green-600' : scorePercentage >= 60 ? 'text-yellow-600' : 'text-orange-600';
  const scoreBgColor =
    scorePercentage >= 80 ? 'bg-green-50' : scorePercentage >= 60 ? 'bg-yellow-50' : 'bg-orange-50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border border-gray-200 p-6 ${scoreBgColor}`}
    >
      {/* Header with Score */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-xl font-bold text-gray-900">{mentor.displayName || `Mentor ${mentor.id.slice(0, 8)}`}</h3>
          <p className="text-sm text-gray-600">{mentor.college}</p>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold ${scoreColor}`}>{scorePercentage}</div>
          <div className="text-xs font-medium text-gray-600">Match Score</div>
        </div>
      </div>

      {/* Mentor Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white px-3 py-2 text-center">
          <div className="text-xs text-gray-600">Rating</div>
          <div className="flex items-center justify-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="font-bold">{mentor.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-center">
          <div className="text-xs text-gray-600">Karma</div>
          <div className="font-bold">{mentor.karma}</div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-center">
          <div className="text-xs text-gray-600">Streak</div>
          <div className="font-bold">{mentor.streak}w</div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-center">
          <div className="text-xs text-gray-600">Capacity</div>
          <div className="font-bold">
            {mentor.maxMentees - mentor.currentMentees.length}/{mentor.maxMentees}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mb-6 space-y-3 rounded-lg bg-white p-4">
        <div className="mb-3 font-semibold text-gray-900">Score Breakdown</div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Topic Overlap</span>
            <span className="font-bold text-gray-900">{explanation.topicOverlapScore.toFixed(1)}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-full bg-blue-500 rounded"
              style={{ width: `${Math.min(explanation.topicOverlapScore, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{explanation.topicOverlapReason}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">College Similarity</span>
            <span className="font-bold text-gray-900">{explanation.collegeScore.toFixed(1)}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-full bg-purple-500 rounded"
              style={{ width: `${Math.min(explanation.collegeScore, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{explanation.collegeReason}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Availability Match</span>
            <span className="font-bold text-gray-900">{explanation.availabilityScore.toFixed(1)}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-full bg-green-500 rounded"
              style={{ width: `${Math.min(explanation.availabilityScore, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{explanation.availabilityReason}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Reputation</span>
            <span className="font-bold text-gray-900">{explanation.reputationScore.toFixed(1)}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-full bg-orange-500 rounded"
              style={{ width: `${Math.min(explanation.reputationScore, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{explanation.reputationReason}</p>
        </div>
      </div>

      {/* Strengths */}
      {explanation.strengths.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-gray-900">Strengths</span>
          </div>
          <ul className="space-y-1">
            {explanation.strengths.map((strength, idx) => (
              <li key={idx} className="text-sm text-gray-700 ml-6">
                • {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Considerations */}
      {explanation.considerations.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="font-semibold text-gray-900">Considerations</span>
          </div>
          <ul className="space-y-1">
            {explanation.considerations.map((consideration, idx) => (
              <li key={idx} className="text-sm text-gray-700 ml-6">
                • {consideration}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bio */}
      {mentor.bio && (
        <div className="mb-4 rounded-lg bg-white p-3">
          <div className="mb-1 text-xs font-semibold text-gray-600">Bio</div>
          <p className="text-sm text-gray-700">{mentor.bio}</p>
        </div>
      )}

      {/* Action Button */}
      {onBookClick && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBookClick}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Zap className="h-4 w-4" />
          Book Session
        </motion.button>
      )}
    </motion.div>
  );
}
