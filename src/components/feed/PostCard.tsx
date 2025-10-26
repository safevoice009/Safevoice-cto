import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  Pin,
  Star,
  Edit,
  Trash2,
} from 'lucide-react';
import type { Post } from '../../lib/store';
import { useStore } from '../../lib/store';
import { formatTimeAgo, getStudentIdColor, parseMarkdown } from '../../lib/utils';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import ShareMenu from './ShareMenu';
import ConfirmModal from './ConfirmModal';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const { studentId, toggleBookmark, bookmarkedPosts, togglePin, incrementHelpful, updatePost, deletePost } =
    useStore();

  const isBookmarked = bookmarkedPosts.includes(post.id);
  const isOwnPost = post.studentId === studentId;
  const isBlurred = post.reportCount >= 3;
  const [showBlurredContent, setShowBlurredContent] = useState(false);

  const handleShare = () => {
    setShowShareMenu(!showShareMenu);
  };

  const handleSaveEdit = () => {
    if (editContent.trim().length >= 10 && editContent.trim().length <= 1000) {
      updatePost(post.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    deletePost(post.id);
    setShowDeleteModal(false);
  };

  const totalReactions = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="glass p-6 space-y-4 relative"
      >
        {post.isPinned && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center space-x-1 text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </div>
          </div>
        )}

        {isBlurred && !showBlurredContent && (
          <div className="absolute inset-0 backdrop-blur-xl bg-black/50 rounded-2xl flex flex-col items-center justify-center z-10 space-y-3">
            <Flag className="w-8 h-8 text-yellow-500" />
            <p className="text-sm text-yellow-500 font-medium">⚠️ Content under review</p>
            <p className="text-xs text-gray-400">This content has been reported multiple times</p>
            <button
              onClick={() => setShowBlurredContent(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
            >
              Show Content
            </button>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${getStudentIdColor(
                post.studentId
              )} flex items-center justify-center text-sm font-bold`}
            >
              {post.studentId.slice(-4)}
            </div>
            <div>
              <p className="font-medium text-white">{post.studentId}</p>
              <p className="text-xs text-gray-400">
                {formatTimeAgo(post.createdAt)}
                {post.isEdited && <span className="ml-1 text-gray-500">(edited)</span>}
              </p>
            </div>
          </div>

          {isOwnPost && !isEditing && (
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Edit post"
              >
                <Edit className="w-4 h-4 text-gray-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowDeleteModal(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Delete post"
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => togglePin(post.id)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={post.isPinned ? 'Unpin post' : 'Pin post'}
              >
                <Pin
                  className={`w-4 h-4 ${
                    post.isPinned ? 'text-purple-400 fill-purple-400' : 'text-gray-400'
                  }`}
                />
              </motion.button>
            </div>
          )}
        </div>

        {post.category && (
          <div className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">
            {post.category}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white resize-none focus:outline-none focus:border-primary transition-colors"
              rows={4}
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{editContent.length}/1000</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editContent.trim().length < 10 || editContent.trim().length > 1000}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="text-gray-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }}
          />
        )}

        <ReactionBar
          reactions={post.reactions}
          onReact={(reactionType) => useStore.getState().addReaction(post.id, reactionType)}
        />

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center space-x-1 text-sm text-gray-400">
            <span>{totalReactions > 0 ? totalReactions : 'No'} reaction{totalReactions !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-400">
            <span>{post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              showComments
                ? 'bg-primary/20 text-primary border-b-2 border-primary'
                : 'hover:bg-white/10 text-gray-400'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">
              {post.commentCount > 0 ? `Comments (${post.commentCount})` : 'Comment'}
            </span>
          </motion.button>

          <div className="flex items-center space-x-2">
            {post.helpfulCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => incrementHelpful(post.id)}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-white/10 text-yellow-500 transition-all"
              >
                <Star className="w-4 h-4 fill-yellow-500" />
                <span className="text-xs font-medium">{post.helpfulCount}</span>
              </motion.button>
            )}

            {post.helpfulCount === 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => incrementHelpful(post.id)}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-yellow-500 transition-all"
                title="Mark as helpful"
              >
                <Star className="w-4 h-4" />
                <span className="text-xs">Helpful</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleBookmark(post.id)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
            >
              <Bookmark
                className={`w-4 h-4 ${
                  isBookmarked ? 'fill-primary text-primary' : 'text-gray-400'
                }`}
              />
            </motion.button>

            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Share post"
              >
                <Share2 className="w-4 h-4 text-gray-400" />
              </motion.button>
              <ShareMenu
                isOpen={showShareMenu}
                onClose={() => setShowShareMenu(false)}
                postId={post.id}
              />
            </div>

            {!isOwnPost && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowReportModal(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Report post"
              >
                <Flag className="w-4 h-4 text-gray-400" />
              </motion.button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <CommentSection postId={post.id} comments={post.comments} postStudentId={post.studentId} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        postId={post.id}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
      />
    </>
  );
}
