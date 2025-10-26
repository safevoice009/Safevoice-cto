import { helplines } from '../../lib/constants';
import { Phone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Helplines() {
  return (
    <section id="helplines" className="py-20 px-4 sm:px-6 lg:px-8 bg-background/95">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Verified Crisis Helplines</h2>
          <p className="text-gray-400">
            Immediate support when you or your friends need it the most.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {helplines.map((helpline) => (
            <motion.div
              key={helpline.name}
              className="glass p-6 flex items-center space-x-4"
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Phone className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{helpline.name}</h3>
                <p className="text-red-300 font-medium">{helpline.phone}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
