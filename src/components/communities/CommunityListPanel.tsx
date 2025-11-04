import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import CommunityCard from './CommunityCard';
import CommunityFilterBar from './CommunityFilterBar';
import CommunitySortMenu, { type CommunitySortOption } from './CommunitySortMenu';

const SIZE_BRACKETS = [
  { label: 'Small (<500)', min: 0, max: 500 },
  { label: 'Medium (500-2K)', min: 500, max: 2000 },
  { label: 'Large (2K-5K)', min: 2000, max: 5000 },
  { label: 'Very Large (5K+)', min: 5000, max: Infinity },
];

interface CommunityListPanelProps {
  isLoading?: boolean;
}

export default function CommunityListPanel({ isLoading = false }: CommunityListPanelProps) {
  const {
    communities,
    communityMemberships,
    posts,
    studentId,
    joinCommunity,
    leaveCommunity,
    setCurrentCommunity,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<CommunitySortOption>('active');
  const [filters, setFilters] = useState<{
    locations: string[];
    sizeBracket: string | null;
  }>({
    locations: [],
    sizeBracket: null,
  });
  const [processingCommunity, setProcessingCommunity] = useState<string | null>(null);

  const availableStates = useMemo(() => {
    const states = new Set(communities.map((c) => c.state));
    return Array.from(states).sort();
  }, [communities]);

  const showSkeleton = isLoading && communities.length === 0;

  const getRecentPostsForCommunity = (communityId: string) => {
    return posts
      .filter((post) => post.communityId === communityId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3);
  };

  const getUnreadCountForCommunity = (communityId: string) => {
    const membership = communityMemberships.find(
      (m) => m.communityId === communityId && m.studentId === studentId && m.isActive
    );
    return membership?.unreadCount ?? 0;
  };

  const getMembershipForCommunity = (communityId: string) => {
    return (
      communityMemberships.find((m) => m.communityId === communityId && m.studentId === studentId) ?? null
    );
  };

  const filteredAndSortedCommunities = useMemo(() => {
    let filtered = [...communities];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (community) =>
          community.name.toLowerCase().includes(query) ||
          community.city.toLowerCase().includes(query) ||
          community.state.toLowerCase().includes(query) ||
          community.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (filters.locations.length > 0) {
      filtered = filtered.filter((community) => filters.locations.includes(community.state));
    }

    if (filters.sizeBracket) {
      const bracket = SIZE_BRACKETS.find((option) => option.label === filters.sizeBracket);
      if (bracket) {
        filtered = filtered.filter(
          (community) => community.memberCount >= bracket.min && community.memberCount < bracket.max
        );
      }
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'active':
          return b.lastActivityAt - a.lastActivityAt;
        case 'new':
          return b.createdAt - a.createdAt;
        case 'members':
          return b.memberCount - a.memberCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [communities, searchQuery, filters, sortBy]);

  const handleJoinCommunity = (communityId: string) => {
    setProcessingCommunity(communityId);
    joinCommunity(communityId);
    window.setTimeout(() => setProcessingCommunity(null), 600);
  };

  const handleLeaveCommunity = (communityId: string) => {
    setProcessingCommunity(communityId);
    leaveCommunity(communityId);
    window.setTimeout(() => setProcessingCommunity(null), 600);
  };

  const handleSelectCommunity = (communityId: string) => {
    setCurrentCommunity(communityId);
  };

  if (showSkeleton) {
    const skeletonCards = Array.from({ length: 6 });

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-primary/10 via-slate-900/70 to-slate-900/40 p-6 shadow-lg">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
              <div className="h-6 w-48 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-64 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="h-11 rounded-lg bg-white/10 animate-pulse" />
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="h-24 flex-1 rounded-2xl bg-white/10 animate-pulse" />
              <div className="h-10 w-44 rounded-lg bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {skeletonCards.map((_, index) => (
            <div
              key={`community-skeleton-${index}`}
              className="rounded-2xl border border-white/5 bg-white/5 p-5"
            >
              <div className="space-y-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 rounded bg-white/10" />
                    <div className="h-3 w-28 rounded bg-white/10" />
                  </div>
                </div>
                <div className="h-12 rounded-lg bg-white/10" />
                <div className="h-5 w-full rounded bg-white/10" />
                <div className="h-10 rounded-lg bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-primary/10 via-slate-900/70 to-slate-900/40 p-6 shadow-lg">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/70">Discover</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Community Directory</h2>
            <p className="mt-2 text-sm text-gray-300">
              Find and join college communities to connect with peers across campus.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="text"
              placeholder="Search communities, locations, or tags..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-gray-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <CommunityFilterBar
                filters={filters}
                availableFilters={{
                  locations: availableStates,
                  sizeBrackets: SIZE_BRACKETS,
                }}
                onFilterChange={setFilters}
              />
            </div>
            <div className="flex-shrink-0">
              <CommunitySortMenu value={sortBy} onChange={setSortBy} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {filteredAndSortedCommunities.length} of {communities.length} communities
          </p>
        </div>

        {filteredAndSortedCommunities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">No communities found</h3>
            <p className="text-sm text-gray-400">
              Try adjusting your search or filters to find more communities.
            </p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredAndSortedCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  membership={getMembershipForCommunity(community.id)}
                  unreadCount={getUnreadCountForCommunity(community.id)}
                  recentPosts={getRecentPostsForCommunity(community.id)}
                  onJoin={handleJoinCommunity}
                  onLeave={handleLeaveCommunity}
                  onSelect={handleSelectCommunity}
                  isProcessing={processingCommunity === community.id}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
