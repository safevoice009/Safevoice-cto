import { motion } from 'framer-motion';

export default function RouteLoader() {
  return (
    <motion.div
      className="flex items-center justify-center min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="glass p-8 rounded-lg shadow-xl flex flex-col items-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        </div>
        <p className="text-white text-lg font-medium">Loading...</p>
      </div>
    </motion.div>
  );
}
