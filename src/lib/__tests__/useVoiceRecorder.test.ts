import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  static shouldThrowOnStart = false;

  continuous = false;
  interimResults = false;
  lang = 'en-US';

  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;

  start = vi.fn(() => {
    if (MockSpeechRecognition.shouldThrowOnStart) {
      throw new Error('Failed to start');
    }
  });
  stop = vi.fn(() => {
    this.onend?.();
  });
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];

  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  stream: MediaStream;

  onstart: (() => void) | null = null;
  onstop: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  ondataavailable: ((event: any) => void) | null = null;

  start = vi.fn(() => {
    this.state = 'recording';
    this.onstart?.();
  });

  stop = vi.fn(() => {
    this.state = 'inactive';
    this.onstop?.();
  });

  pause = vi.fn(() => {
    this.state = 'paused';
    this.onpause?.();
  });

  resume = vi.fn(() => {
    this.state = 'recording';
    this.onresume?.();
  });

  constructor(stream: MediaStream) {
    this.stream = stream;
    MockMediaRecorder.instances.push(this);
  }
}

class MockAnalyser {
  fftSize = 2048;

  getByteTimeDomainData = vi.fn((array: Uint8Array) => {
    array.fill(128);
  });
}

class MockAudioContext {
  static instances: MockAudioContext[] = [];

  analyser = new MockAnalyser();

  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
  }));

  createAnalyser = vi.fn(() => this.analyser);

  close = vi.fn(() => Promise.resolve());

  constructor() {
    MockAudioContext.instances.push(this);
  }
}

describe('useVoiceRecorder', () => {
  let originalSpeechRecognition: any;
  let originalWebkitSpeechRecognition: any;
  let originalMediaRecorder: any;
  let originalAudioContext: any;
  let originalMediaDevices: MediaDevices | undefined;

  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockStream: MediaStream;

  beforeAll(() => {
    originalSpeechRecognition = (window as any).SpeechRecognition;
    originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;
    originalMediaRecorder = (window as any).MediaRecorder;
    originalAudioContext = (window as any).AudioContext;
    originalMediaDevices = navigator.mediaDevices;
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    MockSpeechRecognition.instances = [];
    MockSpeechRecognition.shouldThrowOnStart = false;
    MockMediaRecorder.instances = [];
    MockAudioContext.instances = [];

    (window as any).SpeechRecognition = undefined;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;

    mockTrackStop = vi.fn();
    mockStream = {
      getTracks: () => [{ stop: mockTrackStop }],
    } as unknown as MediaStream;

    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    (navigator as unknown as { mediaDevices?: MediaDevices }).mediaDevices = {
      getUserMedia: mockGetUserMedia,
    } as MediaDevices;

    (window as any).MediaRecorder = MockMediaRecorder;
    (window as any).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();

    if (originalSpeechRecognition === undefined) {
      delete (window as any).SpeechRecognition;
    } else {
      (window as any).SpeechRecognition = originalSpeechRecognition;
    }

    if (originalWebkitSpeechRecognition === undefined) {
      delete (window as any).webkitSpeechRecognition;
    } else {
      (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    }

    if (originalMediaRecorder === undefined) {
      delete (window as any).MediaRecorder;
    } else {
      (window as any).MediaRecorder = originalMediaRecorder;
    }

    if (originalAudioContext === undefined) {
      delete (window as any).AudioContext;
    } else {
      (window as any).AudioContext = originalAudioContext;
    }

    if (originalMediaDevices === undefined) {
      delete (navigator as any).mediaDevices;
    } else {
      (navigator as unknown as { mediaDevices?: MediaDevices }).mediaDevices =
        originalMediaDevices;
    }

    vi.restoreAllMocks();
  });

  it('starts and stops recording', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(MockSpeechRecognition.instances[0].start).toHaveBeenCalled();
    expect(MockMediaRecorder.instances[0].start).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.waveform.length).toBeGreaterThan(0);

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(mockTrackStop).toHaveBeenCalled();
  });

  it('stops when exceeding the maximum recording duration', async () => {
    const { result } = renderHook(() => useVoiceRecorder({ maxDurationMs: 1000 }));

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.timedOut).toBe(true);
    expect(result.current.error).toBe('Maximum recording length reached.');
    expect(result.current.isRecording).toBe(false);
  });

  it('aggregates partial and final transcripts', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: false,
            0: { transcript: 'Hello' },
          },
        ],
      } as any);
    });

    expect(result.current.partialTranscript).toBe('Hello');
    expect(result.current.transcript).toBe('');

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: { transcript: 'Hello there' },
          },
        ],
      } as any);
    });

    expect(result.current.partialTranscript).toBe('');
    expect(result.current.transcript).toBe('Hello there');

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: { transcript: 'General Kenobi' },
          },
        ],
      } as any);
    });

    expect(result.current.transcript).toBe('Hello there General Kenobi');
  });

  it('surfaces permission errors from getUserMedia', async () => {
    const deniedError = new DOMException('Permission denied', 'NotAllowedError');
    mockGetUserMedia.mockRejectedValueOnce(deniedError);

    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe('Microphone access was denied.');
    expect(result.current.isRecording).toBe(false);
  });

  it('handles speech recognition permission errors', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onerror?.({ error: 'not-allowed' });
    });

    expect(result.current.error).toBe('Microphone access was denied.');
    expect(result.current.isRecording).toBe(false);
  });

  it('falls back when speech recognition is not supported', async () => {
    delete (window as any).webkitSpeechRecognition;

    const fallbackTranscribe = vi.fn().mockResolvedValue('');
    const { result } = renderHook(() =>
      useVoiceRecorder({ serverTranscribe: fallbackTranscribe })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(fallbackTranscribe).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe(
      'Speech recognition is not supported in this browser. Falling back to server transcription.'
    );
    expect(result.current.usingFallback).toBe(true);
    expect(result.current.isRecording).toBe(false);
    expect(mockGetUserMedia).not.toHaveBeenCalled();
  });

  it('pauses and resumes recording', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.isPaused).toBe(false);

    const recorder = MockMediaRecorder.instances[0];
    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      result.current.pauseRecording();
    });

    expect(result.current.isPaused).toBe(true);
    expect(recorder.pause).toHaveBeenCalled();
    expect(recognition.stop).toHaveBeenCalled();

    recognition.start.mockClear();

    await act(async () => {
      await result.current.resumeRecording();
    });

    expect(result.current.isPaused).toBe(false);
    expect(recorder.resume).toHaveBeenCalled();
    expect(recognition.start).toHaveBeenCalled();
  });

  it('restarts speech recognition if it ends unexpectedly', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];
    recognition.start.mockClear();

    act(() => {
      recognition.onend?.();
    });

    expect(recognition.start).toHaveBeenCalledTimes(1);
  });

  it('handles no speech detected error', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onerror?.({ error: 'no-speech' });
    });

    expect(result.current.error).toBe('No speech detected.');
    expect(result.current.isRecording).toBe(false);
  });

  it('handles generic speech recognition errors', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onerror?.({ error: 'network', message: 'Network failure' });
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.isRecording).toBe(false);
  });

  it('handles fallback transcription error', async () => {
    delete (window as any).webkitSpeechRecognition;

    const fallbackTranscribe = vi
      .fn()
      .mockRejectedValue(new Error('Server unavailable'));
    const { result } = renderHook(() =>
      useVoiceRecorder({ serverTranscribe: fallbackTranscribe })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe('Fallback transcription is unavailable right now.');
    expect(result.current.usingFallback).toBe(true);
  });

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    unmount();

    expect(mockTrackStop).toHaveBeenCalled();
    expect(MockMediaRecorder.instances[0].stop).toHaveBeenCalled();
    expect(MockAudioContext.instances[0].close).toHaveBeenCalled();
  });

  it('resets all state when reset is called', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: { transcript: 'Some text' },
          },
        ],
      } as any);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.transcript).toBe('Some text');
    expect(result.current.waveform.length).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.transcript).toBe('');
    expect(result.current.partialTranscript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.waveform).toEqual([]);
    expect(result.current.timedOut).toBe(false);
  });

  it('limits waveform samples to the configured limit', async () => {
    const limit = 10;
    const { result } = renderHook(() =>
      useVoiceRecorder({ waveformSampleLimit: limit })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.waveform.length).toBeLessThanOrEqual(limit);
  });

  it('accepts custom language parameter', async () => {
    const { result } = renderHook(() => useVoiceRecorder({ lang: 'es-ES' }));

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];
    expect(recognition.lang).toBe('es-ES');
  });

  it('does not crash when AudioContext is unavailable', async () => {
    delete (window as any).AudioContext;

    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.waveform).toEqual([]);
  });

  it('surfaces start errors when recognition fails to initialize', async () => {
    MockSpeechRecognition.shouldThrowOnStart = true;

    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe('Unable to start speech recognition.');
    expect(result.current.isRecording).toBe(false);
  });

  it('prevents resume when not recording', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.resumeRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('prevents pause when already paused', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recorder = MockMediaRecorder.instances[0];
    recorder.pause.mockClear();

    act(() => {
      result.current.pauseRecording();
    });

    expect(recorder.pause).toHaveBeenCalledTimes(1);

    recorder.pause.mockClear();

    act(() => {
      result.current.pauseRecording();
    });

    expect(recorder.pause).not.toHaveBeenCalled();
  });

  it('handles permission-denied as a special error code', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition.onerror?.({ error: 'permission-denied' });
    });

    expect(result.current.error).toBe('Microphone access was denied.');
    expect(result.current.isRecording).toBe(false);
  });

  it('handles missing mediaDevices gracefully', async () => {
    delete (navigator as any).mediaDevices;

    const { result } = renderHook(() => useVoiceRecorder());

    expect(result.current.isSupported).toBe(false);
  });

  it('does not restart when recognition ends during pause intent', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    const recognition = MockSpeechRecognition.instances[0];
    recognition.start.mockClear();

    act(() => {
      result.current.pauseRecording();
    });

    act(() => {
      recognition.onend?.();
    });

    expect(recognition.start).not.toHaveBeenCalled();
  });

  it('aborts fallback transcription on stop', async () => {
    delete (window as any).webkitSpeechRecognition;

    let abortSignal: AbortSignal | null = null;
    const fallbackTranscribe = vi.fn((signal: AbortSignal) => {
      abortSignal = signal;
      return new Promise<string>((resolve) => {
        signal.addEventListener(
          'abort',
          () => {
            resolve('');
          },
          { once: true }
        );
      });
    });

    const { result } = renderHook(() =>
      useVoiceRecorder({ serverTranscribe: fallbackTranscribe })
    );

    const startPromise = act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await startPromise;

    expect(abortSignal?.aborted).toBe(true);
  });
});
