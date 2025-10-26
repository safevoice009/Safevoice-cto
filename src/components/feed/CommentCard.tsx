import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, Pencil, Trash2, Flag } from 'lucide-react';
import type { Comment } from '../../lib/store';
import { useStore } from '../../lib/store';
import { formatTimeAgo, getStudentIdColor, parseMarkdown } from '../../lib/utils';
import ReactionBar from './ReactionBar';
import CommentInput from './CommentInput';
import ConfirmModal from './ConfirmModal';

interface CommentCardProps {
  comment: Comment;
  postId: string;
  depth?: number;
}

export default function CommentCard({ comment, postId, depth = 0 }: CommentCardProps) {
  const { studentId, addCommentReaction, deleteComment, addComment, updateComment, addNotification } =
    useStore();

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const isOwnComment = comment.studentId === studentId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleReply = (content: string) => {
    addComment(postId, content, comment.id);
    setShowReplyInput(false);

    if (comment.studentId !== studentId) {
      addNotification({
        recipientId: comment.studentId,
        type: 'reply',
        postId,
        commentId: comment.id,
        actorId: studentId,
        message: 'replied to your comment',
      });
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim().length >= 5 && editContent.trim().length <= 500) {
      updateComment(comment.id, editContent.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className={`rounded-xl p-4 bg-white/5 ${depth > 0 ? 'ml-8 border-l-2 border-primary/50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${getStudentIdColor(
              comment.studentId
            )} flex items-center justify-center text-xs font-bold`}
          >
            {comment.studentId.slice(-4)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-white">{comment.studentId}</p>
              <span className="text-xs text-gray-400">{formatTimeAgo(comment.createdAt)}</span>
              {comment.isEdited && <span className="text-xs text-gray-500">(edited)</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isOwnComment && !isEditing && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4 text-gray-400" />
            </motion.button>
          )}

          {isOwnComment && !isEditing && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDeleteModal(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 text-gray-400" />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Reply className="w-4 h-4 text-gray-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Flag className="w-4 h-4 text-gray-400" />
          </motion.button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white resize-none focus:outline-none focus:border-primary transition-colors"
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{editContent.length}/500</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editContent.trim().length < 5 || editContent.trim().length > 500}
                className="px-3 py-1 bg-primary text-white rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="mt-3 text-sm text-gray-200"
          dangerouslySetInnerHTML={{ __html: parseMarkdown(comment.content) }}
        />
      )}

      <ReactionBar
        reactions={comment.reactions}
        onReact={(reactionType) => addCommentReaction(postId, comment.id, reactionType)}
        size="small"
      />

      {depth < 1 && (
        <AnimatePresence>
          {showReplyInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 ml-6"
            >
              <CommentInput
                postId={postId}
                parentCommentId={comment.id}
                onSubmit={handleReply}
                initialContent={`@${comment.studentId} `}
                suggestions={[comment.studentId]}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {hasReplies && (
        <div className="mt-4 ml-6 space-y-3">
          {comment.replies.length > 3 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-gray-400 hover:text-primary transition-colors"
            >
              {showReplies ? 'Hide replies' : `Show ${comment.replies.length} replies`}
            </button>
          )}

          <AnimatePresence>
            {showReplies &&
              comment.replies.map((reply) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CommentCard comment={reply} postId={postId} depth={depth + 1} />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteComment(comment.id, postId)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
      />
    </div>
  );
}
