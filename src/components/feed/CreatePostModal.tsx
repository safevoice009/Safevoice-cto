import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Post, TopicKey } from '../../types/post';
import { colleges, topics, postLifetimeOptions } from '../../lib/constants';
import { generatePostId, generateStudentId } from '../../lib/utils';
import { useStore } from '../../lib/store';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_CHARS = 1000;
const MIN_CHARS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const addPost = useStore((state) => state.addPost);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState('');
  const [college, setCollege] = useState(colleges[0]);
  const [topic, setTopic] = useState<TopicKey>('Mental Health');
  const [lifetime, setLifetime] = useState('24h');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|gif)$/)) {
      toast.error('Only JPG, PNG, and GIF images are allowed');
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearForm = () => {
    setContent('');
    setCollege(colleges[0]);
    setTopic('Mental Health');
    setLifetime('24h');
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = () => {
    if (content.length < MIN_CHARS) {
      toast.error(`Post must be at least ${MIN_CHARS} characters long`);
      return;
    }

    const selectedLifetime = postLifetimeOptions.find((opt) => opt.value === lifetime);
    const expiresAt = selectedLifetime?.durationMs ? Date.now() + selectedLifetime.durationMs : null;

    const newPost: Post = {
      id: generatePostId(),
      studentId: generateStudentId(),
      content,
      college,
      topic,
      reactions: {
        heart: 0,
        fire: 0,
        clap: 0,
        sad: 0,
        angry: 0,
        laugh: 0,
      },
      comments: [],
      commentCount: 0,
      createdAt: Date.now(),
      expiresAt,
      imageUrl: imagePreview,
    };

    addPost(newPost);
    toast.success('Post shared anonymously! 🎉');
    clearForm();
    onClose();
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  const charsRemaining = MAX_CHARS - content.length;
  const isValid = content.length >= MIN_CHARS && content.length <= MAX_CHARS;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 p-4"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="glass rounded-t-2xl md:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 glass border-b border-gray-700 p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Share Your Story</h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-surface rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <motion.div
                className="p-4 md:p-6 space-y-4"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
              >
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <label className="block text-sm font-medium mb-2">Your Story</label>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Share your story anonymously..."
                    className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[120px]"
                    maxLength={MAX_CHARS}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">Minimum {MIN_CHARS} characters</span>
                    <span
                      className={`text-xs font-medium ${
                        charsRemaining < 50
                          ? 'text-red-400'
                          : charsRemaining < 200
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                      }`}
                    >
                      {charsRemaining} characters remaining
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">College</label>
                    <select
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {colleges.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Topic</label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value as TopicKey)}
                      className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {topics.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <label className="block text-sm font-medium mb-2">Delete After</label>
                  <select
                    value={lifetime}
                    onChange={(e) => setLifetime(e.target.value)}
                    className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {postLifetimeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <label className="block text-sm font-medium mb-2">Image (Optional)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface/80 rounded-lg cursor-pointer transition-colors border border-gray-700">
                      <Camera className="w-5 h-5" />
                      <span className="text-sm">Add Image</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    {imageFile && (
                      <span className="text-sm text-gray-400 flex-1 truncate">{imageFile.name}</span>
                    )}
                  </div>

                  {imagePreview && (
                    <div className="mt-3 relative rounded-lg overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black/90 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  className="flex gap-3 pt-4"
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                >
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 bg-surface hover:bg-surface/80 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid}
                    className="flex-1 px-4 py-3 bg-gradient-hero hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-opacity"
                  >
                    Post Now
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
