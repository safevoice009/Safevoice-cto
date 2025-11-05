import { motion } from 'framer-motion';
import { Shield, Eye, Activity, RefreshCcw, AlertCircle } from 'lucide-react';
import { useStore } from '../../lib/store';
import toast from 'react-hot-toast';

export default function PrivacySettings() {
  const { fingerprintDefenseSettings, updateFingerprintDefenseSetting, resetFingerprintDefenseSettings } = useStore();

  const handleToggle = (key: keyof typeof fingerprintDefenseSettings) => {
    const newValue = !fingerprintDefenseSettings[key];
    updateFingerprintDefenseSetting(key, newValue);
    toast.success(newValue ? `${formatLabel(key)} enabled` : `${formatLabel(key)} disabled`, {
      icon: newValue ? '🛡️' : 'ℹ️',
    });
  };

  const handleReset = () => {
    resetFingerprintDefenseSettings();
    toast.success('Fingerprint defense settings reset to defaults', { icon: '🔄' });
  };

  const formatLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const getDescription = (key: keyof typeof fingerprintDefenseSettings): string => {
    const descriptions: Record<keyof typeof fingerprintDefenseSettings, string> = {
      enabled: 'Master switch for all fingerprint defenses',
      randomizeCanvas: 'Adds subtle noise to canvas operations to prevent canvas fingerprinting',
      randomizeWebGL: 'Randomizes WebGL parameters used for device fingerprinting',
      randomizeAudioContext: 'Adds noise to audio processing to prevent audio fingerprinting',
      spoofUserAgent: 'Randomizes user agent string (may break some sites)',
      spoofFonts: 'Protects against font-based fingerprinting',
      disableReferer: 'Strips referer headers from outgoing requests',
      randomizeTimezone: 'Slightly offsets timezone (may affect time display)',
      randomizeScreenMetrics: 'Randomizes screen dimensions (may affect layouts)',
    };
    return descriptions[key];
  };

  const getWarning = (key: keyof typeof fingerprintDefenseSettings): string | null => {
    const warnings: Partial<Record<keyof typeof fingerprintDefenseSettings, string>> = {
      spoofUserAgent: '⚠️ May break compatibility with some websites',
      randomizeTimezone: '⚠️ May cause time display inconsistencies',
      randomizeScreenMetrics: '⚠️ May affect responsive layouts',
    };
    return warnings[key] || null;
  };

  const settingGroups = [
    {
      title: 'Master Control',
      icon: Shield,
      settings: ['enabled' as const],
    },
    {
      title: 'Rendering & Media',
      icon: Eye,
      settings: ['randomizeCanvas' as const, 'randomizeWebGL' as const, 'randomizeAudioContext' as const],
    },
    {
      title: 'Browser Information',
      icon: Activity,
      settings: ['spoofUserAgent' as const, 'spoofFonts' as const, 'disableReferer' as const],
    },
    {
      title: 'System Metrics',
      icon: AlertCircle,
      settings: ['randomizeTimezone' as const, 'randomizeScreenMetrics' as const],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-white">Fingerprint Defense</h2>
              <p className="text-sm text-gray-400">Protect against browser fingerprinting</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-surface/50 hover:bg-surface rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-gray-300 space-y-2">
              <p className="font-semibold text-blue-300">About Fingerprint Defense</p>
              <ul className="space-y-1 text-xs">
                <li>• Protects your privacy by making your browser harder to track</li>
                <li>• Uses session-seeded randomization for consistent behavior within a session</li>
                <li>• Settings are saved locally and persist across sessions</li>
                <li>• Some protections may affect website functionality - disable if needed</li>
              </ul>
            </div>
          </div>
        </div>

        {settingGroups.map((group) => (
          <div key={group.title} className="mb-6 last:mb-0">
            <div className="flex items-center space-x-2 mb-3">
              <group.icon className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-white">{group.title}</h3>
            </div>
            <div className="space-y-3">
              {group.settings.map((key) => {
                const isEnabled = fingerprintDefenseSettings[key];
                const warning = getWarning(key);
                const isMasterDisabled = key !== 'enabled' && !fingerprintDefenseSettings.enabled;

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border transition-all ${
                      isMasterDisabled
                        ? 'bg-surface/20 border-white/5 opacity-50'
                        : isEnabled
                        ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'
                        : 'bg-surface/30 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <label
                            htmlFor={`toggle-${key}`}
                            className={`font-medium cursor-pointer ${
                              isMasterDisabled ? 'text-gray-500' : 'text-white'
                            }`}
                          >
                            {formatLabel(key)}
                          </label>
                          {isEnabled && !isMasterDisabled && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{getDescription(key)}</p>
                        {warning && (
                          <p className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
                            {warning}
                          </p>
                        )}
                      </div>
                      <button
                        id={`toggle-${key}`}
                        onClick={() => handleToggle(key)}
                        disabled={isMasterDisabled}
                        className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          isMasterDisabled
                            ? 'bg-gray-700 cursor-not-allowed'
                            : isEnabled
                            ? 'bg-green-500'
                            : 'bg-gray-600'
                        }`}
                        aria-label={`Toggle ${formatLabel(key)}`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                            isEnabled && !isMasterDisabled ? 'translate-x-7' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm text-gray-300 space-y-2">
            <p className="font-semibold text-yellow-300">Important Notes</p>
            <ul className="space-y-1 text-xs">
              <li>• Changes take effect immediately but may require page reload for full effect</li>
              <li>• Fingerprint defenses are initialized before app render for maximum protection</li>
              <li>• If you experience issues, try disabling individual protections</li>
              <li>• Settings marked with ⚠️ are disabled by default for accessibility/compatibility</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
