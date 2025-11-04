import { Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterOptions {
  locations: string[];
  sizeBrackets: { label: string; min: number; max: number }[];
}

interface ActiveFilters {
  locations: string[];
  sizeBracket: string | null;
}

interface CommunityFilterBarProps {
  filters: ActiveFilters;
  availableFilters: FilterOptions;
  onFilterChange: (filters: ActiveFilters) => void;
}

export default function CommunityFilterBar({
  filters,
  availableFilters,
  onFilterChange,
}: CommunityFilterBarProps) {
  const hasActiveFilters = filters.locations.length > 0 || filters.sizeBracket !== null;

  const toggleLocation = (location: string) => {
    const newLocations = filters.locations.includes(location)
      ? filters.locations.filter((l) => l !== location)
      : [...filters.locations, location];
    
    onFilterChange({ ...filters, locations: newLocations });
  };

  const setSizeBracket = (bracket: string | null) => {
    onFilterChange({ ...filters, sizeBracket: bracket });
  };

  const clearAllFilters = () => {
    onFilterChange({ locations: [], sizeBracket: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" aria-hidden />
          <span className="text-sm font-semibold text-white">Filters</span>
        </div>
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-gray-400 hover:text-primary transition-colors"
          >
            Clear all
          </motion.button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Location
          </p>
          <div className="flex flex-wrap gap-2">
            {availableFilters.locations.map((location) => {
              const isActive = filters.locations.includes(location);
              return (
                <button
                  key={location}
                  type="button"
                  onClick={() => toggleLocation(location)}
                  className={`
                    rounded-full px-3 py-1.5 text-xs font-medium transition-all
                    ${
                      isActive
                        ? 'bg-primary text-black shadow-lg'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }
                  `}
                >
                  {location}
                  {isActive && <X className="ml-1 inline-block h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Community Size
          </p>
          <div className="flex flex-wrap gap-2">
            {availableFilters.sizeBrackets.map((bracket) => {
              const isActive = filters.sizeBracket === bracket.label;
              return (
                <button
                  key={bracket.label}
                  type="button"
                  onClick={() => setSizeBracket(isActive ? null : bracket.label)}
                  className={`
                    rounded-full px-3 py-1.5 text-xs font-medium transition-all
                    ${
                      isActive
                        ? 'bg-primary text-black shadow-lg'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }
                  `}
                >
                  {bracket.label}
                  {isActive && <X className="ml-1 inline-block h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 pt-2 border-t border-white/5"
          >
            <span className="text-xs text-gray-400">Active:</span>
            {filters.locations.map((location) => (
              <span
                key={location}
                className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary"
              >
                {location}
                <button
                  type="button"
                  onClick={() => toggleLocation(location)}
                  className="hover:text-white transition-colors"
                  aria-label={`Remove ${location} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {filters.sizeBracket && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                {filters.sizeBracket}
                <button
                  type="button"
                  onClick={() => setSizeBracket(null)}
                  className="hover:text-white transition-colors"
                  aria-label={`Remove ${filters.sizeBracket} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
