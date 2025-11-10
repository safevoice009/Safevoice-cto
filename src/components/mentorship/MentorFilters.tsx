import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MENTORSHIP_TOPICS, type MentorshipTopic, DAYS_OF_WEEK } from '../../lib/mentorship';

interface MentorFiltersProps {
  onFilterChange: (filters: {
    topics: MentorshipTopic[];
    college: string;
    minRating: number;
    availability: string[];
  }) => void;
}

export default function MentorFilters({ onFilterChange }: MentorFiltersProps) {
  const [selectedTopics, setSelectedTopics] = useState<MentorshipTopic[]>([]);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const formatTopic = (topic: string) => {
    return topic
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const handleTopicToggle = (topic: MentorshipTopic) => {
    const newTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter((t) => t !== topic)
      : [...selectedTopics, topic];
    
    setSelectedTopics(newTopics);
    onFilterChange({
      topics: newTopics,
      college: collegeSearch,
      minRating,
      availability: selectedDays,
    });
  };

  const handleDayToggle = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    
    setSelectedDays(newDays);
    onFilterChange({
      topics: selectedTopics,
      college: collegeSearch,
      minRating,
      availability: newDays,
    });
  };

  const handleCollegeChange = (value: string) => {
    setCollegeSearch(value);
    onFilterChange({
      topics: selectedTopics,
      college: value,
      minRating,
      availability: selectedDays,
    });
  };

  const handleRatingChange = (value: number) => {
    setMinRating(value);
    onFilterChange({
      topics: selectedTopics,
      college: collegeSearch,
      minRating: value,
      availability: selectedDays,
    });
  };

  const clearAllFilters = () => {
    setSelectedTopics([]);
    setCollegeSearch('');
    setMinRating(0);
    setSelectedDays([]);
    onFilterChange({
      topics: [],
      college: '',
      minRating: 0,
      availability: [],
    });
  };

  const activeFilterCount =
    selectedTopics.length +
    (collegeSearch ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    selectedDays.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filter Mentors
          </h2>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Clear all filters"
            >
              <X className="w-4 h-4" />
              Clear all
            </button>
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors lg:hidden"
            aria-expanded={showFilters}
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          >
            {showFilters ? 'Hide' : 'Show'} filters
          </button>
        </div>
      </div>

      <AnimatePresence>
        <motion.div
          initial={false}
          animate={{ height: showFilters || window.innerWidth >= 1024 ? 'auto' : 0 }}
          className="overflow-hidden lg:!h-auto"
        >
          <div className="space-y-6">
            <div>
              <label htmlFor="college-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                College
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="college-search"
                  type="text"
                  value={collegeSearch}
                  onChange={(e) => handleCollegeChange(e.target.value)}
                  placeholder="Search by college name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  aria-label="Search mentors by college"
                />
              </div>
            </div>

            <div>
              <label htmlFor="min-rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Rating: {minRating > 0 ? `${minRating}.0+` : 'Any'}
              </label>
              <input
                id="min-rating"
                type="range"
                min="0"
                max="5"
                step="1"
                value={minRating}
                onChange={(e) => handleRatingChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                aria-label="Minimum rating filter"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Any</span>
                <span>5.0+</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topics ({selectedTopics.length} selected)
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {MENTORSHIP_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleTopicToggle(topic)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedTopics.includes(topic)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-pressed={selectedTopics.includes(topic)}
                    aria-label={`Filter by ${formatTopic(topic)}`}
                  >
                    {formatTopic(topic)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Availability ({selectedDays.length} days selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedDays.includes(day)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-pressed={selectedDays.includes(day)}
                    aria-label={`Filter by ${formatDay(day)}`}
                  >
                    {formatDay(day)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
