import { motion } from 'framer-motion';
import type { RankDefinition } from '../../lib/tokens/AchievementService';

interface RankChipProps {
  rank: RankDefinition;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function RankChip({ rank, size = 'md' }: RankChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center gap-1 font-semibold rounded-full text-white bg-gradient-to-r ${sizeClasses[size]} ${rank.gradientFrom} ${rank.gradientTo}`}
      style={{ boxShadow: `0 4px 20px ${rank.color}33` }}
    >
      <span aria-hidden className={size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'}>
        {rank.icon}
      </span>
      <span>{rank.name}</span>
    </motion.div>
  );
}
