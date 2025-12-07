/**
 * Storage Settings Component
 * Allows users to configure storage preferences, enable/disable layers, set limits
 */

import { useStorageStore } from '../../lib/storageStore';
import { motion } from 'framer-motion';
import { Lock, Radio, Sliders } from 'lucide-react';

export function StorageSettings() {
  const storageStore = useStorageStore();

  const formatBytes = (bytes: number) => {
    const gb = bytes / 1024 / 1024 / 1024;
    return gb.toFixed(1) + ' GB';
  };

  const handlePreferenceChange = (pref: 'auto' | 'p2p' | 'ipfs' | 'github') => {
    storageStore.setStoragePreference(pref);
  };

  const handleMaxLocalStorageChange = (newValue: number) => {
    // Would update store with new value
    console.log('Max local storage changed to:', newValue);
  };

  return (
    <div className="space-y-6">
      {/* Storage Preference */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-background border border-border rounded-lg p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-text">Storage Preference</h3>
        </div>

        <div className="space-y-3">
          {[
            {
              value: 'auto',
              label: 'Auto (Recommended)',
              description: 'System chooses optimal storage based on content',
            },
            {
              value: 'p2p',
              label: 'P2P Storage',
              description: 'Share with peers when available',
            },
            {
              value: 'ipfs',
              label: 'IPFS Network',
              description: 'Distributed, resilient storage',
            },
            {
              value: 'github',
              label: 'GitHub LFS',
              description: 'Permanent archive (1GB quota)',
            },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-background/50 transition-colors"
            >
              <input
                type="radio"
                name="storage-preference"
                value={option.value}
                checked={storageStore.storagePreference === option.value}
                onChange={(e) =>
                  handlePreferenceChange(e.target.value as 'auto' | 'p2p' | 'ipfs' | 'github')
                }
                className="mt-1"
              />
              <div>
                <p className="font-medium text-text">{option.label}</p>
                <p className="text-sm text-text-muted">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </motion.div>

      {/* Storage Layers */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background border border-border rounded-lg p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-info" />
          <h3 className="text-lg font-semibold text-text">Storage Layers</h3>
        </div>

        <div className="space-y-4">
          {/* Local Storage */}
          <div className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Local Storage (IndexedDB)</p>
                <p className="text-sm text-text-muted">Encrypted on your device</p>
              </div>
              <div className="px-3 py-1 bg-success/10 text-success rounded text-sm font-medium">
                Always On
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Max Local Storage</span>
                <span className="font-medium text-text">
                  {formatBytes(storageStore.maxLocalStorage)}
                </span>
              </div>
              <input
                type="range"
                min={50 * 1024 * 1024}
                max={500 * 1024 * 1024}
                step={10 * 1024 * 1024}
                value={storageStore.maxLocalStorage}
                onChange={(e) => handleMaxLocalStorageChange(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-text-muted">50MB - 500MB</p>
            </div>
          </div>

          {/* P2P Storage */}
          <div className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">P2P Sharing</p>
                <p className="text-sm text-text-muted">Share media with peers</p>
              </div>
              <button
                onClick={() => storageStore.setEnableP2P(!storageStore.enableP2P)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  storageStore.enableP2P
                    ? 'bg-success/20 text-success'
                    : 'bg-border text-text-muted'
                }`}
              >
                {storageStore.enableP2P ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              ✓ End-to-end encrypted ✓ Private ✓ Free bandwidth
            </p>
          </div>

          {/* IPFS Storage */}
          <div className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">IPFS Network</p>
                <p className="text-sm text-text-muted">Distributed fallback storage</p>
              </div>
              <button
                onClick={() => storageStore.setEnableIPFS(!storageStore.enableIPFS)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  storageStore.enableIPFS
                    ? 'bg-success/20 text-success'
                    : 'bg-border text-text-muted'
                }`}
              >
                {storageStore.enableIPFS ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              ✓ Content-addressed ✓ Resilient ✓ No pinning service needed
            </p>
          </div>

          {/* Auto Backup */}
          <div className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Auto Backup</p>
                <p className="text-sm text-text-muted">Automatically backup to multiple layers</p>
              </div>
              <button
                onClick={() => storageStore.setAutoBackup(!storageStore.autoBackup)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  storageStore.autoBackup
                    ? 'bg-success/20 text-success'
                    : 'bg-border text-text-muted'
                }`}
              >
                {storageStore.autoBackup ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Popular content gets backed up to IPFS for redundancy
            </p>
          </div>
        </div>
      </motion.div>

      {/* Security Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-text">Security</h3>
        </div>

        <ul className="space-y-2 text-sm text-text-muted">
          <li>✓ All data encrypted with AES-256-GCM</li>
          <li>✓ Encryption key stored locally only</li>
          <li>✓ No central server knows your keys</li>
          <li>✓ Each user has unique encryption key</li>
          <li>✓ P2P transfers are end-to-end encrypted</li>
          <li>✓ IPFS content is content-addressed (hash verified)</li>
        </ul>
      </motion.div>

      {/* Privacy Policy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-info/5 border border-info/20 rounded-lg p-6 space-y-3"
      >
        <h3 className="text-lg font-semibold text-text">Privacy First</h3>

        <ul className="space-y-2 text-sm text-text-muted">
          <li>✓ Your data never leaves your control</li>
          <li>✓ Community peers store copies (encrypted)</li>
          <li>✓ IPFS is peer-to-peer (no servers)</li>
          <li>✓ GitHub LFS only used for public archives</li>
          <li>✓ No tracking, no analytics, no ads</li>
          <li>✓ You can delete everything anytime</li>
        </ul>
      </motion.div>
    </div>
  );
}
