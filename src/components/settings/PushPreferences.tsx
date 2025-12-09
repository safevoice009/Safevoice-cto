import { motion } from 'framer-motion';
import { Bell, MessageSquare, AtSign, AlertCircle, Newspaper } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function PushPreferences() {
  const alertPreferences = useStore((state) => state.alertPreferences);
  const updateAlertPreference = useStore((state) => state.updateAlertPreference);

  const preferences = [
    {
      key: 'messages',
      label: 'Messages',
      description: 'Receive notifications for new direct messages',
      icon: MessageSquare,
      color: 'text-blue-400',
    },
    {
      key: 'mentions',
      label: 'Mentions',
      description: 'Get notified when someone mentions you',
      icon: AtSign,
      color: 'text-purple-400',
    },
    {
      key: 'crisisAlerts',
      label: 'Crisis Alerts',
      description: 'Important safety alerts and crisis updates',
      icon: AlertCircle,
      color: 'text-red-400',
    },
    {
      key: 'dailyDigest',
      label: 'Daily Digest',
      description: 'Summary of daily activity and highlights',
      icon: Newspaper,
      color: 'text-green-400',
    },
  ] as const;

  const allEnabled = preferences.every((p) => alertPreferences[p.key]);

  const toggleAll = () => {
    const newValue = !allEnabled;
    preferences.forEach((p) => {
      updateAlertPreference(p.key, newValue);
    });
  };

  const handleToggle = (key: typeof preferences[number]['key']) => {
    updateAlertPreference(key, !alertPreferences[key]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Bell className="w-7 h-7 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-white">Push Notifications</h2>
            <p className="text-sm text-gray-400">Manage what alerts you receive</p>
          </div>
        </div>
        <button
          onClick={toggleAll}
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          {allEnabled ? 'Disable All' : 'Enable All'}
        </button>
      </div>

      <div className="space-y-4">
        {preferences.map((pref) => {
          const Icon = pref.icon;
          const isEnabled = !!alertPreferences[pref.key];

          return (
            <div
              key={pref.key}
              className="p-4 bg-surface/50 rounded-lg border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Icon className={`w-5 h-5 ${pref.color} mt-0.5`} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{pref.label}</h4>
                    <p className="text-xs text-gray-400">{pref.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(pref.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    isEnabled ? 'bg-primary' : 'bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`Toggle ${pref.label}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
