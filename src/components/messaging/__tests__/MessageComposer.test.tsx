import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import MessageComposer from '../MessageComposer';
import * as useStoreModule from '../../../lib/store';

// Mock the store
vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(),
}));

describe('MessageComposer', () => {
  const mockSendMessage = vi.fn();
  const mockSetMentionSuggestions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useStoreModule.useStore as any).mockReturnValue({
      messagingConnected: true,
      pendingMessages: [],
      sendMessage: mockSendMessage,
      setMentionSuggestions: mockSetMentionSuggestions,
    });
  });

  it('should render message composer', () => {
    render(<MessageComposer threadId="thread-1" />);

    expect(screen.getByPlaceholderText(/Type a message/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
  });

  it('should show connection status when online', () => {
    render(<MessageComposer threadId="thread-1" />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show offline status when disconnected', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useStoreModule.useStore as any).mockReturnValue({
      messagingConnected: false,
      pendingMessages: [{ id: '1', threadId: 'thread-1', message: {}, createdAt: Date.now(), retryCount: 0 }],
      sendMessage: mockSendMessage,
      setMentionSuggestions: mockSetMentionSuggestions,
    });

    render(<MessageComposer threadId="thread-1" />);

    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(screen.getByText('1 pending')).toBeInTheDocument();
  });

  it('should disable send button when offline', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useStoreModule.useStore as any).mockReturnValue({
      messagingConnected: false,
      pendingMessages: [],
      sendMessage: mockSendMessage,
      setMentionSuggestions: mockSetMentionSuggestions,
    });

    render(<MessageComposer threadId="thread-1" />);

    const sendButton = screen.getByRole('button', { name: /Send/i });
    expect(sendButton).toBeDisabled();
  });

  it('should show character count', async () => {
    const user = await userEvent.setup();

    render(<MessageComposer threadId="thread-1" />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    await user.type(textarea, 'Test');

    expect(screen.getByText(/4 \/ 500 characters/)).toBeInTheDocument();
  });

  it('should send message on Enter key', async () => {
    const user = await userEvent.setup();

    mockSendMessage.mockResolvedValue(undefined);

    render(<MessageComposer threadId="thread-1" />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalled();
      expect(mockSendMessage.mock.calls[0][0]).toBe('thread-1');
      expect(mockSendMessage.mock.calls[0][1]).toBe('Test message');
    });
  });

  it('should not send message on Shift+Enter', async () => {
    const user = await userEvent.setup();

    render(<MessageComposer threadId="thread-1" />);

    const textarea = screen.getByPlaceholderText(/Type a message/);
    await user.type(textarea, 'Test message');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('should clear message after sending', async () => {
    const user = await userEvent.setup();

    mockSendMessage.mockResolvedValue(undefined);

    render(<MessageComposer threadId="thread-1" />);

    const textarea = screen.getByPlaceholderText(/Type a message/) as HTMLTextAreaElement;
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });
});
