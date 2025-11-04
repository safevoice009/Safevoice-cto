import { useEffect, useMemo, useState } from 'react';
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
  Lock,
  AlertTriangle,
  EyeOff,
  Sparkles,
  Clock,
  Zap,
  DollarSign,
  Shield,
  Ban,
  VolumeX,
  Volume2,
  Megaphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Post } from '../../lib/store';
import { useStore } from '../../lib/store';
import {
  formatTimeAgo,
  formatTimeRemaining,
  getStudentIdColor,
  getTimerBgColor,
  getTimerColor,
  getTimerTextColor,
  parseMarkdown,
} from '../../lib/utils';
import { decryptContent, encryptContent } from '../../lib/encryption';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import ShareMenu from './ShareMenu';
import ConfirmModal from './ConfirmModal';
import TipModal from './TipModal';
import RankChip from '../wallet/RankChip';
import { AchievementService } from '../../lib/tokens/AchievementService';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(post.isEncrypted ?? false);
  const [decryptedContent, setDecryptedContent] = useState(post.isEncrypted ? '' : post.content);
  const [decryptError, setDecryptError] = useState(false);
  const [timeLabel, setTimeLabel] = useState<string | null>(formatTimeRemaining(post.expiresAt ?? null));
  const [timerColor, setTimerColor] = useState<string>(getTimerColor(post.expiresAt ?? null));
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(
    post.expiresAt ? post.expiresAt - Date.now() : null
  );
  const [highlightLabel, setHighlightLabel] = useState<string | null>(
    formatTimeRemaining(post.highlightedUntil ?? null)
  );
  const [crossCampusLabel, setCrossCampusLabel] = useState<string | null>(
    formatTimeRemaining(post.crossCampusUntil ?? null)
  );

  const {
    studentId,
    toggleBookmark,
    bookmarkedPosts,
    incrementHelpful,
    updatePost,
    deletePost,
    getEncryptionKey,
    addEncryptionKey,
    setShowCrisisModal,
    setPendingPost,
    pinPost,
    highlightPost,
    extendPostLifetime,
    boostToCampuses,
    currentRank,
    achievements,
    isModerator,
    pinCommunityPost,
    unpinCommunityPost,
    deleteCommunityPost,
    banCommunityMember,
    warnCommunityMember,
  } = useStore();

  const [showBlurredContent, setShowBlurredContent] = useState(false);
  const isHidden = post.moderationStatus === 'hidden';
  const isUnderReview = post.moderationStatus === 'under_review';
  const isReportBlur = post.reportCount >= 3;
  const isModerationBlur = Boolean(post.contentBlurred);
  const isBlurred = isHidden || isUnderReview || isReportBlur || isModerationBlur;
  const shouldBlur = !showBlurredContent && isBlurred;
  const isBookmarked = bookmarkedPosts.includes(post.id);
  const isOwnPost = post.studentId === studentId;
  const authorRank = isOwnPost ? currentRank : AchievementService.getRank(0);
  const authorBadges = isOwnPost ? achievements.slice(0, 3) : [];

  const canExtend = useMemo(() => {
    if (!isOwnPost || !post.expiresAt || !timeRemainingMs) return false;
    if (timeRemainingMs <= 0) return false;
    return timeRemainingMs <= 6 * 60 * 60 * 1000;
  }, [isOwnPost, post.expiresAt, timeRemainingMs]);

  useEffect(() => {
    let isMounted = true;

    if (post.isEncrypted && post.encryptionMeta) {
      const key = getEncryptionKey(post.encryptionMeta.keyId);
      if (!key) {
        setIsDecrypting(false);
        setDecryptError(true);
        return;
      }

      setIsDecrypting(true);
      decryptContent(post.content, post.encryptionMeta.iv, key)
        .then((decoded) => {
          if (!isMounted) return;
          setDecryptedContent(decoded);
          setEditContent(decoded);
          setDecryptError(false);
        })
        .catch(() => {
          if (!isMounted) return;
          setDecryptError(true);
          setDecryptedContent('');
        })
        .finally(() => {
          if (!isMounted) return;
          setIsDecrypting(false);
        });
    } else {
      setDecryptedContent(post.content);
      setEditContent(post.content);
      setIsDecrypting(false);
      setDecryptError(false);
    }

    return () => {
      isMounted = false;
    };
  }, [post.content, post.encryptionMeta, post.id, post.isEncrypted, getEncryptionKey]);

  useEffect(() => {
    const updateTimer = () => {
      if (!post.expiresAt) {
        setTimeLabel(null);
        setTimerColor(getTimerColor(null));
        setTimeRemainingMs(null);
        return;
      }

      const remaining = post.expiresAt - Date.now();
      setTimeRemainingMs(remaining);
      setTimeLabel(formatTimeRemaining(post.expiresAt));
      setTimerColor(getTimerColor(post.expiresAt));
    };

    updateTimer();

    if (!post.expiresAt) return;

    const interval = window.setInterval(updateTimer, 60000);
    return () => window.clearInterval(interval);
  }, [post.expiresAt]);

  useEffect(() => {
    const updateBoostTimers = () => {
      if (post.highlightedUntil) {
        setHighlightLabel(formatTimeRemaining(post.highlightedUntil));
      } else {
        setHighlightLabel(null);
      }

      if (post.crossCampusUntil) {
        setCrossCampusLabel(formatTimeRemaining(post.crossCampusUntil));
      } else {
        setCrossCampusLabel(null);
      }
    };

    updateBoostTimers();

    const interval = window.setInterval(updateBoostTimers, 60000);
    return () => window.clearInterval(interval);
  }, [post.highlightedUntil, post.crossCampusUntil]);

  const handleShare = () => {
    setShowShareMenu(!showShareMenu);
  };

  const handleSaveEdit = async () => {
    const trimmedContent = editContent.trim();
    if (trimmedContent.length < 10 || trimmedContent.length > 1000) return;

    setIsSaving(true);

    try {
      if (post.isEncrypted) {
        const encrypted = await encryptContent(trimmedContent);
        addEncryptionKey(encrypted.keyId, encrypted.key);

        updatePost(post.id, trimmedContent, {
          isEncrypted: true,
          encryptedData: {
            encrypted: encrypted.encrypted,
            iv: encrypted.iv,
            keyId: encrypted.keyId,
          },
        });
      } else {
        updatePost(post.id, trimmedContent);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update post:', error);
      toast.error('Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    deletePost(post.id);
    setShowDeleteModal(false);
  };

  const handleExtend = () => {
    extendPostLifetime(post.id, 24);
  };

  const handlePin = () => {
    pinPost(post.id);
  };

  const handleHighlight = () => {
    highlightPost(post.id);
  };

  const handleCrossCampusBoost = () => {
    const defaultCampuses = post.crossCampusBoosts?.length ? post.crossCampusBoosts : ['global'];
    boostToCampuses(post.id, defaultCampuses);
  };

  const totalReactions = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);
  const timerDisplay = useMemo(() => {
    if (!post.expiresAt) return '♾️ Permanent';
    if (timeLabel === 'Expired') return 'Expired';
    if (!timeLabel) return null;
    return `Expires in ${timeLabel}`;
  }, [post.expiresAt, timeLabel]);

  const timerClasses = useMemo(() => {
    if (!post.expiresAt) return 'bg-gray-500/10 border border-gray-500/20 text-gray-400';
    const color = timerColor;
    return `${getTimerBgColor(color)} ${getTimerTextColor(color)}`;
  }, [post.expiresAt, timerColor]);

  const renderContent = () => {
    if (isDecrypting) {
      return <div className="text-sm text-gray-400 italic">Decrypting encrypted post...</div>;
    }

    if (decryptError) {
      return <div className="text-sm text-gray-500">[Encrypted content - decryption failed]</div>;
    }

    const safeContent = post.isEncrypted ? decryptedContent : post.content;

    return (
      <div
        className="text-gray-200 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: parseMarkdown(safeContent || '') }}
      />
    );
  };

  const isHighlighted = Boolean(post.isHighlighted && post.highlightedUntil && post.highlightedUntil > Date.now());
  const crossCampusActive = Boolean(
    Array.isArray(post.crossCampusBoosts) &&
      post.crossCampusBoosts.length > 0 &&
      post.crossCampusUntil &&
      post.crossCampusUntil > Date.now()
  );
  const extendedHours = post.extendedLifetimeHours ?? 0;

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`glass p-6 space-y-4 relative overflow-hidden ${
          isHighlighted ? 'ring-2 ring-yellow-400/50 shadow-glow' : ''
        }`}
      >
        <div className="absolute top-4 right-4 flex flex-col items-end space-y-2">
          {post.isCrisisFlagged && (
            <button
              onClick={() => {
                setPendingPost(null);
                setShowCrisisModal(true);
              }}
              className="flex items-center space-x-1 text-xs text-rose-200 bg-rose-500/20 px-2 py-1 rounded-full hover:bg-rose-500/30 transition-colors"
              title="View crisis support resources"
            >
              <span role="img" aria-label="sos">
                🆘
              </span>
              <span>Support Available</span>
            </button>
          )}

          {isUnderReview && !isHidden && (
            <div className="flex items-center space-x-1 text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded-full">
              <Flag className="w-3 h-3" />
              <span>Under review</span>
            </div>
          )}

          {isHidden && (
            <div className="flex items-center space-x-1 text-xs text-red-300 bg-red-500/20 px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              <span>Hidden</span>
            </div>
          )}

          {timerDisplay && (
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${timerClasses}`}>
              <span>{post.expiresAt ? '⏳' : '♾️'}</span>
              <span>{timerDisplay}</span>
            </div>
          )}

          {post.isPinned && (
            <div className="flex items-center space-x-1 text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
              <Pin className="w-3 h-3" />
              <span>Personal</span>
            </div>
          )}

          {post.isCommunityPinned && (
            <div className="flex items-center space-x-1 text-xs text-orange-400 bg-orange-500/20 px-2 py-1 rounded-full">
              <Pin className="w-3 h-3" />
              <span>Community</span>
            </div>
          )}

          {isHighlighted && (
            <div className="flex items-center space-x-1 text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>Highlighted</span>
              {highlightLabel && highlightLabel !== 'Expired' && (
                <span className="text-xs opacity-75">({highlightLabel} left)</span>
              )}
            </div>
          )}

          {crossCampusActive && (
            <div className="flex items-center space-x-1 text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">
              <Zap className="w-3 h-3" />
              <span>Cross-Campus</span>
              {crossCampusLabel && crossCampusLabel !== 'Expired' && (
                <span className="text-xs opacity-75">({crossCampusLabel} left)</span>
              )}
            </div>
          )}

          {extendedHours > 0 && (
            <div className="flex items-center space-x-1 text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              <span>+{extendedHours}h</span>
            </div>
          )}
        </div>

        {shouldBlur && (
          <div className="absolute inset-0 backdrop-blur-xl bg-black/50 rounded-2xl flex flex-col items-center justify-center z-10 space-y-3">
            {isHidden ? (
              <>
                <EyeOff className="w-8 h-8 text-red-500" />
                <p className="text-sm text-red-500 font-medium">
                  🚫 Content Hidden
                </p>
                <p className="text-xs text-gray-400 text-center max-w-xs">
                  {post.hiddenReason || 'Multiple reports received'}
                </p>
              </>
            ) : isReportBlur || isUnderReview ? (
              <>
                <Flag className="w-8 h-8 text-yellow-500" />
                <p className="text-sm text-yellow-500 font-medium">⚠️ Content under review</p>
                <p className="text-xs text-gray-400">This content has been reported multiple times</p>
              </>
            ) : isModerationBlur ? (
              <>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <p className="text-sm text-orange-500 font-medium">⚠️ May contain profanity</p>
                <p className="text-xs text-gray-400">{post.blurReason || 'Content filtered for language'}</p>
              </>
            ) : null}
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
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-white">{post.studentId}</p>
                <RankChip rank={authorRank} size="sm" />
                {post.isEncrypted && (
                  <span className="flex items-center space-x-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                    <Lock className="w-3 h-3" />
                    <span>Encrypted</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-400">
                  {formatTimeAgo(post.createdAt)}
                  {post.isEdited && <span className="ml-1 text-gray-500">(edited)</span>}
                </p>
                {authorBadges.length > 0 && (
                  <div className="flex items-center gap-1">
                    {authorBadges.map((badge) => (
                      <span
                        key={badge.id}
                        className="text-xs"
                        title={badge.name}
                      >
                        {badge.icon}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
                onClick={handlePin}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={post.isPinned ? 'Unpin post' : 'Pin post (25 VOICE)'}
              >
                <Pin
                  className={`w-4 h-4 ${
                    post.isPinned ? 'text-purple-400 fill-purple-400' : 'text-gray-400'
                  }`}
                />
              </motion.button>
            </div>
          )}

          {isModerator && !isOwnPost && (
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => post.isCommunityPinned ? unpinCommunityPost(post.id) : pinCommunityPost(post.id)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={post.isCommunityPinned ? 'Unpin from community' : 'Pin to community'}
              >
                <Pin
                  className={`w-4 h-4 ${
                    post.isCommunityPinned ? 'text-orange-400 fill-orange-400' : 'text-gray-400'
                  }`}
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const reason = prompt('Reason for deleting this post:');
                  if (reason) {
                    deleteCommunityPost(post.id, reason);
                  }
                }}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Delete post as moderator"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const reason = prompt('Reason for warning this member:');
                  if (reason) {
                    warnCommunityMember(post.studentId, reason);
                  }
                }}
                className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors"
                title="Warn member"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const reason = prompt('Reason for banning this member:');
                  if (reason) {
                    banCommunityMember(post.studentId, reason);
                  }
                }}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Ban member"
              >
                <Ban className="w-4 h-4 text-red-400" />
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
                    setEditContent(decryptedContent || post.content);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={
                    editContent.trim().length < 10 ||
                    editContent.trim().length > 1000 ||
                    isSaving
                  }
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all flex items-center space-x-2"
                >
                  {isSaving && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          renderContent()
        )}

        <ReactionBar
          reactions={post.reactions}
          onReact={(reactionType) => useStore.getState().addReaction(post.id, reactionType)}
        />

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center space-x-1 text-sm text-gray-400">
            <span>
              {totalReactions > 0 ? totalReactions : 'No'} reaction{totalReactions !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-400">
            <span>
              {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
            </span>
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
            {isOwnPost && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleHighlight}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                  isHighlighted
                    ? 'bg-yellow-500/25 text-yellow-200'
                    : 'bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isHighlighted ? 'Highlighted' : 'Highlight (15 VOICE)'}</span>
              </motion.button>
            )}

            {isOwnPost && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCrossCampusBoost}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                  crossCampusActive
                    ? 'bg-blue-500/25 text-blue-200'
                    : 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>{crossCampusActive ? 'Reboost (50 VOICE)' : 'Cross-Campus (50 VOICE)'}</span>
              </motion.button>
            )}

            {canExtend && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExtend}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all text-xs font-medium"
              >
                <span>⏱️</span>
                <span>Extend (10 VOICE)</span>
              </motion.button>
            )}

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
                className={`w-4 h-4 ${isBookmarked ? 'fill-primary text-primary' : 'text-gray-400'}`}
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
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTipModal(true)}
                  className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-primary hover:from-purple-500/30 hover:to-blue-500/30 transition-all text-xs font-medium"
                  title="Send a tip"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Tip</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Report post"
                >
                  <Flag className="w-4 h-4 text-gray-400" />
                </motion.button>
              </>
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

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        userId={post.studentId}
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
