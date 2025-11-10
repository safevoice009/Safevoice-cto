import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { privacyFaqData, type PrivacyFAQ } from '../../data/privacyFaq';

type CategoryType = 'general' | 'tracking' | 'encryption' | 'onboarding' | 'technical' | 'all';

const categoryLabels: Record<Exclude<CategoryType, 'all'>, string> = {
  general: 'General Questions',
  tracking: 'Tracking & Fingerprinting',
  encryption: 'Encryption & Storage',
  onboarding: 'Getting Started',
  technical: 'Technical Details',
};

export default function PrivacyFAQAccordion() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    let items = privacyFaqData;

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter((faq) => faq.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      );
    }

    return items;
  }, [selectedCategory, searchQuery]);

  const categories: CategoryType[] = ['all', 'general', 'tracking', 'encryption', 'onboarding', 'technical'];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass p-8 rounded-2xl border border-white/10"
    >
      <h3 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h3>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
            aria-label="Search FAQs"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-primary text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
            aria-pressed={selectedCategory === cat}
          >
            {cat === 'all' ? 'All Questions' : categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <FAQItem
                key={faq.id}
                faq={faq}
                isExpanded={expandedId === faq.id}
                onToggle={() => toggleExpand(faq.id)}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-gray-400"
            >
              <p>No FAQs found matching your search.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 text-primary hover:underline"
              >
                Clear filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
        <p className="text-sm text-gray-300">
          💡 <strong>Tip:</strong> Use the search bar to find answers to specific questions, or browse by
          category to learn about a particular privacy topic.
        </p>
      </div>
    </motion.div>
  );
}

interface FAQItemProps {
  faq: PrivacyFAQ;
  isExpanded: boolean;
  onToggle: () => void;
}

function FAQItem({ faq, isExpanded, onToggle }: FAQItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`rounded-lg border transition-all ${
        isExpanded
          ? 'bg-primary/10 border-primary'
          : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-start justify-between gap-4 text-left"
        aria-expanded={isExpanded}
        aria-controls={`faq-answer-${faq.id}`}
      >
        <div className="flex-1">
          <h4 className="font-semibold text-white pr-4">{faq.question}</h4>
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="inline-block text-xs px-2 py-1 bg-white/10 rounded-full text-gray-400">
              {categoryLabels[faq.category]}
            </span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-primary mt-1" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            id={`faq-answer-${faq.id}`}
            className="px-6 pb-4"
          >
            <div className="pt-3 border-t border-white/10">
              <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
