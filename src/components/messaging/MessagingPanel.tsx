import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import { useStore } from '../../lib/store';
import MessageThreadList from './MessageThreadList';
import MessageComposer from './MessageComposer';

interface MessagingPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function MessagingPanel({ isOpen = true, onClose }: MessagingPanelProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const { threads, initializeMessaging, markThreadRead } = useStore();

  useEffect(() => {
    if (isOpen) {
      initializeMessaging();
    }
  }, [isOpen, initializeMessaging]);

  const selectedThread = selectedThreadId ? threads.get(selectedThreadId) : null;

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    markThreadRead(threadId);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="space-y-4"
      >
        <div className="glass rounded-lg p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-white">Messages</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="h-5 w-5 text-text-muted" />
              </button>
            )}
          </div>

          {/* Thread List and Composer */}
          <div className="space-y-4">
            {/* Thread List */}
            <MessageThreadList
              onSelectThread={handleSelectThread}
              selectedThreadId={selectedThreadId || undefined}
            />

            {/* Selected Thread Messages */}
            {selectedThread && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Messages Display */}
                <div className="bg-white/5 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3 border border-white/10">
                  {selectedThread.messages.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      No messages yet
                    </div>
                  ) : (
                    selectedThread.messages.map((message) => (
                      <div
                        key={message.id}
                        className="space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">
                            {message.senderName}
                          </span>
                          <time className="text-text-muted">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </time>
                        </div>
                        <p className="text-sm text-white break-words">
                          {message.content}
                        </p>
                        {message.mentions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {message.mentions.map((mention) => (
                              <span
                                key={mention.userId}
                                className="inline-flex items-center px-2 py-1 rounded-full bg-primary/20 text-xs text-primary"
                              >
                                @{mention.username}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Composer */}
                <MessageComposer
                  threadId={selectedThread.id}
                  onMessageSent={() => {
                    // Scroll to bottom of messages
                    const container = document.querySelector('[class*="max-h-96"]');
                    if (container) {
                      container.scrollTop = container.scrollHeight;
                    }
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
