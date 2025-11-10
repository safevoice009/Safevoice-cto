import { motion } from 'framer-motion';
import { Star, Calendar, Award, Users } from 'lucide-react';
import type { MentorProfile } from '../../lib/mentorship';

interface MentorCardProps {
  mentor: MentorProfile;
  onClick?: () => void;
}

export default function MentorCard({ mentor, onClick }: MentorCardProps) {
  const topicsToShow = mentor.topics.slice(0, 3);
  const remainingTopics = mentor.topics.length - topicsToShow.length;

  const formatTopic = (topic: string) => {
    return topic
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const availableDays = Object.keys(mentor.availability).filter(
    (day) => mentor.availability[day]?.length > 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)' }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {mentor.displayName || 'Anonymous Mentor'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{mentor.college}</p>
        </div>
        
        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {mentor.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {mentor.bio && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
          {mentor.bio}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {topicsToShow.map((topic) => (
          <span
            key={topic}
            className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full"
          >
            {formatTopic(topic)}
          </span>
        ))}
        {remainingTopics > 0 && (
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
            +{remainingTopics} more
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{availableDays.length} days</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>
            {mentor.currentMentees.length}/{mentor.maxMentees} mentees
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Award className="w-4 h-4" />
          <span>{mentor.totalSessions} sessions</span>
        </div>
      </div>
    </motion.div>
  );
}
