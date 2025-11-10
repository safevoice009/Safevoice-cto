import { motion } from 'framer-motion';
import {
  Lock,
  Zap,
  Network,
  ShieldAlert,
  RefreshCw,
  Globe,
  Eye,
  CheckCircle,
} from 'lucide-react';

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  details: string[];
}

const features: FeatureItem[] = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'Your data is encrypted locally before storage',
    details: [
      'AES-256 encryption standard',
      'Encryption keys stored locally',
      'Never transmitted unencrypted',
    ],
  },
  {
    icon: Eye,
    title: 'Zero Analytics',
    description: 'No tracking scripts, no user profiling',
    details: [
      'No Google Analytics',
      'No Facebook Pixel',
      'No third-party trackers',
    ],
  },
  {
    icon: Globe,
    title: 'No Cookies',
    description: 'Complete cookie-free experience',
    details: [
      'All data stored locally',
      'Encrypted localStorage',
      'No tracking across sites',
    ],
  },
  {
    icon: ShieldAlert,
    title: 'Fingerprint Protection',
    description: 'Monitor and block browser fingerprinting',
    details: [
      'Detect tracking signals',
      'Auto-mitigation available',
      'Manual salt rotation',
    ],
  },
  {
    icon: Network,
    title: 'Network Security',
    description: 'Allowlist-validated network requests',
    details: [
      'Content Security Policy',
      'Only trusted domains',
      'HTTPS enforced',
    ],
  },
  {
    icon: Zap,
    title: 'Instant Privacy',
    description: 'Privacy enabled by default',
    details: [
      'No configuration needed',
      'Works out of the box',
      'Customizable when needed',
    ],
  },
  {
    icon: RefreshCw,
    title: 'IPFS Integration',
    description: 'Optional decentralized backup',
    details: [
      'Decentralized storage',
      'Anonymous post backup',
      'Completely optional',
    ],
  },
  {
    icon: CheckCircle,
    title: 'Open Source',
    description: 'Transparent, auditable code',
    details: [
      'Code available on GitHub',
      'Community audits welcome',
      'No hidden operations',
    ],
  },
];

export default function PrivacyFeaturesGrid() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Privacy Features</h2>
        <p className="text-gray-400">
          Built-in protections that keep you anonymous by default
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group glass p-6 rounded-xl border border-white/10 hover:border-primary/50 transition-all hover:shadow-glow/50"
            >
              <Icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{feature.description}</p>
              <ul className="space-y-1">
                {feature.details.map((detail, i) => (
                  <li key={i} className="text-xs text-gray-500 flex items-start space-x-2">
                    <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
