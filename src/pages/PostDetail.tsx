import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../lib/store';
import PostCard from '../components/feed/PostCard';

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { posts, initializeStore } = useStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return (
      <motion.section
        className="min-h-screen flex flex-col items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="glass max-w-xl w-full p-10 text-center space-y-4">
          <h1 className="text-3xl font-bold">Post Not Found</h1>
          <p className="text-gray-300">This post may have been deleted or doesn't exist.</p>
          <button
            onClick={() => navigate('/feed')}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="min-h-screen px-4 py-8 max-w-3xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-6">
        <button
          onClick={() => navigate('/feed')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <PostCard post={post} />
      </div>
    </motion.section>
  );
}
