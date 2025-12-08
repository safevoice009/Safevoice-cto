import { useState, useEffect, useRef } from 'react';
import { Send, Wifi, WifiOff, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, type MentionSuggestion } from '../../lib/store';
import { getMentionSuggestionsFromInput, completeMention } from '../../lib/messaging/mentions';

interface MessageComposerProps {
  threadId: string;
  onMessageSent?: () => void;
}

export default function MessageComposer({ threadId, onMessageSent }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    messagingConnected,
    pendingMessages,
    sendMessage,
    setMentionSuggestions,
  } = useStore();

  useEffect(() => {
    const users = [
      { id: 'user#0001', username: 'Student', displayName: 'Student Alpha' },
      { id: 'user#0002', username: 'Mentor', displayName: 'Mentor Beta' },
      { id: 'user#0003', username: 'Helper', displayName: 'Helper Gamma' },
    ];

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.currentTarget.value);

      // Generate mention suggestions
      const sug = getMentionSuggestionsFromInput(e.currentTarget.value, users);
      setSuggestions(sug);
      setShowSuggestions(sug.length > 0);
      setMentionSuggestions(sug);
    };

    const currentRef = textAreaRef.current;
    if (currentRef) {
      const inputHandler = handleInput as unknown as EventListener;
      currentRef.addEventListener('input', inputHandler);
      return () => {
        currentRef.removeEventListener('input', inputHandler);
      };
    }
  }, [setMentionSuggestions]);

  const handleSelectSuggestion = (user: MentionSuggestion) => {
    const completed = completeMention(content, { username: user.username, id: user.id });
    setContent(completed);
    setSuggestions([]);
    setShowSuggestions(false);

    // Focus textarea and move cursor to end
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(completed.length, completed.length);
    }
  };

  const handleSend = async () => {
    if (!content.trim() || !messagingConnected) return;

    setIsLoading(true);
    try {
      await sendMessage(threadId, content.trim());
      setContent('');
      setSuggestions([]);
      setShowSuggestions(false);
      onMessageSent?.();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && messagingConnected) {
        handleSend();
      }
    }
  };

  const hasPendingMessages = pendingMessages.length > 0;

  return (
    <div className="space-y-3">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm px-4">
        {messagingConnected ? (
          <>
            <Wifi className="h-4 w-4 text-success" />
            <span className="text-text-muted">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-warning" />
            <span className="text-text-muted">Offline - messages will be sent when online</span>
          </>
        )}
        {hasPendingMessages && (
          <span className="ml-auto text-warning font-semibold">
            {pendingMessages.length} pending
          </span>
        )}
      </div>

      {/* Mention Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-lg p-2 mx-4 max-h-40 overflow-y-auto"
          >
            <div className="space-y-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">@{suggestion.username}</span>
                    <span className="text-xs text-text-muted">{suggestion.displayName}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compose Area */}
      <div className="glass rounded-lg p-4 space-y-3">
        <textarea
          ref={textAreaRef}
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press @ to mention)"
          disabled={isLoading || !messagingConnected}
          className="w-full h-24 bg-white/5 text-white placeholder-text-muted rounded border border-white/10 focus:border-primary/50 focus:outline-none p-3 resize-none disabled:opacity-50"
        />

        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">
            {content.length} / 500 characters
          </div>
          <button
            onClick={handleSend}
            disabled={!content.trim() || isLoading || !messagingConnected}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
