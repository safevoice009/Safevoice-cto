import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, type PostSearchFilters } from '../lib/store';
import CreatePost from '../components/feed/CreatePost';
import PostCard from '../components/feed/PostCard';
import ModeratorPanel from '../components/feed/ModeratorPanel';
import CommunityDiscoveryPanel from '../components/community/CommunityDiscoveryPanel';
import CommunitySearchModal from '../components/community/CommunitySearchModal';
import CommunityEvents from '../components/community/CommunityEvents';
import CommunityModerationPanel from '../components/community/CommunityModerationPanel';
import AnnouncementBanner from '../components/community/AnnouncementBanner';
import ChannelMuteBanner from '../components/community/ChannelMuteBanner';
import ModerationLogDisplay from '../components/community/ModerationLogDisplay';

export default function Feed() {
  const { posts, isModerator, initializeStore } = useStore();
  const [showSearch, setShowSearch] = useState(false);
  const [initialSearchFilters, setInitialSearchFilters] = useState<Partial<PostSearchFilters> | undefined>();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const sortedPosts = [...posts].sort((a, b) => {
    // Prioritize community pinned posts first
    if (a.isCommunityPinned && !b.isCommunityPinned) return -1;
    if (!a.isCommunityPinned && b.isCommunityPinned) return 1;
    
    // Then personal pinned posts
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // Finally by creation date
    return b.createdAt - a.createdAt;
  });

  const handleRequestSearch = (filters?: Partial<PostSearchFilters>) => {
    setInitialSearchFilters(filters);
    setShowSearch(true);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setInitialSearchFilters(undefined);
  };

  return (
    <div className="relative min-h-screen px-4 py-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr,400px]">
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CreatePost />

          {/* Community Banners */}
          <AnnouncementBanner />
          <ChannelMuteBanner />

          {isModerator && <ModeratorPanel />}
          {isModerator && <CommunityModerationPanel className="mb-6" />}

          {sortedPosts.length === 0 ? (
            <div className="glass p-10 text-center space-y-4">
              <p className="text-xl font-semibold text-white">No posts yet</p>
              <p className="text-gray-400">
                Be the first to share your story and inspire others!
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {sortedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </AnimatePresence>
          )}
        </motion.section>

        <aside className="hidden space-y-6 lg:block">
          <CommunityDiscoveryPanel onRequestSearch={handleRequestSearch} />
          <CommunityEvents />
          <ModerationLogDisplay className="mt-6" />
        </aside>
      </div>

      <div className="mt-8 space-y-6 lg:hidden">
        <CommunityDiscoveryPanel onRequestSearch={handleRequestSearch} />
        <CommunityEvents />
      </div>

      <CommunitySearchModal isOpen={showSearch} onClose={handleCloseSearch} initialFilters={initialSearchFilters} />
    </div>
  );
}
