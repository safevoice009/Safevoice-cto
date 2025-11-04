import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, SlidersHorizontal, Calendar, MessageCircle, Heart, Image as ImageIcon } from 'lucide-react';
import { useStore, type Post, type PostSearchFilters, type PostSortOption } from '../../lib/store';
import { formatTimeAgo } from '../../lib/utils';

interface CommunitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: Partial<PostSearchFilters> | undefined;
}

export default function CommunitySearchModal({ isOpen, onClose, initialFilters }: CommunitySearchModalProps) {
  const posts = useStore((state) => state.posts);
  const searchPosts = useStore((state) => state.searchPosts);

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [channel, setChannel] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasMedia, setHasMedia] = useState(false);
  const [minReactions, setMinReactions] = useState<number | undefined>(undefined);
  const [minComments, setMinComments] = useState<number | undefined>(undefined);
  const [authorType, setAuthorType] = useState<'any' | 'me' | 'mentor' | 'peer'>('any');
  const [sort, setSort] = useState<PostSortOption>('relevant');

  const [results, setResults] = useState<Post[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const filters: PostSearchFilters = {
      query: query.trim() || undefined,
      channel: channel && channel !== 'all' ? channel : null,
      startDate: startDate || null,
      endDate: endDate || null,
      hasMedia,
      minReactions,
      minComments,
      authorType,
      sort,
    };

    const filtered = searchPosts(filters);
    setResults(filtered);
  }, [query, channel, startDate, endDate, hasMedia, minReactions, minComments, authorType, sort, searchPosts, isOpen]);

  useEffect(() => {
    if (isOpen && initialFilters) {
      setQuery(initialFilters.query ?? '');
      setChannel(initialFilters.channel ?? null);
      setStartDate(initialFilters.startDate ?? '');
      setEndDate(initialFilters.endDate ?? '');
      setHasMedia(initialFilters.hasMedia ?? false);
      setMinReactions(initialFilters.minReactions);
      setMinComments(initialFilters.minComments);
      setAuthorType(initialFilters.authorType ?? 'any');
      setSort(initialFilters.sort ?? 'relevant');

      const shouldShowFilters = Boolean(
        initialFilters.channel ||
          initialFilters.startDate ||
          initialFilters.endDate ||
          initialFilters.hasMedia ||
          typeof initialFilters.minReactions === 'number' ||
          typeof initialFilters.minComments === 'number' ||
          (initialFilters.authorType && initialFilters.authorType !== 'any')
      );

      setShowFilters(shouldShowFilters);
    }
  }, [isOpen, initialFilters]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setChannel(null);
      setStartDate('');
      setEndDate('');
      setHasMedia(false);
      setMinReactions(undefined);
      setMinComments(undefined);
      setAuthorType('any');
      setSort('relevant');
      setShowFilters(false);
    }
  }, [isOpen]);

  const categories = Array.from(
    new Set(
      posts
        .filter((p) => p.category && p.category.trim().length > 0)
        .map((p) => p.category as string)
    )
  ).sort();

  const getTotalReactions = (post: Post): number =>
    Object.values(post.reactions).reduce((sum, count) => sum + count, 0);

  const truncateContent = (content: string, maxLength = 120): string => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    if (cleanContent.length <= maxLength) return cleanContent;
    return `${cleanContent.slice(0, maxLength)}...`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="glass relative mx-auto w-full max-w-3xl overflow-hidden"
          style={{ maxHeight: '90vh' }}
        >
          <header className="flex items-center justify-between gap-3 border-b border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white">Search Community</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close search"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>

          <div className="space-y-6 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 6rem)' }}>
            <div>
              <label htmlFor="search-query" className="sr-only">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  id="search-query"
                  name="search-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search posts by keywords or #hashtags..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                Filters
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="sort-select" className="text-xs text-gray-400">
                  Sort:
                </label>
                <select
                  id="sort-select"
                  name="sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as PostSortOption)}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="relevant">Relevant</option>
                  <option value="recent">Recent</option>
                  <option value="popular">Popular</option>
                </select>
              </div>
            </div>

            {showFilters && (
              <div className="space-y-4 rounded-xl border border-white/5 bg-white/5 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="channel-select" className="block text-xs font-medium text-gray-400">
                      Channel
                    </label>
                    <select
                      id="channel-select"
                      name="channel-select"
                      value={channel ?? 'all'}
                      onChange={(e) => setChannel(e.target.value === 'all' ? null : e.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All channels</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="author-select" className="block text-xs font-medium text-gray-400">
                      Author type
                    </label>
                    <select
                      id="author-select"
                      name="author-select"
                      value={authorType}
                      onChange={(e) => setAuthorType(e.target.value as 'any' | 'me' | 'mentor' | 'peer')}
                      className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="any">Any author</option>
                      <option value="me">My posts</option>
                      <option value="mentor">Highlighted (mentors)</option>
                      <option value="peer">Other peers</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="start-date" className="flex items-center gap-2 text-xs font-medium text-gray-400">
                      <Calendar className="h-3 w-3" aria-hidden />
                      From date
                    </label>
                    <input
                      id="start-date"
                      name="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="flex items-center gap-2 text-xs font-medium text-gray-400">
                      <Calendar className="h-3 w-3" aria-hidden />
                      To date
                    </label>
                    <input
                      id="end-date"
                      name="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="min-reactions" className="block text-xs font-medium text-gray-400">
                      Min. reactions
                    </label>
                    <input
                      id="min-reactions"
                      name="min-reactions"
                      type="number"
                      min="0"
                      value={minReactions ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                        setMinReactions(val);
                      }}
                      className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="min-comments" className="block text-xs font-medium text-gray-400">
                      Min. comments
                    </label>
                    <input
                      id="min-comments"
                      name="min-comments"
                      type="number"
                      min="0"
                      value={minComments ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                        setMinComments(val);
                      }}
                      className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="has-media" className="flex items-center gap-2 text-xs font-medium text-gray-400">
                      <ImageIcon className="h-3 w-3" aria-hidden />
                      Media posts
                    </label>
                    <div className="mt-2 flex h-10 items-center">
                      <input
                        id="has-media"
                        name="has-media"
                        type="checkbox"
                        checked={hasMedia}
                        onChange={(e) => setHasMedia(e.target.checked)}
                        className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-medium text-gray-300">
                Found {results.length} post{results.length === 1 ? '' : 's'}
              </p>
              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-6 text-center text-sm text-gray-400">
                  No matching posts. Try adjusting filters or query.
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '400px' }}>
                  {results.map((post) => {
                    const reactions = getTotalReactions(post);
                    const comments = post.commentCount ?? 0;
                    const contentPreview = post.isEncrypted
                      ? '[Encrypted post]'
                      : truncateContent(post.content);

                    return (
                      <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        onClick={onClose}
                        className="block rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{post.studentId}</p>
                              {post.category && (
                                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs text-primary">
                                  {post.category}
                                </span>
                              )}
                            </div>
                            <p className="line-clamp-3 text-sm text-gray-200">{contentPreview}</p>
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" aria-hidden />
                                {reactions}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" aria-hidden />
                                {comments}
                              </span>
                              {post.imageUrl && (
                                <span className="flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" aria-hidden />
                                  Image
                                </span>
                              )}
                              <span>{formatTimeAgo(post.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
