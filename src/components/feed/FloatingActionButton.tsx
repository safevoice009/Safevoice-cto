import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-14 h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 bg-gradient-hero rounded-full shadow-glow flex items-center justify-center z-30"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
      whileHover={{ scale: 1.1, rotate: 90 }}
      whileTap={{ scale: 0.9 }}
    >
      <Plus className="w-7 h-7 md:w-8 md:h-8 text-white" strokeWidth={2.5} />
    </motion.button>
  );
}
