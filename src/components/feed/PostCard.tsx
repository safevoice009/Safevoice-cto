import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Share2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Post, ReactionType } from '../../types/post';
import { topicColors, reactionEmojis } from '../../lib/constants';
import { getRelativeTime, copyPostLink } from '../../lib/utils';
import { useStore } from '../../lib/store';

interface PostCardProps {
  post: Post;
}

function PostCard({ post }: PostCardProps) {
  const updateReaction = useStore((state) => state.updateReaction);
  const [selectedImage, setSelectedImage] = useState(false);

  const handleReactionClick = (reactionType: ReactionType) => {
    updateReaction(post.id, reactionType);
  };

  const handleShare = () => {
    copyPostLink(post.id);
  };

  const handleComment = () => {
    toast('Comments coming soon!', { icon: '💬' });
  };

  return (
    <>
      <motion.article
        className="glass rounded-lg p-4 md:p-6 hover:shadow-glow transition-all duration-300"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ y: -4 }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-primary">{post.studentId}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                {post.college}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${topicColors[post.topic]}`}
              >
                {post.topic}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{getRelativeTime(post.createdAt)}</p>
          </div>
        </div>

        <p className="text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {post.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden cursor-pointer group relative">
            <img
              src={post.imageUrl}
              alt="Post attachment"
              className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
              onClick={() => setSelectedImage(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-700">
          {reactionEmojis.map(({ type, emoji, label }) => {
            const count = post.reactions[type];
            return (
              <motion.button
                key={type}
                onClick={() => handleReactionClick(type)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface/80 transition-colors group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`React with ${label}`}
              >
                <span className="text-lg group-hover:scale-125 transition-transform">{emoji}</span>
                {count > 0 && (
                  <motion.span
                    key={count}
                    className="text-sm font-medium text-gray-300"
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    {count}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleComment}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comment</span>
            {post.commentCount > 0 && <span className="text-xs">({post.commentCount})</span>}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </motion.article>

      {selectedImage && post.imageUrl && (
        <motion.div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedImage(false)}
        >
          <motion.img
            src={post.imageUrl}
            alt="Post attachment fullscreen"
            className="max-w-full max-h-full object-contain rounded-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl bg-black/50 w-10 h-10 rounded-full hover:bg-black/70 transition-colors"
            onClick={() => setSelectedImage(false)}
          >
            ×
          </button>
        </motion.div>
      )}
    </>
  );
}

export default memo(PostCard);
