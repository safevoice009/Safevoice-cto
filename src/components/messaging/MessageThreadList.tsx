import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { MessageCircle } from 'lucide-react';

interface MessageThreadListProps {
  onSelectThread?: (threadId: string) => void;
  selectedThreadId?: string;
}

export default function MessageThreadList({
  onSelectThread,
  selectedThreadId,
}: MessageThreadListProps) {
  const { threads } = useStore();

  const threadList = Array.from(threads.values()).sort(
    (a, b) => b.lastActivityAt - a.lastActivityAt
  );

  if (threadList.length === 0) {
    return (
      <div className="glass rounded-lg p-8 text-center space-y-4">
        <MessageCircle className="h-12 w-12 text-text-muted mx-auto opacity-50" />
        <div>
          <h3 className="font-semibold text-white mb-1">No conversations yet</h3>
          <p className="text-sm text-text-muted">Start a new conversation to begin messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider px-4">
        Conversations
      </h3>
      <AnimatePresence>
        {threadList.map((thread) => (
          <motion.button
            key={thread.id}
            onClick={() => onSelectThread?.(thread.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`w-full text-left p-4 rounded-lg transition-all ${
              selectedThreadId === thread.id
                ? 'bg-primary/20 border border-primary/50'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white truncate">
                  {thread.title || thread.participantIds.join(', ')}
                </h4>
                {thread.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent text-white text-xs font-semibold">
                    {Math.min(thread.unreadCount, 9)}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-muted line-clamp-1">
                {thread.lastMessage?.content || 'No messages yet'}
              </p>
              <time className="text-xs text-text-muted">
                {new Date(thread.lastActivityAt).toLocaleDateString()}
              </time>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
