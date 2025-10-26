import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowDown } from 'lucide-react';

const heroVariants: Variants = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
};

const particleVariants: Variants = {
  animate: {
    y: [0, -20, 0],
    x: [0, 10, 0],
    opacity: [0.2, 0.6, 0.2],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: [0.45, 0.05, 0.55, 0.95],
    },
  },
};

export default function Hero() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, index) => ({
        key: index,
        size: Math.random() * 6 + 4,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3,
      })),
    []
  );

  const handleShare = () => toast('Coming Soon!');
  const handleCrisisHelp = () => toast.success('24/7 Helpline Ready');

  const scrollToFeatures = () => {
    const target = document.getElementById('features');
    target?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <motion.span
            key={particle.key}
            variants={particleVariants}
            animate="animate"
            initial={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: particle.delay }}
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
            className="absolute rounded-full bg-white/20"
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div
          variants={heroVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.6 }}
          className="text-center md:text-left space-y-8"
        >
          <motion.span
            className="inline-flex items-center px-4 py-2 glass text-sm uppercase tracking-wide"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
          >
            India's First Decentralized Student Platform
          </motion.span>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
          >
            Your Anonymous Voice Matters
          </motion.h1>

          <motion.p
            className="max-w-2xl text-lg sm:text-xl text-blue-50/90 mx-auto md:mx-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
          >
            Share stories, seek support, and ignite change with full anonymity.
            SafeVoice empowers every student to speak out fearlessly.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center md:items-start md:justify-start gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
          >
            <motion.button
              onClick={handleShare}
              className="btn-primary w-full sm:w-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Share Anonymously
            </motion.button>
            <motion.button
              onClick={handleCrisisHelp}
              className="btn-secondary w-full sm:w-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Crisis Help
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <button
        onClick={scrollToFeatures}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white flex flex-col items-center space-y-2"
      >
        <span className="text-sm text-white/80">Explore more</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center"
        >
          <ArrowDown className="w-5 h-5" />
        </motion.div>
      </button>
    </section>
  );
}
