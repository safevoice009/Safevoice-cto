import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Pause, Play, AlertCircle, Volume2 } from 'lucide-react';
import { useVoiceRecorder, AUDIO_PRESETS, type RecorderPreset } from '../../hooks/useVoiceRecorder';
import { useAudioPresetStore } from '../../lib/audioPresetStore';
import toast from 'react-hot-toast';

interface VoiceRecorderPanelProps {
  onRecordingComplete?: (blob: Blob) => void;
  onCancel?: () => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getPresetDescription(preset: RecorderPreset): string {
  if (preset.id === 'standard') {
    return 'Balanced quality for most uses';
  }
  if (preset.id === 'highFidelity') {
    return 'Crystal clear audio with larger file size';
  }
  return 'Compressed audio for minimal data usage';
}

export default function VoiceRecorderPanel({
  onRecordingComplete,
  onCancel,
}: VoiceRecorderPanelProps) {
  const [isSelectingPreset, setIsSelectingPreset] = useState(true);
  const [selectedPresetForRecording, setSelectedPresetForRecording] = useState<RecorderPreset | null>(null);
  
  const { selectedPreset, setSelectedPreset } = useAudioPresetStore();
  const {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isSupported,
    supportsConstraints,
  } = useVoiceRecorder();

  const presetOptions = Object.values(AUDIO_PRESETS);

  const handlePresetSelect = useCallback((preset: RecorderPreset) => {
    if (!supportsConstraints()) {
      toast.error('Your browser does not support this audio quality preset');
      return;
    }

    setSelectedPreset(preset.id as 'standard' | 'highFidelity' | 'lowData');
    setSelectedPresetForRecording(preset);
    setIsSelectingPreset(false);

    const handleRecording = async () => {
      try {
        await startRecording(preset);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
        toast.error(errorMessage);
        setIsSelectingPreset(true);
      }
    };

    handleRecording();
  }, [startRecording, setSelectedPreset, supportsConstraints]);

  const handleStopRecording = useCallback(async () => {
    const blob = await stopRecording();
    if (blob) {
      onRecordingComplete?.(blob);
      toast.success('Recording saved successfully');
    }
    setIsSelectingPreset(true);
  }, [stopRecording, onRecordingComplete]);

  const handleCancel = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    }
    setIsSelectingPreset(true);
    onCancel?.();
  }, [state.isRecording, stopRecording, onCancel]);

  if (!isSupported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">
              Audio recording not supported
            </p>
            <p className="text-xs text-red-200 mt-1">
              Your browser doesn't support audio recording. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <AnimatePresence mode="wait">
        {isSelectingPreset ? (
          <motion.div
            key="preset-selection"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-3"
          >
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Select Audio Quality
              </h3>
              <div className="space-y-2">
                {presetOptions.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    disabled={!supportsConstraints()}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      selectedPreset === preset.id
                        ? 'bg-primary/20 border-primary text-white'
                        : 'bg-surface border-white/10 text-gray-300 hover:border-white/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={!supportsConstraints() ? 'Not supported by your browser' : ''}
                  >
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {getPresetDescription(preset)} • {preset.estimatedBitrate}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="recording"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            {selectedPresetForRecording && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-xs font-medium text-primary">
                  Recording with {selectedPresetForRecording.name} preset
                </p>
              </div>
            )}

            {state.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{state.error}</p>
              </div>
            )}

            <div className="flex items-center justify-between bg-surface border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono text-white">
                  {formatDuration(state.duration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {state.isRecording && !state.isPaused && (
                  <button
                    onClick={pauseRecording}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    title="Pause recording"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                )}
                {state.isRecording && state.isPaused && (
                  <button
                    onClick={resumeRecording}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    title="Resume recording"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleStopRecording}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
                  title="Stop recording"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>
            </div>

            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
