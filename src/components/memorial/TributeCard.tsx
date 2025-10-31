import { motion } from 'framer-motion';
import { Flame, Users, Star } from 'lucide-react';
import { useStore, type MemorialTribute } from '../../lib/store';

interface TributeCardProps {
  tribute: MemorialTribute;
}

const CANDLE_MILESTONE_TARGET = 50;

const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.max(Math.floor(diff / 1000), 1);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
};

export default function TributeCard({ tribute }: TributeCardProps) {
  const lightCandle = useStore((state) => state.lightCandle);

  const uniqueSupporters = new Set(tribute.candles.map((c) => c.lightedBy)).size;
  const candleProgress = Math.min(
    100,
    Math.floor((tribute.candles.length / CANDLE_MILESTONE_TARGET) * 100)
  );
  const candlesRemaining = Math.max(
    0,
    CANDLE_MILESTONE_TARGET - tribute.candles.length
  );
  const recentCandles = [...tribute.candles].slice(-3).reverse();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-white">{tribute.personName}</h3>
          <p className="text-sm text-gray-400">
            Honored on {new Date(tribute.createdAt).toLocaleDateString()}
          </p>
        </div>
        {tribute.milestoneRewardAwarded && (
          <div className="inline-flex items-center space-x-1 text-amber-300 text-sm">
            <Star className="w-4 h-4" />
            <span>Milestone reached</span>
          </div>
        )}
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">
        {tribute.message}
      </p>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
          <span className="inline-flex items-center gap-2 text-amber-300">
            <Flame className="w-4 h-4" />
            <span>{tribute.candles.length} candles lit</span>
          </span>
          <span className="inline-flex items-center gap-2 text-sky-300">
            <Users className="w-4 h-4" />
            <span>{uniqueSupporters} supporters</span>
          </span>
        </div>

        <div className="space-y-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 transition-all"
              style={{ width: `${candleProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{Math.min(tribute.candles.length, CANDLE_MILESTONE_TARGET)}/{CANDLE_MILESTONE_TARGET} candles</span>
            {tribute.milestoneRewardAwarded ? (
              <span className="text-amber-300">Milestone achieved</span>
            ) : (
              <span>{candlesRemaining} candles to milestone</span>
            )}
          </div>
        </div>
      </div>

      {tribute.candles.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Recent candles</p>
          <div className="space-y-2">
            {recentCandles.map((candle) => (
              <div key={candle.id} className="flex items-center justify-between text-xs text-gray-400">
                <span className="text-gray-300">🕯️ {candle.lightedBy}</span>
                <span>{formatRelativeTime(candle.lightedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => lightCandle(tribute.id)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-lg hover:bg-amber-500/30 transition-all"
      >
        <Flame className="w-4 h-4" />
        <span>Light Candle (+2 VOICE)</span>
      </motion.button>
    </motion.div>
  );
}
