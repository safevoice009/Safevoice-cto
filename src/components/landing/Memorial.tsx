import { Flower } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Memorial() {
  return (
    <section id="memorial" className="py-20 px-4 sm:px-6 lg:px-8 bg-surface/50">
      <div className="max-w-4xl mx-auto text-center glass p-12 space-y-6">
        <motion.div
          className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Flower className="w-8 h-8 text-purple-400" />
        </motion.div>
        <h2 className="text-3xl font-bold">In Memory</h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          This space will honor students whose voices were silenced.
          We remember, we support, and we work toward safer campuses for everyone.
        </p>
        <p className="text-sm text-gray-500">
          Memorial feature coming soon
        </p>
      </div>
    </section>
  );
}
