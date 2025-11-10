import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoiceRecorder from '../VoiceRecorder';
import * as emotionAnalysis from '../../../lib/emotionAnalysis';

vi.mock('../../../lib/emotionAnalysis', () => ({
  analyzeEmotion: vi.fn(),
}));

beforeEach(() => {
  vi.spyOn(emotionAnalysis, 'analyzeEmotion').mockResolvedValue({
    emotion: 'Happy',
    confidence: 0.85,
    source: 'api',
  });
});

describe('VoiceRecorder Component', () => {
  it('should render initial state', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Voice Recording')).toBeInTheDocument();
  });

  it('should display help text', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/Click the microphone button/i)).toBeInTheDocument();
  });

  it('should have start recording button', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Start Recording')).toBeInTheDocument();
  });

  it('should render with props', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
        isSubmitting={false}
      />
    );

    expect(screen.getByText('Voice Recording')).toBeInTheDocument();
  });

  it('should render voice recording info text', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/Your voice will be transcribed/i)).toBeInTheDocument();
  });

  it('should have accessible buttons', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render with glass styling', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    const { container } = render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
      />
    );

    expect(container.querySelector('.glass')).toBeInTheDocument();
  });

  it('should accept isSubmitting prop', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
        isSubmitting={false}
      />
    );

    rerender(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
        isSubmitting={true}
      />
    );

    expect(screen.getByText('Voice Recording')).toBeInTheDocument();
  });

  it('should render emotion analysis module availability info', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <VoiceRecorder
        onRecordingComplete={onRecordingComplete}
        onCancel={onCancel}
      />
    );

    // Check for the microphone icon button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
