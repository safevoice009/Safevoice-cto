import { motion } from 'framer-motion';
import { VolumeX, Clock, Info } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatTimeAgo, formatTimeRemaining } from '../../lib/utils';

export default function ChannelMuteBanner() {
  const { channelMuteStatus } = useStore();

  if (!channelMuteStatus.isMuted || !channelMuteStatus.mutedUntil) {
    return null;
  }

  const now = Date.now();
  const isExpired = channelMuteStatus.mutedUntil <= now;
  
  if (isExpired) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <VolumeX className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="font-semibold text-red-400 text-lg">Channel Muted</h3>
            <p className="text-red-300 text-sm mt-1">
              {channelMuteStatus.reason || 'Channel temporarily muted for community safety'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-red-400 bg-black/30 rounded px-2 py-1 inline-block">
            <Clock className="w-3 h-3 inline mr-1" />
            {formatTimeRemaining(channelMuteStatus.mutedUntil)}
          </div>
        </div>
      </div>

      {channelMuteStatus.mutedBy && (
        <div className="text-xs text-red-400 border-t border-red-500/20 pt-3 mt-3">
          <div className="flex items-center space-x-1">
            <Info className="w-3 h-3" />
            <span>
              Muted by {channelMuteStatus.mutedBy} • {formatTimeAgo(channelMuteStatus.mutedAt || now)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}