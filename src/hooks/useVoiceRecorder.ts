import { useState, useRef, useCallback } from 'react';

export interface AudioConstraints {
  sampleRate?: number;
  channelCount?: number;
}

export interface RecorderPreset {
  id: string;
  name: string;
  description: string;
  constraints: AudioConstraints;
  estimatedBitrate: string;
}

export const AUDIO_PRESETS: Record<string, RecorderPreset> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced quality and file size',
    constraints: {
      sampleRate: 16000,
      channelCount: 1,
    },
    estimatedBitrate: '128 kbps',
  },
  highFidelity: {
    id: 'highFidelity',
    name: 'High Fidelity',
    description: 'Best audio quality',
    constraints: {
      sampleRate: 48000,
      channelCount: 2,
    },
    estimatedBitrate: '384 kbps',
  },
  lowData: {
    id: 'lowData',
    name: 'Low Data',
    description: 'Minimal file size',
    constraints: {
      sampleRate: 8000,
      channelCount: 1,
    },
    estimatedBitrate: '64 kbps',
  },
};

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export interface UseVoiceRecorderReturn {
  state: RecorderState;
  startRecording: (preset: RecorderPreset) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  isSupported: boolean;
  supportsConstraints: () => boolean;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const isSupported = useCallback(() => {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.getUserMedia !== 'undefined' &&
      typeof MediaRecorder !== 'undefined'
    );
  }, []);

  const supportsConstraints = useCallback((): boolean => {
    if (!isSupported()) return false;

    // Check if browser supports getUserMedia with audio constraints
    if (!navigator.mediaDevices?.getUserMedia) return false;

    // Basic capability check - most modern browsers support audio recording
    return (
      typeof MediaRecorder !== 'undefined' && (
        MediaRecorder.isTypeSupported('audio/webm') || 
        MediaRecorder.isTypeSupported('audio/mp4') ||
        MediaRecorder.isTypeSupported('audio/wav')
      )
    );
  }, [isSupported]);

  const startRecording = useCallback(
    async (preset: RecorderPreset) => {
      if (!isSupported()) {
        setState((prev) => ({
          ...prev,
          error: 'Audio recording is not supported in this browser',
        }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, error: null }));

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: preset.constraints.sampleRate,
            channelCount: preset.constraints.channelCount,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } as MediaTrackConstraints,
        });

        streamRef.current = stream;

        // Determine the best MIME type for this browser
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
        startTimeRef.current = Date.now();

        setState((prev) => ({
          ...prev,
          isRecording: true,
          isPaused: false,
          duration: 0,
          error: null,
        }));

        // Update duration every 100ms
        timerRef.current = setInterval(() => {
          setState((prev) => ({
            ...prev,
            duration: Date.now() - startTimeRef.current,
          }));
        }, 100);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to start recording';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        
        // Clean up stream on error
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }
    },
    [isSupported]
  );

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
        }));
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType });
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
        }));

        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState((prev) => ({
        ...prev,
        isPaused: true,
      }));
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now() - state.duration;

      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Date.now() - startTimeRef.current,
        }));
      }, 100);

      setState((prev) => ({
        ...prev,
        isPaused: false,
      }));
    }
  }, [state.duration]);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isSupported: isSupported(),
    supportsConstraints,
  };
}
