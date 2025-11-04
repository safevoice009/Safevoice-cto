import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';
import type { Community } from '../../lib/communities/types';

interface ChannelRulesProps {
  community: Community;
  channelName?: string;
  channelRules?: string[];
  collapsed?: boolean;
}

export default function ChannelRules({ community, channelName, channelRules, collapsed = false }: ChannelRulesProps) {
  const [isOpen, setIsOpen] = useState(!collapsed);

  const rules = channelRules && channelRules.length > 0 ? channelRules : community.rules;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left transition-colors hover:text-primary"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-white">
              {channelName ? `${channelName} Guidelines` : 'Community Guidelines'}
            </h2>
            <p className="text-xs text-gray-400">
              {channelName ? 'Channel-specific rules and expectations' : 'General community safety guidelines'}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-sm text-gray-300">{rule}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs text-blue-300">
                💡 <span className="font-semibold">Tip:</span> Follow these guidelines to keep this space supportive and welcoming for everyone.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
