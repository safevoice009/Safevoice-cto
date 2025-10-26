import { useState, forwardRef, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { useStore } from '../../lib/store';

interface CommentInputProps {
  postId: string;
  parentCommentId?: string;
  initialContent?: string;
  onSubmit?: (content: string) => void;
  suggestions?: string[];
}

const CommentInput = forwardRef<HTMLTextAreaElement, CommentInputProps>(
  ({ postId, parentCommentId, initialContent = '', onSubmit, suggestions = [] }, ref) => {
    const [content, setContent] = useState(initialContent);
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const { addComment } = useStore();

    useEffect(() => {
      if (typeof ref === 'function') {
        ref(textareaRef.current);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = textareaRef.current;
      }
    }, [ref]);

    const filteredSuggestions = suggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(mentionQuery.toLowerCase()))
      .slice(0, 5);

    const handleMentionSelect = (mention: string) => {
      if (!textareaRef.current) return;
      const value = content;
      const mentionIndex = value.lastIndexOf('@', cursorPosition - 1);
      if (mentionIndex === -1) return;

      const beforeMention = value.slice(0, mentionIndex + 1);
      const afterMention = value.slice(cursorPosition);
      const newContent = `${beforeMention}${mention} ${afterMention}`;

      setContent(newContent);
      setShowMentions(false);
      setMentionQuery('');

      // Set cursor after inserted mention
      const newCursorPosition = mentionIndex + 1 + mention.length + 1; // plus space
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = newCursorPosition;
          textareaRef.current.selectionEnd = newCursorPosition;
        }
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setContent(newValue);
      setCursorPosition(e.target.selectionStart);

      const lastAt = newValue.lastIndexOf('@', e.target.selectionStart - 1);
      if (lastAt !== -1) {
        const substring = newValue.slice(lastAt + 1, e.target.selectionStart);
        const hasSpace = /
|    | |/.test(substring);
        if (!hasSpace) {
          setMentionQuery(substring);
          setShowMentions(substring.length > 0);
        } else {
          setShowMentions(false);
          setMentionQuery('');
        }
      } else {
        setShowMentions(false);
        setMentionQuery('');
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedContent = content.trim();
      if (trimmedContent.length < 5 || trimmedContent.length > 500) return;

      if (onSubmit) {
        onSubmit(trimmedContent);
      } else {
        addComment(postId, trimmedContent, parentCommentId);
      }

      setContent('');
      setMentionQuery('');
      setShowMentions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
        e.preventDefault();
        handleSubmit(e);
      }

      if (showMentions && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
        e.preventDefault();
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-2 relative">
        <textarea
          ref={(node) => {
            textareaRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            }
          }}
          value={content}
          onChange={handleChange}
          onClick={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowMentions(false), 150)}
          placeholder={parentCommentId ? 'Add a reply...' : 'Add a comment...'}
          className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-primary transition-colors"
          rows={3}
          maxLength={500}
        />
        <AnimatePresence>
          {showMentions && filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full left-0 mb-2 glass p-2 space-y-1 w-full max-w-xs z-20"
            >
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMentionSelect(suggestion);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {content.length}/500 {content.length >= 5 && <span className="text-green-500">✓</span>}
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={content.trim().length < 5 || content.trim().length > 500}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Comment</span>
          </motion.button>
        </div>
      </form>
    );
  }
);

CommentInput.displayName = 'CommentInput';

export default CommentInput;
