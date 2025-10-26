import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../lib/store';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import FloatingActionButton from '../components/feed/FloatingActionButton';
import PostSkeleton from '../components/feed/PostSkeleton';

const POSTS_PER_PAGE = 10;
const VIRTUALIZE_THRESHOLD = 30;

export default function Feed() {
  const posts = useStore((state) => state.posts);
  const loadPosts = useStore((state) => state.loadPosts);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedPostsCount, setDisplayedPostsCount] = useState(POSTS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const virtualContainerRef = useRef<HTMLDivElement>(null);
  const previousLengthRef = useRef(posts.length);

  useEffect(() => {
    loadPosts();
    setTimeout(() => setIsLoading(false), 300);
  }, [loadPosts]);

  useEffect(() => {
    if (posts.length > previousLengthRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    previousLengthRef.current = posts.length;
  }, [posts.length]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.createdAt - a.createdAt);
  }, [posts]);

  useEffect(() => {
    setDisplayedPostsCount((prev) => Math.min(Math.max(prev, POSTS_PER_PAGE), sortedPosts.length));
  }, [sortedPosts.length]);

  const displayedPosts = useMemo(() => {
    return sortedPosts.slice(0, displayedPostsCount);
  }, [sortedPosts, displayedPostsCount]);

  const hasMore = displayedPostsCount < sortedPosts.length;
  const shouldVirtualize = displayedPosts.length > VIRTUALIZE_THRESHOLD;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayedPostsCount((prev) => Math.min(prev + POSTS_PER_PAGE, sortedPosts.length));
    }
  }, [hasMore, sortedPosts.length]);

  useEffect(() => {
    if (shouldVirtualize) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, shouldVirtualize]);

  useEffect(() => {
    if (!shouldVirtualize) return;
    const container = virtualContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!hasMore) return;
      const threshold = container.scrollHeight - container.clientHeight - 200;
      if (container.scrollTop >= threshold) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loadMore, shouldVirtualize]);

  useEffect(() => {
    if (!shouldVirtualize) return;
    const container = virtualContainerRef.current;
    if (!container || !hasMore) return;
    if (container.scrollHeight <= container.clientHeight + 40) {
      loadMore();
    }
  }, [displayedPosts.length, hasMore, loadMore, shouldVirtualize]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? displayedPosts.length : 0,
    enabled: shouldVirtualize,
    getScrollElement: () => virtualContainerRef.current,
    estimateSize: () => 340,
    overscan: 8,
  });

  return (
    <div className="min-h-screen px-4 py-6 pb-24 md:pb-12">
      <div className="max-w-4xl mx-auto grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-bold mb-2">Anonymous Feed</h1>
            <p className="text-gray-400">Share your story safely and anonymously</p>
          </motion.div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <PostSkeleton key={`skeleton-${idx}`} />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {displayedPosts.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass p-12 text-center rounded-lg"
                >
                  <div className="text-6xl mb-4">📝</div>
                  <h2 className="text-2xl font-bold mb-2">No posts yet</h2>
                  <p className="text-gray-400">Be the first to share your story!</p>
                </motion.div>
              ) : shouldVirtualize ? (
                <div>
                  <div
                    ref={virtualContainerRef}
                    className="relative overflow-y-auto pr-1"
                    style={{ maxHeight: 'calc(100vh - 230px)' }}
                  >
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                      {virtualizer.getVirtualItems().map((virtualItem) => {
                        const post = displayedPosts[virtualItem.index];
                        if (!post) return null;
                        return (
                          <motion.div
                            key={post.id}
                            data-index={virtualItem.index}
                            ref={(el) => {
                              if (el) virtualizer.measureElement(el);
                            }}
                            className="absolute top-0 left-0 w-full"
                            style={{ transform: `translateY(${virtualItem.start}px)` }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="pb-4">
                              <PostCard post={post} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {hasMore ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 py-6 text-gray-400"
                    >
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      <span>Loading more stories...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-gray-500"
                    >
                      You've reached the end 🎉
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index < 10 ? index * 0.05 : 0 }}
                    >
                      <PostCard post={post} />
                    </motion.div>
                  ))}

                  {hasMore && (
                    <div ref={sentinelRef} className="py-8 flex justify-center">
                      <motion.div
                        className="flex items-center gap-2 text-gray-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        <span className="ml-2">Loading more stories...</span>
                      </motion.div>
                    </div>
                  )}

                  {!hasMore && displayedPosts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-gray-500"
                    >
                      You've reached the end 🎉
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
          )}
        </div>

        <aside className="hidden lg:block space-y-4">
          <div className="glass rounded-xl p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-3">Stay Safe</h2>
            <p className="text-sm text-gray-400">
              Remember to reach out for help if you or someone you know is in immediate danger. These
              helplines are available 24/7.
            </p>
          </div>
        </aside>
      </div>

      <FloatingActionButton onClick={() => setIsModalOpen(true)} />
      <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
