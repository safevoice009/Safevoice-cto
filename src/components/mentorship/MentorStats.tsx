import { Users, Star, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MentorProfile } from '../../lib/mentorship';

interface MentorStatsProps {
  mentors: MentorProfile[];
}

export default function MentorStats({ mentors }: MentorStatsProps) {
  const totalMentors = mentors.length;
  const activeMentors = mentors.filter((m) => m.isActive).length;
  const avgRating = mentors.length > 0
    ? mentors.reduce((sum, m) => sum + m.rating, 0) / mentors.length
    : 0;
  const totalSessions = mentors.reduce((sum, m) => sum + m.totalSessions, 0);

  const stats = [
    {
      label: 'Available Mentors',
      value: activeMentors,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Average Rating',
      value: avgRating.toFixed(1),
      icon: Star,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Total Sessions',
      value: totalSessions,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Total Mentors',
      value: totalMentors,
      icon: Award,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
          
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stat.value}
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
