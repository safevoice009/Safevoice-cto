import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Plus, Heart } from 'lucide-react';
import { useStore } from '../../lib/store';
import TributeCard from './TributeCard';
import CreateTributeModal from './CreateTributeModal';

export default function MemorialWall() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const memorialTributes = useStore((state) => state.memorialTributes);
  const loadMemorialData = useStore((state) => state.loadMemorialData);

  useEffect(() => {
    loadMemorialData();
  }, [loadMemorialData]);

  const sortedTributes = [...memorialTributes].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <motion.section
      className="min-h-screen px-4 py-8 max-w-5xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-6">
        <motion.div
          className="glass p-8 text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-center">
            <Flame className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">Memorial Wall</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            A sacred space to honor and remember loved ones. Share tributes, light candles, and keep their memories alive.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:shadow-glow transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Create Tribute</span>
          </motion.button>
        </motion.div>

        {sortedTributes.length === 0 ? (
          <motion.div
            className="glass p-10 text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Heart className="w-16 h-16 text-gray-600 mx-auto" />
            <p className="text-xl font-semibold text-white">No tributes yet</p>
            <p className="text-gray-400">
              Be the first to create a tribute and honor someone special.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {sortedTributes.map((tribute) => (
                <TributeCard key={tribute.id} tribute={tribute} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreateTributeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </motion.section>
  );
}
