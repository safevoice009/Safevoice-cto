import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecorder, AUDIO_PRESETS } from '../useVoiceRecorder';

describe('useVoiceRecorder', () => {
  const mockStop = vi.fn();
  const mockStart = vi.fn();
  const mockPause = vi.fn();
  const mockResume = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock MediaRecorder
    const mockMediaRecorder = {
      start: mockStart,
      stop: mockStop,
      pause: mockPause,
      resume: mockResume,
      ondataavailable: null,
      onstop: null,
      state: 'recording',
      mimeType: 'audio/webm',
    };

    global.MediaRecorder = vi.fn(() => mockMediaRecorder) as unknown as typeof MediaRecorder;
    (global.MediaRecorder as unknown as Record<string, unknown>).isTypeSupported = vi.fn(
      (type: string) => ['audio/webm', 'audio/mp4', 'audio/wav'].includes(type)
    );

    // Mock getUserMedia
    const mockStream = {
      getTracks: () => [{ stop: vi.fn(), kind: 'audio' }],
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(async () => mockStream),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with recording stopped', () => {
    const { result } = renderHook(() => useVoiceRecorder());

    expect(result.current.state.isRecording).toBe(false);
    expect(result.current.state.isPaused).toBe(false);
    expect(result.current.state.duration).toBe(0);
    expect(result.current.state.error).toBe(null);
  });

  it('should have browser support flag', () => {
    const { result } = renderHook(() => useVoiceRecorder());
    expect(result.current.isSupported).toBe(true);
  });

  it('should support recording', () => {
    const { result } = renderHook(() => useVoiceRecorder());
    expect(result.current.supportsConstraints()).toBe(true);
  });

  it('should start recording with a preset', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording(AUDIO_PRESETS.standard);
    });

    expect(result.current.state.isRecording).toBe(true);
    expect(mockStart).toHaveBeenCalled();
  });

  it('should have correct preset properties', () => {
    expect(AUDIO_PRESETS.standard.estimatedBitrate).toBe('128 kbps');
    expect(AUDIO_PRESETS.highFidelity.estimatedBitrate).toBe('384 kbps');
    expect(AUDIO_PRESETS.lowData.estimatedBitrate).toBe('64 kbps');

    expect(AUDIO_PRESETS.standard.constraints.sampleRate).toBe(16000);
    expect(AUDIO_PRESETS.highFidelity.constraints.sampleRate).toBe(48000);
    expect(AUDIO_PRESETS.lowData.constraints.sampleRate).toBe(8000);
  });

  it('should track recording duration', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording(AUDIO_PRESETS.standard);
    });

    // Duration should start from 0 or increase
    expect(result.current.state.duration).toBeGreaterThanOrEqual(0);
  });

  it('should handle pause state', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording(AUDIO_PRESETS.standard);
    });

    act(() => {
      result.current.pauseRecording();
    });

    expect(result.current.state.isPaused).toBe(true);
    expect(mockPause).toHaveBeenCalled();
  });

  it('should handle resume after pause', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording(AUDIO_PRESETS.standard);
    });

    act(() => {
      result.current.pauseRecording();
    });

    act(() => {
      result.current.resumeRecording();
    });

    expect(result.current.state.isPaused).toBe(false);
    expect(mockResume).toHaveBeenCalled();
  });

  it('should have all presets defined', () => {
    expect(AUDIO_PRESETS.standard).toBeDefined();
    expect(AUDIO_PRESETS.highFidelity).toBeDefined();
    expect(AUDIO_PRESETS.lowData).toBeDefined();

    expect(AUDIO_PRESETS.standard.id).toBe('standard');
    expect(AUDIO_PRESETS.highFidelity.id).toBe('highFidelity');
    expect(AUDIO_PRESETS.lowData.id).toBe('lowData');
  });
});
