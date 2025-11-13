import { motion } from 'framer-motion';
import { Shield, Lock, Eye } from 'lucide-react';

export default function PrivacyHero() {
  const features = [
    {
      icon: Shield,
      title: 'Completely Anonymous',
      description: 'No real name, email, or phone number needed',
    },
    {
      icon: Lock,
      title: 'Fully Encrypted',
      description: 'AES-256 encryption for your local data',
    },
    {
      icon: Eye,
      title: 'Zero Tracking',
      description: 'No analytics, cookies, or fingerprinting',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center space-y-8 mb-16"
    >
      {/* Main Heading */}
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center space-x-3 mb-4">
          <Shield className="w-10 h-10 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Your Privacy, Our Priority
          </h1>
        </div>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          SafeVoice is built from the ground up for privacy. Learn how we protect your identity
          and data, and how you can maximize your privacy with our tools.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass p-6 rounded-xl border border-white/10 hover:border-primary/50 transition-colors"
            >
              <Icon className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="pt-8"
      >
        <p className="text-gray-400 mb-4">Ready to get started?</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/feed"
            className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:shadow-glow transition-all"
          >
            Start Using SafeVoice
          </a>
          <a
            href="/settings/appearance"
            className="px-8 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
          >
            Adjust Privacy Settings
          </a>
        </div>
      </motion.div>
    </motion.section>
  );
}
