import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Comment } from '../../lib/store';
import CommentCard from './CommentCard';
import CommentInput from './CommentInput';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  postStudentId: string;
}

type SortType = 'best' | 'newest' | 'oldest';

const extractStudentIds = (comments: Comment[]): string[] => {
  const ids: Set<string> = new Set();
  const extract = (cmts: Comment[]) => {
    cmts.forEach((comment) => {
      ids.add(comment.studentId);
      if (comment.replies.length > 0) {
        extract(comment.replies);
      }
    });
  };
  extract(comments);
  return Array.from(ids);
};

export default function CommentSection({ postId, comments, postStudentId }: CommentSectionProps) {
  const [sortBy, setSortBy] = useState<SortType>('best');
  const [visibleCount, setVisibleCount] = useState(5);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const participantIds = Array.from(new Set([postStudentId, ...extractStudentIds(comments)])).filter(
    Boolean
  );

  const sortedComments = [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'best': {
        const aReactions = Object.values(a.reactions).reduce((sum, count) => sum + count, 0);
        const bReactions = Object.values(b.reactions).reduce((sum, count) => sum + count, 0);
        return bReactions - aReactions;
      }
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      default:
        return 0;
    }
  });

  const visibleComments = sortedComments.slice(0, visibleCount);
  const hasMore = sortedComments.length > visibleCount;

  return (
    <div className="pt-4 border-t border-white/10 space-y-4">
      <CommentInput postId={postId} ref={inputRef} suggestions={participantIds} />

      {comments.length > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400">
            {comments.length} Comment{comments.length !== 1 ? 's' : ''}
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-surface border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-primary transition-colors"
            >
              <option value="best">Best</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {visibleComments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CommentCard comment={comment} postId={postId} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasMore && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setVisibleCount((prev) => prev + 10)}
          className="w-full py-2 text-sm text-gray-400 hover:text-primary hover:bg-white/5 rounded-lg transition-all"
        >
          Load {Math.min(10, sortedComments.length - visibleCount)} more comment
          {sortedComments.length - visibleCount !== 1 ? 's' : ''}
        </motion.button>
      )}
    </div>
  );
}
