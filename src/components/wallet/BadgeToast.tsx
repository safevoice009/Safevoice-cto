import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { Achievement } from '../../lib/tokens/RewardEngine';

interface BadgeToastProps {
  achievement: Achievement;
  onClose: () => void;
}

export default function BadgeToast({ achievement, onClose }: BadgeToastProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; rotation: number; delay: number }>>([]);
  const rewardAmount =
    typeof achievement.metadata?.rewardAmount === 'number' ? achievement.metadata.rewardAmount : null;

  useEffect(() => {
    // Generate confetti particles
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 200 - 100,
      y: Math.random() * -150 - 50,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.2,
    }));
    setConfetti(particles);

    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className="relative"
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <AnimatePresence>
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{
                x: particle.x,
                y: particle.y,
                opacity: 0,
                rotate: particle.rotation,
              }}
              transition={{
                duration: 1.5,
                delay: particle.delay,
                ease: 'easeOut',
              }}
              className="absolute top-1/2 left-1/2"
              style={{ width: '8px', height: '8px' }}
            >
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: `hsl(${Math.random() * 360}, 70%, 60%)`,
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Toast Content */}
      <div className="glass relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse" />
        
        <div className="relative flex items-center gap-4 p-4">
          {/* Achievement Icon */}
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, duration: 0.6 }}
            className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg"
          >
            <span className="text-3xl">{achievement.icon}</span>
          </motion.div>

          {/* Achievement Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-medium text-yellow-400">Achievement Unlocked!</p>
            </div>
            <h3 className="text-lg font-bold text-white truncate">{achievement.name}</h3>
            <p className="text-sm text-gray-300 line-clamp-2">{achievement.description}</p>
            {rewardAmount !== null && (
              <p className="text-xs text-green-400 mt-1">+{rewardAmount} VOICE bonus</p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
            type="button"
            aria-label="Close"
          >
            <span className="text-gray-400">✕</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
