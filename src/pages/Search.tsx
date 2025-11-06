import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon,
  X,
  MessageCircle,
  Heart,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { search, type SearchResult } from '../lib/search/searchEngine';
import { formatTimeAgo } from '../lib/utils';

const DEBOUNCE_MS = 300;

export default function SearchPage() {
  const { posts, studentId, communities } = useStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [includeComments, setIncludeComments] = useState(true);
  const [maxResults, setMaxResults] = useState(50);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    search(posts, studentId, {
      query: debouncedQuery,
      maxResults,
      includeComments,
    })
      .then(setResults)
      .catch((error) => {
        console.error('Search error:', error);
        setResults([]);
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [debouncedQuery, posts, studentId, maxResults, includeComments]);

  const handleClearQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
  }, []);

  const getCommunityName = useCallback(
    (communityId?: string | null) => {
      if (!communityId) return null;
      const community = communities.find((c) => c.id === communityId);
      return community?.shortCode || community?.name || null;
    },
    [communities]
  );

  const renderHighlightedText = useCallback((result: SearchResult): ReactElement => {
    const { content, matches } = result.highlights;
    
    if (matches.length === 0) {
      return <span>{content}</span>;
    }

    // Sort and merge overlapping matches
    const sortedMatches = [...matches].sort((a, b) => a.start - b.start);
    const mergedMatches: Array<{ start: number; end: number }> = [];
    
    sortedMatches.forEach((match) => {
      if (mergedMatches.length === 0) {
        mergedMatches.push(match);
      } else {
        const last = mergedMatches[mergedMatches.length - 1];
        if (match.start <= last.end) {
          last.end = Math.max(last.end, match.end);
        } else {
          mergedMatches.push(match);
        }
      }
    });

    // Build highlighted content
    const parts: ReactElement[] = [];
    let lastIndex = 0;

    mergedMatches.forEach((match, i) => {
      // Add text before match
      if (match.start > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>
            {content.substring(lastIndex, match.start)}
          </span>
        );
      }

      // Add highlighted match
      parts.push(
        <mark
          key={`match-${i}`}
          className="bg-yellow-400/30 text-yellow-200 font-medium rounded px-0.5"
        >
          {content.substring(match.start, match.end)}
        </mark>
      );

      lastIndex = match.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key="text-end">{content.substring(lastIndex)}</span>
      );
    }

    return <>{parts}</>;
  }, []);

  const truncateHighlightedContent = useCallback(
    (result: SearchResult, maxLength = 200) => {
      const { content, matches } = result.highlights;
      
      if (content.length <= maxLength) {
        return renderHighlightedText(result);
      }

      // Find first match to show context around it
      const firstMatch = matches.length > 0 ? matches[0] : null;
      
      if (!firstMatch) {
        return <span>{content.substring(0, maxLength)}...</span>;
      }

      // Show context around first match
      const contextStart = Math.max(0, firstMatch.start - 50);
      const contextEnd = Math.min(content.length, firstMatch.end + maxLength - 50);
      
      const truncatedContent = content.substring(contextStart, contextEnd);
      const adjustedMatches = matches
        .filter((m) => m.start >= contextStart && m.end <= contextEnd)
        .map((m) => ({
          start: m.start - contextStart,
          end: m.end - contextStart,
        }));

      const truncatedResult: SearchResult = {
        ...result,
        highlights: {
          content: truncatedContent,
          matches: adjustedMatches,
        },
      };

      return (
        <>
          {contextStart > 0 && '...'}
          {renderHighlightedText(truncatedResult)}
          {contextEnd < content.length && '...'}
        </>
      );
    },
    [renderHighlightedText]
  );

  const getSecurityIcon = useCallback((result: SearchResult) => {
    switch (result.metadata.securityLevel) {
      case 'encrypted':
        return <Lock className="w-3 h-3 text-blue-400" aria-label="Encrypted" />;
      case 'anonymous':
        return <EyeOff className="w-3 h-3 text-purple-400" aria-label="Anonymous" />;
      default:
        return <Eye className="w-3 h-3 text-gray-400" aria-label="Public" />;
    }
  }, []);

  const getTotalReactions = useCallback((result: SearchResult) => {
    return Object.values(result.post.reactions).reduce((sum, count) => sum + count, 0);
  }, []);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-white">Search</h1>
          <p className="text-gray-400">
            Search through posts and comments to find what you need
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 space-y-4"
        >
          <div className="relative">
            <SearchIcon
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for posts, comments, topics..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              aria-label="Search query"
            />
            {query && (
              <button
                onClick={handleClearQuery}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeComments}
                onChange={(e) => setIncludeComments(e.target.checked)}
                className="rounded border-white/10 bg-white/5 text-primary focus:ring-2 focus:ring-primary"
              />
              <span>Include comments</span>
            </label>
            
            <label className="flex items-center gap-2 text-gray-300">
              <span>Max results:</span>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          {/* Search Stats */}
          {debouncedQuery && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </div>
              ) : (
                <span>
                  Found <span className="text-white font-medium">{results.length}</span>{' '}
                  result{results.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Results */}
        {debouncedQuery && !isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {results.length === 0 ? (
              <div className="glass p-8 text-center space-y-2">
                <p className="text-xl text-white">No results found</p>
                <p className="text-gray-400">
                  Try different keywords or adjust your search options
                </p>
              </div>
            ) : (
              results.map((result) => {
                const communityName = getCommunityName(result.metadata.communityId);
                const totalReactions = getTotalReactions(result);
                const isEncrypted = result.metadata.isEncrypted;

                return (
                  <Link
                    key={result.id}
                    to={`/post/${result.post.id}`}
                    className="block glass p-5 hover:bg-white/10 transition-colors space-y-3 group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">
                          {result.post.studentId}
                        </span>
                        
                        {result.type === 'comment' && (
                          <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                            Comment
                          </span>
                        )}
                        
                        {result.metadata.category && (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {result.metadata.category}
                          </span>
                        )}
                        
                        {communityName && (
                          <span className="flex items-center gap-1 text-xs text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full">
                            <Building2 className="w-3 h-3" />
                            {communityName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getSecurityIcon(result)}
                        
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(result.post.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="text-gray-200 leading-relaxed">
                      {isEncrypted ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 italic">
                          <Lock className="w-4 h-4" />
                          <span>Encrypted content - view post to decrypt</span>
                        </div>
                      ) : (
                        <div className="line-clamp-3">
                          {truncateHighlightedContent(result)}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        <span>{totalReactions}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{result.post.commentCount || 0}</span>
                      </div>

                      {result.metadata.visibility && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span className="capitalize">{result.metadata.visibility}</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1 ml-auto">
                        <TrendingUp className="w-3 h-3" />
                        <span>Score: {result.score.toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </motion.div>
        )}

        {/* Initial State */}
        {!debouncedQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass p-8 text-center space-y-4"
          >
            <SearchIcon className="w-12 h-12 text-gray-600 mx-auto" />
            <div className="space-y-2">
              <p className="text-xl text-white">Start searching</p>
              <p className="text-gray-400">
                Enter keywords to search through posts and comments
              </p>
            </div>
            
            <div className="mt-6 space-y-2 text-sm text-gray-500 text-left max-w-md mx-auto">
              <p className="font-medium text-gray-400">Search features:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Full-text search with relevance ranking</li>
                <li>Search through posts and comments</li>
                <li>Automatic highlighting of matched terms</li>
                <li>Respects privacy settings and encryption</li>
                <li>Filter by category, community, and security level</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
