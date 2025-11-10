import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmotionAnalysisPreview from '../EmotionAnalysisPreview';
import type { PostEmotionAnalysis } from '../../../lib/store';

describe('EmotionAnalysisPreview Component', () => {
  const mockAnalysis: PostEmotionAnalysis = {
    emotion: 'Happy',
    confidence: 0.85,
    source: 'api',
    detectedAt: Date.now(),
  };

  const mockTranscript = 'This is a happy and positive recording transcript!';

  it('should render with emotion analysis data', () => {
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    expect(screen.getByText('Emotion Analysis Preview')).toBeInTheDocument();
    expect(screen.getByText('Happy')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(mockTranscript)).toBeInTheDocument();
  });

  it('should display emotion icon based on emotion type', () => {
    const emoticons = [
      { emotion: 'Happy' as const, icon: '😊' },
      { emotion: 'Sad' as const, icon: '😢' },
      { emotion: 'Anxious' as const, icon: '😰' },
      { emotion: 'Angry' as const, icon: '😠' },
      { emotion: 'Neutral' as const, icon: '😐' },
    ];

    for (const { emotion, icon } of emoticons) {
      const { rerender } = render(
        <EmotionAnalysisPreview
          analysis={{ ...mockAnalysis, emotion }}
          transcript={mockTranscript}
          onConfirm={vi.fn()}
          onDiscard={vi.fn()}
        />
      );

      expect(screen.getByText(icon)).toBeInTheDocument();
      rerender(<></>);
    }
  });

  it('should display confidence percentage', () => {
    const testCases = [
      { confidence: 0.95, label: '95%' },
      { confidence: 0.5, label: '50%' },
      { confidence: 0.1, label: '10%' },
    ];

    for (const testCase of testCases) {
      const { rerender } = render(
        <EmotionAnalysisPreview
          analysis={{ ...mockAnalysis, confidence: testCase.confidence }}
          transcript={mockTranscript}
          onConfirm={vi.fn()}
          onDiscard={vi.fn()}
        />
      );

      expect(screen.getByText(testCase.label)).toBeInTheDocument();
      rerender(<></>);
    }
  });

  it('should display supportive tip based on emotion', () => {
    const emotionTips = [
      {
        emotion: 'Happy' as const,
        tipFragment: 'Share your joy',
      },
      {
        emotion: 'Sad' as const,
        tipFragment: "It's okay to feel sad",
      },
      {
        emotion: 'Anxious' as const,
        tipFragment: 'Your concerns are valid',
      },
      {
        emotion: 'Angry' as const,
        tipFragment: 'Channel your feelings constructively',
      },
      {
        emotion: 'Neutral' as const,
        tipFragment: 'Your perspective matters',
      },
    ];

    for (const { emotion, tipFragment } of emotionTips) {
      const { rerender } = render(
        <EmotionAnalysisPreview
          analysis={{ ...mockAnalysis, emotion }}
          transcript={mockTranscript}
          onConfirm={vi.fn()}
          onDiscard={vi.fn()}
        />
      );

      expect(screen.getByText(new RegExp(tipFragment))).toBeInTheDocument();
      rerender(<></>);
    }
  });

  it('should allow editing transcript', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    // Click edit button
    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    // Find textarea
    const textarea = screen.getByDisplayValue(mockTranscript);
    expect(textarea).toBeInTheDocument();

    // Edit the transcript
    const newTranscript = 'This is an updated transcript!';
    await user.clear(textarea);
    await user.type(textarea, newTranscript);

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    expect(onConfirm).toHaveBeenCalledWith(newTranscript, mockAnalysis);
  });

  it('should cancel editing without changes', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    const textarea = screen.getByDisplayValue(mockTranscript);
    const newTranscript = 'This will be cancelled';
    await user.clear(textarea);
    await user.type(textarea, newTranscript);

    const cancelButton = screen.getAllByText('Cancel')[0];
    await user.click(cancelButton);

    // Should not call confirm
    expect(onConfirm).not.toHaveBeenCalled();
    // Should revert to original transcript
    expect(screen.getByText(mockTranscript)).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    const confirmButton = screen.getByText('Confirm & Post');
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith(mockTranscript, mockAnalysis);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('should call onDiscard when redo button clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    const redoButton = screen.getByTitle('Discard recording');
    await user.click(redoButton);

    expect(onDiscard).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should disable buttons when isLoading is true', () => {
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
        isLoading={true}
      />
    );

    // Find the button containing the Submitting text
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find(btn => btn.textContent?.includes('Submitting')) as HTMLButtonElement | undefined;
    expect(confirmButton).toBeDefined();
    if (confirmButton) {
      expect(confirmButton).toBeDisabled();
    }
  });

  it('should display emotion analysis source', () => {
    const sources = ['api' as const, 'offline' as const, 'manual' as const];
    const sourceLabels = ['AI Analysis', 'Local Analysis', 'Manual'];

    for (let i = 0; i < sources.length; i++) {
      const { rerender } = render(
        <EmotionAnalysisPreview
          analysis={{ ...mockAnalysis, source: sources[i] }}
          transcript={mockTranscript}
          onConfirm={vi.fn()}
          onDiscard={vi.fn()}
        />
      );

      expect(screen.getByText(sourceLabels[i])).toBeInTheDocument();
      rerender(<></>);
    }
  });

  it('should display character count while editing', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    const initialLength = mockTranscript.length;

    // Character count should be displayed
    expect(screen.getByText(new RegExp(`${initialLength}/1000`))).toBeInTheDocument();
  });

  it('should not allow saving with very short transcript', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    const textarea = screen.getByDisplayValue(mockTranscript);
    await user.clear(textarea);
    await user.type(textarea, 'Short');

    const buttons = screen.getAllByRole('button');
    const saveButton = buttons.find(btn => btn.textContent?.includes('Save Changes')) as HTMLButtonElement | undefined;
    expect(saveButton).toBeDefined();
    if (saveButton) {
      expect(saveButton).toBeDisabled();
    }
  });

  it('should display transcript in non-editing mode', () => {
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    const transcriptDisplay = screen.getByText(mockTranscript);
    expect(transcriptDisplay).toHaveClass('bg-surface/50');
  });

  it('should pass edited transcript to onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();
    const editedTranscript = 'This is the edited transcript';

    render(
      <EmotionAnalysisPreview
        analysis={mockAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    const textarea = screen.getByDisplayValue(mockTranscript);
    await user.clear(textarea);
    await user.type(textarea, editedTranscript);

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    expect(onConfirm).toHaveBeenCalledWith(editedTranscript, mockAnalysis);
  });

  it('should preserve emotion analysis metadata', () => {
    const customAnalysis: PostEmotionAnalysis = {
      emotion: 'Anxious',
      confidence: 0.72,
      source: 'offline',
      detectedAt: 1234567890,
    };

    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <EmotionAnalysisPreview
        analysis={customAnalysis}
        transcript={mockTranscript}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />
    );

    const confirmButton = screen.getByText('Confirm & Post');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith(mockTranscript, customAnalysis);
  });
});
