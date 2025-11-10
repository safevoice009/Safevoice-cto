import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Lock, Clock, Database, Mic } from 'lucide-react';
import { useStore, type PostLifetime, type PostEmotionAnalysis } from '../../lib/store';
import { encryptContent } from '../../lib/encryption';
import { moderateContent } from '../../lib/contentModeration';
import { detectCrisis, getCrisisSeverity } from '../../lib/crisisDetection';
import { uploadToIPFS } from '../../lib/ipfs';
import toast from 'react-hot-toast';
import VoiceRecorder from './VoiceRecorder';

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

const lifetimeOptions: { value: PostLifetime; label: string; icon: string }[] = [
  { value: '1h', label: '1 hour', icon: '⏱️' },
  { value: '6h', label: '6 hours', icon: '⏱️' },
  { value: '24h', label: '24 hours (1 day)', icon: '⏱️' },
  { value: '7d', label: '7 days (1 week)', icon: '⏱️' },
  { value: '30d', label: '30 days (1 month)', icon: '⏱️' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
  { value: 'never', label: 'Never (permanent)', icon: '♾️' },
];

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [lifetime, setLifetime] = useState<PostLifetime>('24h');
  const [customHours, setCustomHours] = useState<number>(24);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [storeOnIPFS, setStoreOnIPFS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [emotionAnalysis, setEmotionAnalysis] = useState<PostEmotionAnalysis | null>(null);

  const addPost = useStore((state) => state.addPost);
  const addEncryptionKey = useStore((state) => state.addEncryptionKey);
  const posts = useStore((state) => state.posts);
  const studentId = useStore((state) => state.studentId);
  const setPendingPost = useStore((state) => state.setPendingPost);
  const setShowCrisisModal = useStore((state) => state.setShowCrisisModal);

  const handleVoiceRecordingComplete = (transcript: string, analysis: PostEmotionAnalysis) => {
    setContent(transcript);
    setEmotionAnalysis(analysis);
    setIsRecording(false);
    handleSubmit(new Event('submit') as unknown as React.FormEvent);
  };

  const handleVoiceRecorderCancel = () => {
    setIsRecording(false);
    setEmotionAnalysis(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (trimmedContent.length < 10 || trimmedContent.length > 1000) return;

    if (lifetime === 'custom' && (customHours < 1 || customHours > 8760)) {
      toast.error('Custom duration must be between 1 and 8760 hours');
      return;
    }

    setIsSubmitting(true);

    try {
      const userPosts = posts
        .filter((p) => p.studentId === studentId)
        .map((p) => ({ content: p.content, createdAt: p.createdAt }));

      const moderation = await moderateContent(trimmedContent, { userPosts });

      if (moderation.blocked) {
        toast.error(moderation.reason ?? 'This post cannot be shared.');
        setIsSubmitting(false);
        return;
      }

      const isCrisis = detectCrisis(trimmedContent);
      const crisisLevel = isCrisis ? getCrisisSeverity(trimmedContent) : undefined;

      let encryptedData: { encrypted: string; iv: string; keyId: string } | undefined;
      if (isEncrypted) {
        const encrypted = await encryptContent(trimmedContent);
        addEncryptionKey(encrypted.keyId, encrypted.key);
        encryptedData = {
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          keyId: encrypted.keyId,
        };
      }

      const moderationData = {
        issues: moderation.issues,
        needsReview: moderation.needsReview,
        contentBlurred:
          moderation.issues?.some((issue) => issue.type === 'profanity') ?? false,
        blurReason:
          moderation.issues?.find((issue) => issue.type === 'profanity')?.message || null,
        isCrisisFlagged: isCrisis,
        crisisLevel,
      };

      // Try to upload to IPFS if user opted in
      let ipfsCid: string | undefined;
      if (storeOnIPFS) {
        const ipfsResult = await uploadToIPFS(trimmedContent, true);
        if (ipfsResult.success && ipfsResult.cid) {
          ipfsCid = ipfsResult.cid;
          toast.success('Content stored on IPFS! 📦');
        } else {
          toast.error(`IPFS upload failed: ${ipfsResult.error || 'Unknown error'}`);
        }
      }

      if (isCrisis) {
        setPendingPost({
          content: trimmedContent,
          category: category || undefined,
          expiresAt: null,
          lifetime,
          customLifetimeHours: lifetime === 'custom' ? customHours : null,
          isEncrypted,
          encryptionData: encryptedData,
          moderationData,
          ipfsCid: ipfsCid ?? null,
          emotionAnalysis: emotionAnalysis ?? undefined,
        });
        setShowCrisisModal(true);
        setIsSubmitting(false);
        return;
      }

      addPost(
        trimmedContent,
        category || undefined,
        lifetime,
        lifetime === 'custom' ? customHours : undefined,
        isEncrypted,
        encryptedData,
        moderationData,
        undefined,
        undefined,
        emotionAnalysis ?? null,
        ipfsCid
      );
      setPendingPost(null);

      setContent('');
      setCategory('');
      setLifetime('24h');
      setCustomHours(24);
      setIsEncrypted(false);
      setStoreOnIPFS(false);
      setIsExpanded(false);
      setEmotionAnalysis(null);
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRecording) {
    return (
      <VoiceRecorder
        onRecordingComplete={handleVoiceRecordingComplete}
        onCancel={handleVoiceRecorderCancel}
        isSubmitting={isSubmitting}
      />
    );
  }

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
              setLifetime('24h');
              setCustomHours(24);
              setIsEncrypted(false);
              setEmotionAnalysis(null);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center space-x-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="What's on your mind? Your story can inspire and help others..."
            className="flex-1 bg-surface border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary transition-colors"
            rows={isExpanded ? 5 : 3}
            maxLength={1000}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setIsRecording(true)}
            title="Record voice message"
            className="p-3 mt-1 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 border border-primary/50 transition-all"
          >
            <Mic className="w-5 h-5" />
          </motion.button>
        </div>

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

            <div>
              <label className="block text-sm text-gray-400 mb-2 flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Post Lifetime (Delete After)</span>
              </label>
              <select
                value={lifetime}
                onChange={(e) => setLifetime(e.target.value as PostLifetime)}
                className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors"
              >
                {lifetimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Your post will automatically delete after this time
              </p>
            </div>

            {lifetime === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="block text-sm text-gray-400 mb-2">
                  Hours until deletion
                </label>
                <input
                  type="number"
                  value={customHours}
                  onChange={(e) => setCustomHours(parseInt(e.target.value) || 1)}
                  min={1}
                  max={8760}
                  placeholder="Enter hours (1-8760)"
                  className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max: 8760 hours (1 year)
                </p>
              </motion.div>
            )}

            <div className="flex items-center space-x-3 p-3 bg-surface/50 rounded-lg border border-white/10">
              <input
                type="checkbox"
                id="encrypt"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <label htmlFor="encrypt" className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
                <Lock className="w-4 h-4" />
                <span>🔐 Encrypt this post (End-to-end encryption)</span>
              </label>
            </div>
            {isEncrypted && (
              <div className="text-xs text-gray-500 pl-7">
                Only you can decrypt this content. Uses AES-GCM-256 encryption.
              </div>
            )}

            <div className="flex items-center space-x-3 p-3 bg-surface/50 rounded-lg border border-white/10">
              <input
                type="checkbox"
                id="ipfs"
                checked={storeOnIPFS}
                onChange={(e) => setStoreOnIPFS(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <label htmlFor="ipfs" className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
                <Database className="w-4 h-4" />
                <span>📦 Store on IPFS (Decentralized storage)</span>
              </label>
            </div>
            {storeOnIPFS && (
              <div className="text-xs text-gray-500 pl-7">
                Your content will be permanently stored on the decentralized IPFS network.
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {content.length}/1000{' '}
                {content.length >= 10 && <span className="text-green-500">✓</span>}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={content.trim().length < 10 || content.trim().length > 1000 || isSubmitting}
                className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Post</span>
                  </>
                )}
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
