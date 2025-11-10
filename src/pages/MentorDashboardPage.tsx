import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import type { MentorshipTopic } from '../lib/mentorship';
import MentorCard from '../components/mentorship/MentorCard';
import MentorFilters from '../components/mentorship/MentorFilters';
import MentorStats from '../components/mentorship/MentorStats';
import OnboardingBanner from '../components/mentorship/OnboardingBanner';

export default function MentorDashboardPage() {
  const mentorProfiles = useStore((state) => state.mentorProfiles);
  const getFilteredMentors = useStore((state) => state.getFilteredMentors);
  const loadMentorshipData = useStore((state) => state.loadMentorshipData);

  const [filters, setFilters] = useState<{
    topics: MentorshipTopic[];
    college: string;
    minRating: number;
    availability: string[];
  }>({
    topics: [],
    college: '',
    minRating: 0,
    availability: [],
  });

  useEffect(() => {
    loadMentorshipData();
  }, [loadMentorshipData]);

  const filteredMentors = useMemo(() => {
    return getFilteredMentors(filters);
  }, [getFilteredMentors, filters]);

  const handleFilterChange = (
    newFilters: {
      topics: MentorshipTopic[];
      college: string;
      minRating: number;
      availability: string[];
    }
  ) => {
    setFilters(newFilters);
  };

  const hasActiveFilters =
    filters.topics.length > 0 ||
    filters.college !== '' ||
    filters.minRating > 0 ||
    filters.availability.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Mentor Discovery
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Connect with peer mentors who understand your journey and can provide support.
        </p>
      </motion.div>

      <OnboardingBanner />

      <MentorStats mentors={mentorProfiles} />

      <MentorFilters onFilterChange={handleFilterChange} />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {hasActiveFilters ? 'Filtered Mentors' : 'All Mentors'} ({filteredMentors.length})
        </h2>
      </div>

      {filteredMentors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center"
        >
          <AlertCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No mentors found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more mentors.'
              : 'There are no mentors available at the moment. Please check back later.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() =>
                setFilters({
                  topics: [],
                  college: '',
                  minRating: 0,
                  availability: [],
                })
              }
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor, index) => (
            <motion.div
              key={mentor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <MentorCard
                mentor={mentor}
                onClick={() => {
                  // Future: Open mentor detail modal
                  console.log('Selected mentor:', mentor);
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
