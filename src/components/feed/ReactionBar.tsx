import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Reaction } from '../../lib/store';

interface ReactionBarProps {
  reactions: Reaction;
  onReact: (reactionType: keyof Reaction) => void;
  size?: 'small' | 'normal';
}

interface ReactionParticle {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

const reactionEmojis: Array<{ type: keyof Reaction; emoji: string }> = [
  { type: 'heart', emoji: '❤️' },
  { type: 'fire', emoji: '🔥' },
  { type: 'clap', emoji: '👏' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😠' },
  { type: 'laugh', emoji: '😂' },
];

export default function ReactionBar({ reactions, onReact, size = 'normal' }: ReactionBarProps) {
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const [hoveredReaction, setHoveredReaction] = useState<keyof Reaction | null>(null);

  const handleReaction = (reactionType: keyof Reaction, emoji: string, event: React.MouseEvent) => {
    onReact(reactionType);

    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const newParticles: ReactionParticle[] = Array.from({ length: 6 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      emoji,
      x: centerX + (Math.random() - 0.5) * 100,
      y: centerY + (Math.random() - 0.5) * 100,
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 1000);
  };

  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  const topReactions = Object.entries(reactions)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const buttonSize = size === 'small' ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl';
  const countSize = size === 'small' ? 'text-xs' : 'text-sm';

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {reactionEmojis.map(({ type, emoji }) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleReaction(type, emoji, e)}
              onMouseEnter={() => setHoveredReaction(type)}
              onMouseLeave={() => setHoveredReaction(null)}
              className={`${buttonSize} rounded-full hover:bg-white/10 transition-colors flex items-center justify-center relative`}
              title={`React with ${emoji}`}
            >
              <span>{emoji}</span>
              {reactions[type] > 0 && (
                <motion.span
                  key={reactions[type]}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className={`absolute -bottom-1 -right-1 ${countSize} font-bold bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center`}
                >
                  {reactions[type] > 99 ? '99+' : reactions[type]}
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>

        {totalReactions > 50 && (
          <div className="relative group">
            <button className="text-xs text-gray-400 hover:text-primary transition-colors">
              Show all
            </button>
            <AnimatePresence>
              {hoveredReaction === null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="hidden group-hover:block absolute bottom-full right-0 mb-2 p-3 glass text-xs whitespace-nowrap z-20"
                >
                  <div className="space-y-1">
                    {topReactions.map(([type, count]) => {
                      const emoji = reactionEmojis.find((r) => r.type === type)?.emoji;
                      return (
                        <div key={type} className="flex items-center justify-between space-x-3">
                          <span>
                            {emoji} {type}
                          </span>
                          <span className="font-bold text-primary">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              position: 'fixed',
              left: particle.x,
              top: particle.y,
              opacity: 1,
              scale: 1,
              pointerEvents: 'none',
              zIndex: 100,
            }}
            animate={{
              left: particle.x + (Math.random() - 0.5) * 150,
              top: particle.y - Math.random() * 150,
              opacity: 0,
              scale: 1.5,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-2xl"
          >
            {particle.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}
