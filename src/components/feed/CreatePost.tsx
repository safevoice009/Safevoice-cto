import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { useStore } from '../../lib/store';

const categories = [
  'Mental Health',
  'Academic Stress',
  'Support',
  'Bullying',
  'Anxiety',
  'Depression',
  'Peer Pressure',
  'Other',
];

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { addPost } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (trimmedContent.length < 10 || trimmedContent.length > 1000) return;

    addPost(trimmedContent, category || undefined);
    setContent('');
    setCategory('');
    setIsExpanded(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Share Your Story</h2>
        {isExpanded && (
          <button
            onClick={() => {
              setIsExpanded(false);
              setContent('');
              setCategory('');
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="What's on your mind? Your story can inspire and help others..."
          className="w-full bg-surface border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary transition-colors"
          rows={isExpanded ? 5 : 3}
          maxLength={1000}
        />

        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Category (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat === category ? '' : cat)}
                    className={`px-3 py-1 text-sm rounded-full border transition-all ${
                      category === cat
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-white/20 text-gray-400 hover:border-white/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {content.length}/1000{' '}
                {content.length >= 10 && <span className="text-green-500">✓</span>}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={content.trim().length < 10 || content.trim().length > 1000}
                className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Post</span>
              </motion.button>
            </div>

            <div className="text-xs text-gray-500">
              💡 Tip: Use **bold** or *italic* to format text. Share anonymously and safely.
            </div>
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}
