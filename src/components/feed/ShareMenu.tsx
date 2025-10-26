import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Mail, MessageCircle } from 'lucide-react';
import { copyToClipboard } from '../../lib/utils';
import toast from 'react-hot-toast';

interface ShareMenuProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export default function ShareMenu({ isOpen, onClose, postId }: ShareMenuProps) {
  const postUrl = `${window.location.origin}/post/${postId}`;

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(postUrl);
      toast.success('Link copied to clipboard! 🔗');
      onClose();
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SafeVoice Post',
          text: 'Check out this post on SafeVoice',
          url: postUrl,
        });
        onClose();
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      `Check out this post on SafeVoice: ${postUrl}`
    )}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const handleEmail = () => {
    const emailUrl = `mailto:?subject=${encodeURIComponent(
      'SafeVoice Post'
    )}&body=${encodeURIComponent(`Check out this post: ${postUrl}`)}`;
    window.location.href = emailUrl;
    onClose();
  };

  const handleTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      'Check out this post on SafeVoice'
    )}&url=${encodeURIComponent(postUrl)}`;
    window.open(twitterUrl, '_blank');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full right-0 mb-2 glass p-2 space-y-1 z-20 w-48"
      >
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left"
        >
          <Link2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Copy Link</span>
        </button>

        <button
          onClick={handleWhatsApp}
          className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left"
        >
          <MessageCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Share to WhatsApp</span>
        </button>

        <button
          onClick={handleEmail}
          className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left"
        >
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Share via Email</span>
        </button>

        <button
          onClick={handleTwitter}
          className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left"
        >
          <svg
            className="w-4 h-4 text-gray-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-sm text-gray-300">Share to X</span>
        </button>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <>
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={handleShare}
              className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left"
            >
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              <span className="text-sm text-gray-300">More Options</span>
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
