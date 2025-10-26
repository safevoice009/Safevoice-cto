import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import { User } from 'lucide-react';

export default function Profile() {
  const { studentId } = useStore();

  return (
    <motion.section
      className="min-h-screen flex flex-col items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="glass max-w-xl w-full p-10 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">{studentId}</h1>
        <p className="text-gray-300">
          Your anonymous identity. Profile customization and activity history coming soon.
        </p>
        <div className="pt-4 border-t border-white/10">
          <p className="text-sm text-gray-400">
            Posts: 0 • Comments: 0 • Joined: Recently
          </p>
        </div>
      </div>
    </motion.section>
  );
}
