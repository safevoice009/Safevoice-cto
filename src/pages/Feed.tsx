import { motion } from 'framer-motion';

export default function Feed() {
  return (
    <motion.section
      className="min-h-screen flex flex-col items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="glass max-w-xl w-full p-10 text-center space-y-4">
        <h1 className="text-3xl font-bold">Feed Coming Soon</h1>
        <p className="text-gray-300">
          We are building decentralized, anonymous feeds where your stories will inspire real change. Stay tuned!
        </p>
      </div>
    </motion.section>
  );
}
