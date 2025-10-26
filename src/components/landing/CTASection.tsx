import { motion } from 'framer-motion';

export default function CTASection() {
  const handleScroll = () => {
    const target = document.getElementById('features');
    target?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="cta" className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-surface to-background" />
      <div className="relative glass max-w-5xl mx-auto px-6 sm:px-12 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Ready to share your story?
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto mb-8">
          Join thousands of students speaking anonymously, finding support, and building safer campuses across India.
        </p>
        <motion.button
          onClick={handleScroll}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary animate-pulse-slow"
        >
          Get Started
        </motion.button>
      </div>
    </section>
  );
}
