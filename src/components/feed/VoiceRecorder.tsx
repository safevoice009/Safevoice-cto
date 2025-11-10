import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { analyzeEmotion } from '../../lib/emotionAnalysis';
import type { PostEmotionAnalysis } from '../../lib/store';
import EmotionAnalysisPreview from './EmotionAnalysisPreview';

interface VoiceRecorderProps {
  onRecordingComplete: (transcript: string, analysis: PostEmotionAnalysis) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  isSubmitting = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotion, setEmotion] = useState<PostEmotionAnalysis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        
        // For now, use a mock transcript
        // In a real app, you'd use speech-to-text API
        const mockTranscript = 'This is a test recording transcript. The emotion analysis will detect the sentiment from this text.';
        setTranscript(mockTranscript);

        // Analyze emotion
        setIsAnalyzing(true);
        try {
          const analysis = await analyzeEmotion(mockTranscript, { useOfflineOnly: true });
          setEmotion({
            ...analysis,
            detectedAt: Date.now(),
          });
        } catch (err) {
          console.error('Emotion analysis failed:', err);
          toast.error('Failed to analyze emotion. Please try again.');
          setTranscript('');
        } finally {
          setIsAnalyzing(false);
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        resolve();
      };

      mediaRecorder.stop();
    });
  };

  const handleConfirm = (editedTranscript: string, analysis: PostEmotionAnalysis) => {
    onRecordingComplete(editedTranscript, analysis);
  };

  const handleDiscard = () => {
    setTranscript('');
    setEmotion(null);
    setIsRecording(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleCancel = () => {
    handleDiscard();
    onCancel();
  };

  if (emotion && transcript) {
    return (
      <EmotionAnalysisPreview
        analysis={emotion}
        transcript={transcript}
        onConfirm={handleConfirm}
        onDiscard={handleDiscard}
        isLoading={isSubmitting}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass p-6 space-y-4 border border-white/10"
    >
      {/* Recording Status */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Voice Recording</h3>
        <p className="text-sm text-gray-400">
          {isRecording
            ? 'Recording in progress... Click stop when done'
            : isAnalyzing
            ? 'Analyzing your recording...'
            : 'Click the microphone button to start recording'}
        </p>
      </div>

      {/* Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 bg-red-500 rounded-full"
            />
            <p className="text-sm text-red-400 font-medium">Recording...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Waveform Visualization */}
      {(isRecording || isAnalyzing) && (
        <div className="flex items-center justify-center space-x-1 py-6 bg-surface/50 rounded-lg">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: ['20px', '40px', '60px', '40px', '20px'] }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                repeat: Infinity,
              }}
              className="w-1 bg-primary rounded-full"
            />
          ))}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center space-x-3 pt-2">
        {!isRecording && !isAnalyzing && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-white rounded-lg hover:shadow-glow transition-all"
            >
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              className="p-3 text-gray-300 border border-white/20 rounded-lg hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </>
        )}

        {isRecording && (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
            >
              <Square className="w-5 h-5" />
              <span>Stop Recording</span>
            </motion.button>
          </>
        )}

        {isAnalyzing && (
          <div className="flex-1 flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-300">Analyzing...</span>
          </div>
        )}
      </div>

      {/* Info Text */}
      <p className="text-xs text-gray-500">
        💡 Your voice will be transcribed and analyzed for emotional content. This helps us understand your wellbeing better.
      </p>
    </motion.div>
  );
}
