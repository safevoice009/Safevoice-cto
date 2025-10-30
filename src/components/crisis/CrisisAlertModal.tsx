import { motion, AnimatePresence } from 'framer-motion';
import { Phone, AlertTriangle } from 'lucide-react';
import { helplines } from '../../lib/helplines';

interface CrisisAlertModalProps {
  isOpen: boolean;
  onAcknowledge: (action: 'call_helpline' | 'continue') => void;
}

export default function CrisisAlertModal({
  isOpen,
  onAcknowledge,
}: CrisisAlertModalProps) {
  const primaryHelplines = helplines.filter((h) =>
    ['aasra', 'vandrevala', 'kiran'].includes(h.id)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={(e) => e.stopPropagation()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-red-500/30">
              <div className="sticky top-0 glass p-6 border-b border-white/10 flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      🆘 We're Here to Help
                    </h2>
                    <p className="text-gray-300 text-sm">
                      If you're thinking about suicide or need immediate support, you're not
                      alone. Help is available 24/7.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  {primaryHelplines.map((helpline) => (
                    <motion.a
                      key={helpline.id}
                      href={`tel:${helpline.number}`}
                      onClick={() => onAcknowledge('call_helpline')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="block glass p-4 rounded-xl border border-white/10 hover:border-primary transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">
                              {helpline.name}
                            </h3>
                            {helpline.badge && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                                {helpline.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-primary group-hover:text-purple-300 transition-colors">
                            {helpline.number}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">{helpline.hours}</p>
                        </div>
                        <Phone className="w-8 h-8 text-primary group-hover:text-purple-300 transition-colors" />
                      </div>
                    </motion.a>
                  ))}
                </div>

                <div className="text-center">
                  <a
                    href="/helplines"
                    className="inline-block text-primary hover:text-purple-300 font-medium transition-colors"
                    onClick={() => onAcknowledge('continue')}
                  >
                    View All Helplines →
                  </a>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <button
                    onClick={() => onAcknowledge('continue')}
                    className="w-full py-3 text-gray-400 hover:text-gray-300 text-sm transition-colors"
                  >
                    I'm okay, continue posting
                  </button>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300 text-center">
                    <strong className="text-red-400">Emergency:</strong> If you are in
                    immediate danger, please call emergency services (100/112) or visit the
                    nearest hospital.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
