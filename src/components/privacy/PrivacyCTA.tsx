import { motion } from 'framer-motion';
import { Shield, Settings, Heart } from 'lucide-react';

export default function PrivacyCTA() {

  const actions = [
    {
      icon: Heart,
      title: 'Start Contributing',
      description: 'Share your thoughts anonymously with the community',
      link: '/feed',
      color: 'from-red-500/20 to-pink-500/20',
      border: 'border-red-500/30',
    },
    {
      icon: Settings,
      title: 'Customize Privacy',
      description: 'Fine-tune your privacy settings and protections',
      link: '/settings/appearance',
      color: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30',
    },
    {
      icon: Shield,
      title: 'Learn More',
      description: 'Explore documentation and privacy guides',
      link: '#privacy-features',
      color: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/30',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-8"
    >
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-white">
          Ready to Protect Your Privacy?
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          Take the next step with SafeVoice. Whether you're just starting out or looking to
          enhance your privacy, we have options for every comfort level.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.a
              key={index}
              href={action.link}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`group relative glass p-8 rounded-xl border ${action.border} transition-all overflow-hidden`}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              {/* Content */}
              <div className="relative space-y-4">
                <Icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <h3 className="font-semibold text-white mb-1 text-lg">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    {action.description}
                  </p>
                </div>
                <div className="pt-4 flex items-center space-x-2 text-primary group-hover:space-x-3 transition-all">
                  <span className="text-sm font-medium">Get Started</span>
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>
    </motion.section>
  );
}
