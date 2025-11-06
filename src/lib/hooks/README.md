# useVoiceRecorder Hook

A comprehensive React hook for speech-to-text recording using the Web Speech API with fallback support, waveform visualization, and robust error handling.

## Features

- ✅ **Web Speech API Integration**: Leverages browser native speech recognition
- ✅ **Feature Detection**: Automatically checks for browser support
- ✅ **Two-Minute Limit**: Built-in recording duration limit
- ✅ **Pause/Resume**: Full control over recording state
- ✅ **Waveform Data**: Real-time audio waveform samples for visualization
- ✅ **Fallback Support**: Configurable serverless transcription fallback
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Cleanup**: Automatic resource cleanup on unmount

## Installation

```tsx
import { useVoiceRecorder } from '@/lib/hooks';
```

## Usage

### Basic Example

```tsx
import { useVoiceRecorder } from '@/lib/hooks';

function VoiceRecorderComponent() {
  const {
    isRecording,
    isPaused,
    transcript,
    partialTranscript,
    error,
    waveform,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  } = useVoiceRecorder();

  if (!isSupported) {
    return <div>Speech recognition is not supported in your browser.</div>;
  }

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={pauseRecording} disabled={!isRecording || isPaused}>
        Pause
      </button>
      <button onClick={resumeRecording} disabled={!isRecording || !isPaused}>
        Resume
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop
      </button>
      <button onClick={reset}>Reset</button>

      {error && <div className="error">{error}</div>}
      
      <div>
        <strong>Transcript:</strong> {transcript}
      </div>
      <div>
        <em>Partial:</em> {partialTranscript}
      </div>

      <canvas ref={(canvas) => drawWaveform(canvas, waveform)} />
    </div>
  );
}
```

### With Custom Options

```tsx
const {
  isRecording,
  transcript,
  error,
  startRecording,
  stopRecording,
} = useVoiceRecorder({
  lang: 'es-ES', // Spanish
  maxDurationMs: 5 * 60 * 1000, // 5 minutes
  waveformSampleLimit: 512, // More detailed waveform
  serverTranscribe: async (signal) => {
    // Custom fallback transcription
    const response = await fetch('/api/transcribe', { signal });
    return response.text();
  },
});
```

### Drawing Waveform

```tsx
function drawWaveform(canvas: HTMLCanvasElement | null, samples: number[]) {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const barWidth = width / samples.length;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#4F46E5';

  samples.forEach((sample, i) => {
    const barHeight = sample * height;
    const x = i * barWidth;
    const y = height / 2 - barHeight / 2;
    ctx.fillRect(x, y, barWidth - 1, barHeight);
  });
}
```

## API

### Options

```typescript
interface UseVoiceRecorderOptions {
  lang?: string; // BCP 47 language tag (default: 'en-US')
  maxDurationMs?: number; // Maximum recording duration (default: 120000)
  waveformSampleLimit?: number; // Max waveform samples stored (default: 256)
  serverTranscribe?: (signal: AbortSignal) => Promise<string>; // Fallback transcription
}
```

### Return Value

```typescript
interface UseVoiceRecorderReturn {
  isSupported: boolean; // Whether browser supports speech recognition
  isRecording: boolean; // Currently recording
  isPaused: boolean; // Recording is paused
  transcript: string; // Final transcript
  partialTranscript: string; // Interim/partial transcript
  error: string | null; // User-friendly error message
  waveform: number[]; // Normalized waveform samples (0-1)
  timedOut: boolean; // Recording stopped due to timeout
  usingFallback: boolean; // Using fallback transcription
  startRecording: () => Promise<void>; // Start recording
  stopRecording: () => void; // Stop recording
  pauseRecording: () => void; // Pause recording
  resumeRecording: () => Promise<void>; // Resume recording
  reset: () => void; // Reset all state
}
```

## Error Messages

The hook provides user-friendly error messages for common scenarios:

- `"Microphone access was denied."` - User denied permission
- `"Speech recognition is not supported in this browser. Falling back to server transcription."` - No browser support
- `"Maximum recording length reached."` - Timeout occurred
- `"No speech detected."` - Speech recognition detected no speech
- `"Unable to start speech recognition."` - Failed to initialize
- `"Fallback transcription is unavailable right now."` - Fallback failed

## Browser Support

The hook supports:
- Chrome/Edge (with `webkitSpeechRecognition`)
- Safari (with `webkitSpeechRecognition`)
- Firefox (limited, experimental)

For unsupported browsers, the hook automatically falls back to server-side transcription if provided.

## Testing

The hook is thoroughly tested with mocked Web Speech API:

```bash
npm test src/lib/__tests__/useVoiceRecorder.test.ts
```

Tests cover:
- Start/stop recording
- Two-minute timeout
- Partial and final transcript aggregation
- Permission errors
- Pause/resume functionality
- Fallback behavior
- Cleanup on unmount
- Edge cases

## License

MIT
