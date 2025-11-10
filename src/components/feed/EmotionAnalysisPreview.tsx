import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Edit2, RefreshCw } from 'lucide-react';
import type { PostEmotionAnalysis } from '../../lib/store';
import type { EmotionType } from '../../lib/emotionAnalysis';

interface EmotionAnalysisPreviewProps {
  analysis: PostEmotionAnalysis;
  transcript: string;
  onConfirm: (editedTranscript: string, analysis: PostEmotionAnalysis) => void;
  onDiscard: () => void;
  isLoading?: boolean;
}

const EMOTION_COLORS: Record<EmotionType, string> = {
  Happy: 'from-yellow-500 to-orange-500',
  Sad: 'from-blue-500 to-indigo-500',
  Anxious: 'from-purple-500 to-pink-500',
  Angry: 'from-red-500 to-orange-500',
  Neutral: 'from-gray-500 to-slate-500',
};

const EMOTION_ICONS: Record<EmotionType, string> = {
  Happy: '😊',
  Sad: '😢',
  Anxious: '😰',
  Angry: '😠',
  Neutral: '😐',
};

const SUPPORTIVE_TIPS: Record<EmotionType, string> = {
  Happy: 'Share your joy! Positive emotions can inspire others and create a supportive community.',
  Sad: 'It\'s okay to feel sad. Opening up about your feelings can help you find support and connection.',
  Anxious: 'Your concerns are valid. Sharing can help others facing similar challenges feel less alone.',
  Angry: 'Channel your feelings constructively. Speaking up about issues creates positive change.',
  Neutral: 'Your perspective matters. Share what\'s on your mind.',
};

export default function EmotionAnalysisPreview({
  analysis,
  transcript,
  onConfirm,
  onDiscard,
  isLoading = false,
}: EmotionAnalysisPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(transcript);

  const handleConfirm = () => {
    onConfirm(editedTranscript, analysis);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTranscript(transcript);
    setIsEditing(false);
  };

  const confidencePercentage = Math.round(analysis.confidence * 100);
  const emotionIcon = EMOTION_ICONS[analysis.emotion];
  const emotionColors = EMOTION_COLORS[analysis.emotion];
  const supportiveTip = SUPPORTIVE_TIPS[analysis.emotion];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass p-6 space-y-4 border border-white/10"
    >
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Emotion Analysis Preview</h3>
        <p className="text-sm text-gray-400">
          We detected your emotional tone before posting
        </p>
      </div>

      {/* Emotion Detection Card */}
      <div className={`bg-gradient-to-r ${emotionColors} p-6 rounded-lg relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 bg-noise" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-4xl">{emotionIcon}</span>
            <div>
              <p className="text-white/90 text-sm font-medium">Detected Emotion</p>
              <p className="text-white text-xl font-bold">{analysis.emotion}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/90 text-sm font-medium">Confidence</p>
            <p className="text-white text-2xl font-bold">{confidencePercentage}%</p>
          </div>
        </div>
      </div>

      {/* Supportive Tip */}
      <div className="bg-surface/50 border border-white/10 rounded-lg p-4">
        <p className="text-sm text-gray-300">
          💡 <span className="font-medium">Supportive Tip:</span> {supportiveTip}
        </p>
      </div>

      {/* Transcript Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">
            Your Transcript
          </label>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-primary hover:text-primary/80 flex items-center space-x-1 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <textarea
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="w-full bg-surface border border-primary/50 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-primary transition-colors"
            rows={4}
            maxLength={1000}
          />
        ) : (
          <div className="bg-surface/50 border border-white/10 rounded-lg p-3 text-sm text-gray-300 min-h-20">
            {transcript}
          </div>
        )}

        <p className="text-xs text-gray-500 text-right">
          {editedTranscript.length}/1000
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 pt-2">
        {isEditing ? (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
              disabled={isLoading || editedTranscript.trim().length < 10}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-300 border border-white/20 rounded-lg hover:border-white/40 hover:text-white transition-colors"
            >
              Cancel
            </motion.button>
          </>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm & Post</span>
                </>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDiscard}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 text-gray-300 border border-white/20 rounded-lg hover:border-white/40 hover:text-white hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Redo</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDiscard}
              disabled={isLoading}
              className="p-2 text-gray-300 border border-white/20 rounded-lg hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Discard recording"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </>
        )}
      </div>

      {/* Emotion Source Info */}
      <div className="text-xs text-gray-500 flex items-center space-x-1">
        <span>Analysis source:</span>
        <span className="capitalize font-medium text-gray-400">
          {analysis.source === 'api' ? 'AI Analysis' : analysis.source === 'offline' ? 'Local Analysis' : 'Manual'}
        </span>
      </div>
    </motion.div>
  );
}
