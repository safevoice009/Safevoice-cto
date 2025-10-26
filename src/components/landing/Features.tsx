import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Lock, AlertCircle, MessageCircle, Scale } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: Lock,
    title: '100% Anonymous',
    description: 'No login, no tracking. Your identity stays completely private.',
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    icon: AlertCircle,
    title: '24/7 Crisis Support',
    description: 'Instant access to verified helplines and mental health resources.',
    gradient: 'from-red-500 to-pink-500',
  },
  {
    icon: MessageCircle,
    title: 'Community Spaces',
    description: 'Connect with fellow students anonymously. Share experiences safely.',
    gradient: 'from-green-500 to-teal-500',
  },
  {
    icon: Scale,
    title: 'Safe Whistleblowing',
    description: 'Expose institutional corruption. Your voice, their accountability.',
    gradient: 'from-orange-500 to-yellow-500',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function Features() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = sectionRef.current;

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-20 px-4 sm:px-6 lg:px-8 bg-background"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Why SafeVoice?
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Built for students, powered by anonymity, secured by blockchain.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                whileHover={{
                  y: -8,
                  transition: { duration: 0.3 },
                }}
                className="glass p-8 transition-all duration-300 hover:shadow-glow cursor-pointer"
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ duration: 0.3 }}
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
