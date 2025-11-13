export interface PrivacyFAQ {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'tracking' | 'encryption' | 'onboarding' | 'technical';
}

export const privacyFaqData: PrivacyFAQ[] = [
  {
    id: 'general-1',
    question: 'What is SafeVoice and why is privacy important here?',
    answer: 'SafeVoice is a safe, anonymous platform for students to express themselves without fear. Privacy is fundamental because students need to share sensitive thoughts - about mental health, academic pressure, and personal challenges - without identification or surveillance.',
    category: 'general',
  },
  {
    id: 'general-2',
    question: 'Who can see my posts?',
    answer: 'Your posts are visible to the community, but your identity remains completely anonymous. We never store personal information like your real name, email, or phone number. Each user gets a unique Student ID, but it\'s separate from your identity and never shared.',
    category: 'general',
  },
  {
    id: 'general-3',
    question: 'Can SafeVoice administrators identify me?',
    answer: 'No. Our infrastructure is designed so that even SafeVoice administrators cannot identify users. Your data is stored encrypted locally on your device, not on our servers. We have no way to link your Student ID to any personal information.',
    category: 'general',
  },
  {
    id: 'tracking-1',
    question: 'Do you track my activity or use analytics?',
    answer: 'No. SafeVoice does not use Google Analytics, Facebook Pixel, or any third-party tracking services. We don\'t build user profiles or track your behavior. Your activity stays completely private.',
    category: 'tracking',
  },
  {
    id: 'tracking-2',
    question: 'What about cookies and fingerprinting?',
    answer: 'SafeVoice is completely cookie-free. We also protect you from browser fingerprinting techniques that trackers use to identify you across websites. You can enable Browser Fingerprint Protection in Settings to monitor and block these techniques.',
    category: 'tracking',
  },
  {
    id: 'tracking-3',
    question: 'How is my data protected from third-party trackers?',
    answer: 'We use Content Security Policy (CSP) headers to prevent unauthorized tracking scripts from loading. All network requests are validated against a security allowlist - only trusted domains can communicate with SafeVoice. We also disable unnecessary browser features that trackers could exploit.',
    category: 'tracking',
  },
  {
    id: 'encryption-1',
    question: 'Is my data encrypted?',
    answer: 'Yes. Your data is stored locally on your device using AES-256 encryption. Your storage keys are restricted by a whitelist to prevent unauthorized access. All network connections use HTTPS encryption.',
    category: 'encryption',
  },
  {
    id: 'encryption-2',
    question: 'Can I encrypt my posts?',
    answer: 'Yes. When creating a post, you can choose the "Encrypt" option. This adds an extra layer of protection to sensitive content. You can also verify the encryption settings in the post details.',
    category: 'encryption',
  },
  {
    id: 'encryption-3',
    question: 'What happens if I forget my encryption password?',
    answer: 'Your encryption password is stored locally on your device. If you forget it, that encrypted post cannot be decrypted. We recommend testing your encryption settings with a non-sensitive post first.',
    category: 'encryption',
  },
  {
    id: 'onboarding-1',
    question: 'How do I get started with SafeVoice?',
    answer: 'Simply visit SafeVoice - no login or personal information required. You\'ll get a unique Student ID automatically. Start by reading the Community Guidelines, then post your first thoughts. You can customize your privacy settings anytime in Settings → Privacy & Security.',
    category: 'onboarding',
  },
  {
    id: 'onboarding-2',
    question: 'Do I need to give my email or phone number?',
    answer: 'No. SafeVoice works without any personal information. If you want to connect a wallet for rewards, that\'s optional and separate from your anonymous identity.',
    category: 'onboarding',
  },
  {
    id: 'onboarding-3',
    question: 'Can I use SafeVoice on multiple devices?',
    answer: 'Yes, but each device gets its own Student ID. Your data is stored locally on each device. If you want your data synced across devices, you\'ll need to connect a wallet - then your posts and profile sync to your wallet address.',
    category: 'onboarding',
  },
  {
    id: 'technical-1',
    question: 'Where is my data actually stored?',
    answer: 'By default, your data is stored encrypted in your browser\'s localStorage on your device. Nothing is sent to our servers without your permission. If you connect a wallet, your posts can be stored on IPFS (a decentralized network) but your identity remains anonymous.',
    category: 'technical',
  },
  {
    id: 'technical-2',
    question: 'What is IPFS and why do we use it?',
    answer: 'IPFS (InterPlanetary File System) is a decentralized storage network. We use it to backup your posts across multiple nodes. This means your posts are more resilient and can\'t be censored by a single entity. Your identity is never linked to your IPFS data.',
    category: 'technical',
  },
  {
    id: 'technical-3',
    question: 'How does Browser Fingerprint Protection work?',
    answer: 'Fingerprint Protection monitors for tracking signals like your screen resolution, browser type, and plugins. When detected, it applies countermeasures like randomizing these values. You can also manually rotate your anonymization salt to refresh your fingerprint signature.',
    category: 'technical',
  },
];

export const privacyFaqByCategory = (category: PrivacyFAQ['category']) => {
  return privacyFaqData.filter((faq) => faq.category === category);
};

export const allFaqCategories = Array.from(
  new Set(privacyFaqData.map((faq) => faq.category))
);
