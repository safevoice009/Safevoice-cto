import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import CreatePost from '../components/feed/CreatePost';
import PostCard from '../components/feed/PostCard';

export default function Feed() {
  const { posts, initializeStore } = useStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <motion.section
      className="min-h-screen px-4 py-8 max-w-3xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-6">
        <CreatePost />

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
      </div>
    </motion.section>
  );
}
