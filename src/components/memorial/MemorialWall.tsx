import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Plus, Heart, Search, Filter, Grid3x3, List, X, Info } from 'lucide-react';
import { useStore } from '../../lib/store';
import TributeCard from './TributeCard';
import CreateTributeModal from './CreateTributeModal';

type ViewMode = 'grid' | 'timeline';

const SESSION_STORAGE_KEY = 'safevoice_memorial_wall_visited';

export default function MemorialWall() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  
  const memorialTributes = useStore((state) => state.memorialTributes);
  const loadMemorialData = useStore((state) => state.loadMemorialData);

  useEffect(() => {
    loadMemorialData();
  }, [loadMemorialData]);

  useEffect(() => {
    const visited = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!visited) {
      setShowWelcomeMessage(true);
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    }
  }, []);

  const availableColleges = useMemo(() => {
    const colleges = new Set<string>();
    memorialTributes.forEach(tribute => {
      if (tribute.college) {
        colleges.add(tribute.college);
      }
    });
    return Array.from(colleges).sort();
  }, [memorialTributes]);

  const filteredTributes = useMemo(() => {
    return memorialTributes.filter(tribute => {
      const matchesSearch = searchQuery === '' || 
        tribute.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tribute.message.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCollege = collegeFilter === '' || tribute.college === collegeFilter;
      
      return matchesSearch && matchesCollege;
    });
  }, [memorialTributes, searchQuery, collegeFilter]);

  const sortedTributes = useMemo(() => {
    return [...filteredTributes].sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredTributes]);

  const handleCosignClick = (tributeId: string) => {
    console.log('Cosign tribute:', tributeId);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCollegeFilter('');
  };

  const hasActiveFilters = searchQuery !== '' || collegeFilter !== '';

  return (
    <motion.section
      className="min-h-screen px-4 py-8 max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-6">
        <motion.div
          className="glass p-8 text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-center">
            <Flame className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">Memorial Wall</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            A sacred space to honor and remember loved ones. Share tributes, light candles, and keep their memories alive.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:shadow-glow transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Create Tribute</span>
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {showWelcomeMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass p-6"
            >
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Welcome to the Memorial Wall
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">
                    This is a privacy-safe space where you can honor loved ones with peer-verified tributes. Each tribute requires <strong>3 cosigner signatures</strong> from the community before publication, ensuring authenticity and respect.
                  </p>
                  <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside mb-3">
                    <li>Create tributes with optional dates and college affiliations</li>
                    <li>Light candles to show support (+2 VOICE per candle)</li>
                    <li>Cosign tributes to help reach consensus</li>
                    <li>Track audit trails for transparency</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowWelcomeMessage(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
                title="Timeline view"
              >
                <List className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-white/20 mx-2" />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
                {hasActiveFilters && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    Active
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or message..."
                  className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-white/10 pt-4 space-y-3"
              >
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      College
                    </label>
                    <select
                      value={collegeFilter}
                      onChange={(e) => setCollegeFilter(e.target.value)}
                      className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="">All colleges</option>
                      {availableColleges.map((college) => (
                        <option key={college} value={college}>
                          {college}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Clear all filters
                    </button>
                    <span className="text-sm text-gray-400">
                      ({filteredTributes.length} result{filteredTributes.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {sortedTributes.length === 0 ? (
          <motion.div
            className="glass p-10 text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Heart className="w-16 h-16 text-gray-600 mx-auto" />
            <p className="text-xl font-semibold text-white">
              {hasActiveFilters ? 'No tributes match your filters' : 'No tributes yet'}
            </p>
            <p className="text-gray-400">
              {hasActiveFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Be the first to create a tribute and honor someone special.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-6'}>
            <AnimatePresence mode="popLayout">
              {sortedTributes.map((tribute, index) => (
                <motion.div
                  key={tribute.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: viewMode === 'timeline' ? index * 0.05 : 0 }}
                >
                  {viewMode === 'timeline' && index > 0 && (
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-xs text-gray-500">
                        {new Date(tribute.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                  )}
                  <TributeCard tribute={tribute} onCosignClick={handleCosignClick} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreateTributeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </motion.section>
  );
}
