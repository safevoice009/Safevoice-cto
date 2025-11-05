import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_MAX_DURATION_MS = 2 * 60 * 1000;
const DEFAULT_WAVEFORM_SAMPLE_LIMIT = 256;
const WAVEFORM_INTERVAL_MS = 100;

const PERMISSION_ERROR_MESSAGE = 'Microphone access was denied.';
const UNSUPPORTED_ERROR_MESSAGE =
  'Speech recognition is not supported in this browser. Falling back to server transcription.';
const FALLBACK_FAILURE_MESSAGE = 'Fallback transcription is unavailable right now.';
const TIMEOUT_ERROR_MESSAGE = 'Maximum recording length reached.';
const INTERRUPTED_ERROR_MESSAGE = 'Speech recognition was interrupted.';
const RESUME_ERROR_MESSAGE = 'Unable to resume speech recognition.';
const START_ERROR_MESSAGE = 'Unable to start speech recognition.';

interface RecognitionResultAlternative {
  transcript: string;
  confidence?: number;
}

interface RecognitionResult {
  isFinal: boolean;
  [index: number]: RecognitionResultAlternative | undefined;
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}

interface RecognitionErrorEvent {
  error: string;
  message?: string;
}

interface RecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => RecognitionInstance;

type StopReason = 'manual' | 'timeout' | 'error';

const defaultServerTranscription = async (_signal: AbortSignal): Promise<string> => '';

const getRecognitionConstructor = (): RecognitionConstructor | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const ctor =
    (window as unknown as { SpeechRecognition?: RecognitionConstructor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor })
      .webkitSpeechRecognition;

  return typeof ctor === 'function' ? ctor : null;
};

const getAudioContextConstructor = (): (typeof AudioContext) | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return typeof ctor === 'function' ? ctor : null;
};

export interface UseVoiceRecorderOptions {
  lang?: string;
  maxDurationMs?: number;
  waveformSampleLimit?: number;
  serverTranscribe?: (signal: AbortSignal) => Promise<string>;
}

export interface UseVoiceRecorderReturn {
  isSupported: boolean;
  isRecording: boolean;
  isPaused: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
  waveform: number[];
  timedOut: boolean;
  usingFallback: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => Promise<void>;
  reset: () => void;
}

export const useVoiceRecorder = (
  options?: UseVoiceRecorderOptions
): UseVoiceRecorderReturn => {
  const {
    lang = 'en-US',
    maxDurationMs = DEFAULT_MAX_DURATION_MS,
    waveformSampleLimit = DEFAULT_WAVEFORM_SAMPLE_LIMIT,
    serverTranscribe,
  } = options ?? {};

  const recognitionConstructor = useMemo(() => getRecognitionConstructor(), []);
  const audioContextConstructor = useMemo(() => getAudioContextConstructor(), []);

  const fallbackTranscribe = useMemo(
    () => serverTranscribe ?? defaultServerTranscription,
    [serverTranscribe]
  );

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    const hasRecognition = typeof recognitionConstructor === 'function';
    const hasMediaRecorder = typeof (window as Window & { MediaRecorder?: unknown }).MediaRecorder === 'function';
    const hasGetUserMedia = typeof navigator.mediaDevices?.getUserMedia === 'function';

    return Boolean(hasRecognition && hasMediaRecorder && hasGetUserMedia);
  }, [recognitionConstructor]);

  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const waveformIntervalRef = useRef<number | null>(null);
  const fallbackAbortRef = useRef<AbortController | null>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const pauseIntentRef = useRef(false);
  const finalTranscriptRef = useRef('');

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [timedOut, setTimedOut] = useState(false);
  const [usingFallback, setUsingFallback] = useState(!isSupported);

  useEffect(() => {
    setUsingFallback(!isSupported);
  }, [isSupported]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearWaveformInterval = useCallback(() => {
    if (waveformIntervalRef.current !== null) {
      clearInterval(waveformIntervalRef.current);
      waveformIntervalRef.current = null;
    }
  }, []);

  const teardownAudioPipeline = useCallback(() => {
    clearWaveformInterval();

    const recorder = mediaRecorderRef.current;
    if (recorder) {
      if (recorder.state === 'recording' || recorder.state === 'paused') {
        try {
          recorder.stop();
        } catch (err) {
          console.warn('Failed to stop MediaRecorder', err);
        }
      }
      mediaRecorderRef.current = null;
    }

    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.warn('Failed to stop media track', err);
        }
      });
      mediaStreamRef.current = null;
    }

    const audioContext = audioContextRef.current;
    if (audioContext) {
      audioContext
        .close()
        .catch(() => {
          /* noop */
        });
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, [clearWaveformInterval]);

  const updateWaveformFromAnalyser = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) {
      return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const amplitude = dataArray.reduce((acc, value) => acc + Math.abs(value - 128), 0);
    const normalized = bufferLength > 0 ? amplitude / (bufferLength * 128) : 0;

    setWaveform((prev) => {
      const next = [...prev, Number(normalized.toFixed(3))];
      if (next.length > waveformSampleLimit) {
        return next.slice(next.length - waveformSampleLimit);
      }
      return next;
    });
  }, [waveformSampleLimit]);

  const setupWaveform = useCallback(
    (stream: MediaStream) => {
      const AudioContextCtor = audioContextConstructor;
      if (!AudioContextCtor) {
        return;
      }

      try {
        const audioContext = new AudioContextCtor();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        updateWaveformFromAnalyser();
        waveformIntervalRef.current = window.setInterval(
          updateWaveformFromAnalyser,
          WAVEFORM_INTERVAL_MS
        );
      } catch (err) {
        console.warn('Failed to initialise audio context for waveform', err);
      }
    },
    [audioContextConstructor, updateWaveformFromAnalyser]
  );

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.stop();
    } catch (err) {
      console.warn('Failed to stop speech recognition', err);
    }

    recognitionRef.current = null;
  }, []);

  const stopRecordingInternal = useCallback(
    (reason: StopReason) => {
      clearTimer();
      teardownAudioPipeline();
      stopRecognition();

      if (fallbackAbortRef.current) {
        fallbackAbortRef.current.abort();
        fallbackAbortRef.current = null;
      }

      setTimedOut(reason === 'timeout');

      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      pauseIntentRef.current = false;
      setPartialTranscript('');
    },
    [clearTimer, stopRecognition, teardownAudioPipeline]
  );

  const handleRecognitionResult = useCallback((event: RecognitionEvent) => {
    let interimText = '';
    let finalText = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) {
        continue;
      }

      const alternative = result[0];
      const text = alternative?.transcript?.trim();
      if (!text) {
        continue;
      }

      if (result.isFinal) {
        finalText = finalText ? `${finalText} ${text}` : text;
      } else {
        interimText = interimText ? `${interimText} ${text}` : text;
      }
    }

    if (finalText) {
      finalTranscriptRef.current = finalTranscriptRef.current
        ? `${finalTranscriptRef.current} ${finalText}`.trim()
        : finalText;
      setTranscript(finalTranscriptRef.current);
    }

    setPartialTranscript(interimText.trim());
  }, []);

  const handleRecognitionError = useCallback(
    (event: RecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setError(PERMISSION_ERROR_MESSAGE);
      } else if (event.error === 'no-speech') {
        setError('No speech detected.');
      } else {
        setError(event.message ?? 'Speech recognition error occurred.');
      }

      stopRecordingInternal('error');
    },
    [stopRecordingInternal]
  );

  const handleRecognitionEnd = useCallback(() => {
    if (pauseIntentRef.current) {
      pauseIntentRef.current = false;
      return;
    }

    if (!isRecordingRef.current || isPausedRef.current) {
      return;
    }

    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.warn('Failed to restart speech recognition after interruption', err);
      setError(INTERRUPTED_ERROR_MESSAGE);
      stopRecordingInternal('error');
    }
  }, [stopRecordingInternal]);

  const startRecording = useCallback(async () => {
    if (!isSupported || !recognitionConstructor) {
      setUsingFallback(true);
      setError(UNSUPPORTED_ERROR_MESSAGE);
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      setTimedOut(false);
      setTranscript('');
      setPartialTranscript('');
      setWaveform([]);
      finalTranscriptRef.current = '';

      const controller = new AbortController();
      fallbackAbortRef.current = controller;

      try {
        const transcriptFromFallback = await fallbackTranscribe(controller.signal);
        if (!controller.signal.aborted && transcriptFromFallback) {
          setTranscript(transcriptFromFallback);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn('Fallback transcription failed', err);
          setError(FALLBACK_FAILURE_MESSAGE);
        }
      } finally {
        if (fallbackAbortRef.current === controller) {
          fallbackAbortRef.current = null;
        }
      }

      return;
    }

    if (isRecordingRef.current) {
      stopRecordingInternal('manual');
    }

    setError(null);
    setTimedOut(false);
    setPartialTranscript('');
    finalTranscriptRef.current = '';
    setWaveform([]);
    setUsingFallback(false);

    const recognition = new recognitionConstructor();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.onresult = handleRecognitionResult;
    recognition.onerror = handleRecognitionError;
    recognition.onend = handleRecognitionEnd;

    try {
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition failed to start', err);
      setError(START_ERROR_MESSAGE);
      stopRecordingInternal('error');
      return;
    }

    isRecordingRef.current = true;
    setIsRecording(true);
    setIsPaused(false);
    isPausedRef.current = false;

    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setError(TIMEOUT_ERROR_MESSAGE);
      stopRecordingInternal('timeout');
    }, maxDurationMs);

    try {
      const devices = navigator.mediaDevices;
      if (!devices?.getUserMedia) {
        setError(PERMISSION_ERROR_MESSAGE);
        stopRecordingInternal('error');
        return;
      }

      const stream = await devices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      if (recorder.state === 'inactive') {
        recorder.start();
      }

      setupWaveform(stream);
    } catch (err) {
      console.warn('Unable to access microphone', err);
      setError(PERMISSION_ERROR_MESSAGE);
      stopRecordingInternal('error');
    }
  }, [
    clearTimer,
    handleRecognitionEnd,
    handleRecognitionError,
    handleRecognitionResult,
    isSupported,
    lang,
    maxDurationMs,
    recognitionConstructor,
    setupWaveform,
    fallbackTranscribe,
    stopRecordingInternal,
  ]);

  const stopRecording = useCallback(() => {
    stopRecordingInternal('manual');
  }, [stopRecordingInternal]);

  const pauseRecording = useCallback(() => {
    if (!isRecordingRef.current || isPausedRef.current) {
      return;
    }

    pauseIntentRef.current = true;
    setIsPaused(true);
    isPausedRef.current = true;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.pause();
      } catch (err) {
        console.warn('Failed to pause MediaRecorder', err);
      }
    }

    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch (err) {
        console.warn('Failed to pause speech recognition', err);
      }
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!isRecordingRef.current || !isPausedRef.current) {
      return;
    }

    setIsPaused(false);
    isPausedRef.current = false;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      try {
        recorder.resume();
      } catch (err) {
        console.warn('Failed to resume MediaRecorder', err);
      }
    }

    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.warn('Failed to resume speech recognition', err);
      setError(RESUME_ERROR_MESSAGE);
      stopRecordingInternal('error');
    }
  }, [stopRecordingInternal]);

  const reset = useCallback(() => {
    stopRecordingInternal('manual');
    finalTranscriptRef.current = '';
    setTranscript('');
    setPartialTranscript('');
    setError(null);
    setWaveform([]);
    setTimedOut(false);
  }, [stopRecordingInternal]);

  useEffect(() => {
    return () => {
      stopRecordingInternal('manual');
    };
  }, [stopRecordingInternal]);

  return {
    isSupported,
    isRecording,
    isPaused,
    transcript,
    partialTranscript,
    error,
    waveform,
    timedOut,
    usingFallback,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  };
};

export default useVoiceRecorder;
