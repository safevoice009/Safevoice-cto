import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, X, Lock, Clock, Users, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Community, CommunityChannel } from '../../lib/communities/types';
import { useStore, type PostLifetime } from '../../lib/store';
import { encryptContent } from '../../lib/encryption';
import { moderateContent } from '../../lib/contentModeration';
import { detectCrisis, getCrisisSeverity } from '../../lib/crisisDetection';

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

interface CommunityCreatePostProps {
  community: Community;
  channels: CommunityChannel[];
  activeChannelId: string | null;
}

export default function CommunityCreatePost({ community, channels, activeChannelId }: CommunityCreatePostProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [lifetime, setLifetime] = useState<PostLifetime>('24h');
  const [customHours, setCustomHours] = useState<number>(24);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(activeChannelId ?? null);
  const [isAnonymous, setIsAnonymous] = useState(true);

  const addPost = useStore((state) => state.addPost);
  const addEncryptionKey = useStore((state) => state.addEncryptionKey);
  const posts = useStore((state) => state.posts);
  const studentId = useStore((state) => state.studentId);
  const setPendingPost = useStore((state) => state.setPendingPost);
  const setShowCrisisModal = useStore((state) => state.setShowCrisisModal);
  const isMember = useStore((state) => state.isMemberOfCommunity(community.id));

  useEffect(() => {
    if (!selectedChannelId) {
      const defaultChannel = channels.find((channel) => channel.id === activeChannelId) ?? channels.find((channel) => channel.isDefault);
      setSelectedChannelId(defaultChannel ? defaultChannel.id : channels[0]?.id ?? null);
    }
  }, [activeChannelId, channels, selectedChannelId]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMember) {
      toast.error('You need to join this community to post.');
      return;
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < 10 || trimmedContent.length > 1000) return;

    if (!selectedChannelId) {
      toast.error('Please select a channel to post in.');
      return;
    }

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

      const communityMeta = {
        communityId: community.id,
        channelId: selectedChannelId,
        visibility: 'campus' as const,
        isAnonymous,
      };

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
          communityId: community.id,
          channelId: selectedChannelId,
          visibility: 'campus',
          isAnonymous,
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
        communityMeta
      );

      setPendingPost(null);

      setContent('');
      setCategory('');
      setLifetime('24h');
      setCustomHours(24);
      setIsEncrypted(false);
      setIsExpanded(false);
      setIsAnonymous(true);
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMember) {
    return (
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-yellow-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Join to post</h2>
            <p className="text-sm text-yellow-200/80">
              Only members of {community.name} can post in channels. Join the community to participate.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Share with {community.name}</h2>
          <p className="text-xs text-gray-400">
            Visible to members of {community.name}{selectedChannel ? ` in #${selectedChannel.name}` : ''}. You can post anonymously.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300">
            <Hash className="h-4 w-4 text-primary" />
            <select
              value={selectedChannelId ?? ''}
              onChange={(e) => setSelectedChannelId(e.target.value || null)}
              className="bg-transparent text-sm text-white focus:outline-none"
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder={`Share something with ${community.shortCode}...`}
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
              <label className="block text-sm text-gray-400 mb-2">Category (optional)</label>
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

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Post Lifetime
                  </span>
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
                <p className="text-xs text-gray-500 mt-1">Your post will automatically delete after this time.</p>

                {lifetime === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <label className="block text-sm text-gray-400 mb-2">Hours until deletion</label>
                    <input
                      type="number"
                      value={customHours}
                      onChange={(e) => setCustomHours(parseInt(e.target.value) || 1)}
                      min={1}
                      max={8760}
                      placeholder="Enter hours (1-8760)"
                      className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max: 8760 hours (1 year)</p>
                  </motion.div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Post anonymously (recommended)
                </label>

                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                  <input
                    type="checkbox"
                    id="encrypt-community"
                    checked={isEncrypted}
                    onChange={(e) => setIsEncrypted(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <label htmlFor="encrypt-community" className="flex items-center gap-2 text-sm text-gray-300">
                    <Lock className="h-4 w-4" />
                    🔐 Encrypt this post (End-to-end encryption)
                  </label>
                </div>
                {isEncrypted && (
                  <p className="pl-7 text-xs text-gray-500">
                    Only you can decrypt this content. Uses AES-GCM-256 encryption.
                  </p>
                )}
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
              💡 Tip: Share experiences, ask for help, or start a conversation with your campus peers.
            </div>
          </motion.div>
        )}
      </form>

      {isExpanded && (
        <button
          onClick={() => {
            setIsExpanded(false);
            setContent('');
            setCategory('');
            setLifetime('24h');
            setCustomHours(24);
            setIsEncrypted(false);
            setIsAnonymous(true);
          }}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
          type="button"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      )}
    </motion.div>
  );
}
