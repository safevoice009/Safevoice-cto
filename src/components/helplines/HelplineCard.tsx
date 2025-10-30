import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Share2, Bookmark, BookmarkCheck, Globe2, ShieldCheck } from 'lucide-react';
import { type Helpline } from '../../lib/helplines';

interface HelplineCardProps {
  helpline: Helpline;
  isSaved: boolean;
  onSave: () => void;
  onShare: () => void;
}

export default function HelplineCard({ helpline, isSaved, onSave, onShare }: HelplineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded((prev) => !prev);

  return (
    <motion.div
      layout
      onClick={toggleExpand}
      className="glass p-5 rounded-2xl border border-white/10 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-glow group"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-white">{helpline.name}</h3>
            {helpline.trusted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                ✓ Verified
              </span>
            )}
            {helpline.badge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                🏛️ {helpline.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 line-clamp-2 group-hover:line-clamp-none transition-all">
            {helpline.description}
          </p>
        </div>

        {helpline.website && (
          <a
            href={helpline.website}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-purple-300 transition-colors"
          >
            <Globe2 className="w-5 h-5" />
          </a>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`tel:${helpline.number}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/90 text-white rounded-xl font-semibold text-lg hover:bg-primary transition-colors"
          >
            <Phone className="w-5 h-5" />
            <span>{helpline.number}</span>
          </a>
          <span className="text-sm text-gray-400">{helpline.hours}</span>
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
            {helpline.category}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {helpline.languages.map((language) => (
            <span
              key={language}
              className="px-2 py-1 bg-white/10 text-xs text-gray-200 rounded-full"
            >
              {language}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:border-white/40 hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm transition-colors ${
              isSaved
                ? 'bg-primary/20 text-primary border-primary/60'
                : 'text-gray-300 hover:border-white/40 hover:text-white'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-300 space-y-2"
          >
            <div>
              <h4 className="font-semibold text-white mb-1">Details</h4>
              <p>{helpline.description}</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Languages</h4>
              <p>{helpline.languages.join(', ')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Availability</h4>
              <p>{helpline.hours}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
