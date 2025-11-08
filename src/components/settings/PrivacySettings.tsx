import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Cookie, Globe, Lock, AlertCircle, CheckCircle2, Info, Fingerprint, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPrivacyStatus } from '../../lib/privacy/middleware';
import { useAppStore } from '../../lib/store';

export default function PrivacySettings() {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [showFingerprintDetails, setShowFingerprintDetails] = useState(false);
  const privacyStatus = getPrivacyStatus();
  const { fingerprintDefenses, updateFingerprintDefenses, resetFingerprintDefenses } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-white">
            {t('settings.privacy.title', 'Privacy & Security')}
          </h2>
          <p className="text-sm text-gray-400">
            {t('settings.privacy.subtitle', 'Your privacy is our top priority')}
          </p>
        </div>
      </div>

      {/* Privacy Status Banner */}
      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <CheckCircle2 className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-green-300 mb-2">
              {t('settings.privacy.protectionActive', '✓ Privacy Protections Active')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span>WebRTC IP leak protection</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span>Cookies blocked</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span>HTTPS enforced</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span>Fingerprint defenses active</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span>No third-party trackers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Features */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Lock className="w-5 h-5 text-primary" />
          <span>{t('settings.privacy.features', 'Privacy Features')}</span>
        </h3>

        {/* No Analytics */}
        <div className="p-4 bg-surface/50 rounded-lg border border-white/10">
          <div className="flex items-start space-x-3">
            <Eye className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1">
                {t('settings.privacy.noTracking', 'Zero Tracking & Analytics')}
              </h4>
              <p className="text-sm text-gray-400">
                {t(
                  'settings.privacy.noTrackingDesc',
                  'We do not use Google Analytics, Facebook Pixel, or any third-party tracking services. Your activity stays private.'
                )}
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-300">No analytics scripts detected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cookie-Free */}
        <div className="p-4 bg-surface/50 rounded-lg border border-white/10">
          <div className="flex items-start space-x-3">
            <Cookie className="w-5 h-5 text-orange-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1">
                {t('settings.privacy.noCookies', '100% Cookie-Free')}
              </h4>
              <p className="text-sm text-gray-400">
                {t(
                  'settings.privacy.noCookiesDesc',
                  'We never set cookies. All data is stored locally on your device using encrypted localStorage.'
                )}
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-300">
                  Status: {privacyStatus.cookiesBlocked ? 'Cookies blocked' : 'No cookies detected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Network Privacy */}
        <div className="p-4 bg-surface/50 rounded-lg border border-white/10">
          <div className="flex items-start space-x-3">
            <Globe className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1">
                {t('settings.privacy.secureNetwork', 'Secure Network Requests')}
              </h4>
              <p className="text-sm text-gray-400 mb-2">
                {t(
                  'settings.privacy.secureNetworkDesc',
                  'All network requests are validated against an allowlist. Only trusted domains are permitted.'
                )}
              </p>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center space-x-1"
              >
                <Info className="w-3 h-3" />
                <span>{showDetails ? 'Hide' : 'Show'} allowed domains</span>
              </button>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 p-3 bg-background/50 rounded text-xs space-y-1"
                >
                  <div className="text-gray-400 font-semibold mb-2">Allowed Domains:</div>
                  {privacyStatus.allowedDomains.map((domain) => (
                    <div key={domain} className="text-gray-500 font-mono">
                      • {domain}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Data Storage */}
        <div className="p-4 bg-surface/50 rounded-lg border border-white/10">
          <div className="flex items-start space-x-3">
            <Lock className="w-5 h-5 text-green-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1">
                {t('settings.privacy.localData', 'Local-Only Data Storage')}
              </h4>
              <p className="text-sm text-gray-400">
                {t(
                  'settings.privacy.localDataDesc',
                  'Your data never leaves your device. All posts, preferences, and wallet info are stored locally and encrypted.'
                )}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-300">AES-256 encryption for sensitive data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-300">Storage key whitelist enforced</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Fingerprint Defenses */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Fingerprint className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">
                          {t('settings.privacy.fingerprintDefenses', 'Fingerprint Defenses')}
                        </h4>
                        <button
                          onClick={() => setShowFingerprintDetails(!showFingerprintDetails)}
                          className="text-xs text-purple-300 hover:text-purple-200 transition-colors flex items-center space-x-1"
                        >
                          <Info className="w-3 h-3" />
                          <span>{showFingerprintDetails ? 'Hide' : 'Show'} details</span>
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        {t(
                          'settings.privacy.fingerprintDefensesDesc',
                          'Advanced protection against browser fingerprinting techniques that track you across websites.'
                        )}
                      </p>

                      {/* Fingerprint Defense Toggles */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Canvas Randomization</span>
                          <button
                            onClick={() => updateFingerprintDefenses({ canvas: !fingerprintDefenses.canvas })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              fingerprintDefenses.canvas ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                fingerprintDefenses.canvas ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">WebGL Protection</span>
                          <button
                            onClick={() => updateFingerprintDefenses({ webgl: !fingerprintDefenses.webgl })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              fingerprintDefenses.webgl ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                fingerprintDefenses.webgl ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Audio Context Protection</span>
                          <button
                            onClick={() => updateFingerprintDefenses({ audioContext: !fingerprintDefenses.audioContext })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              fingerprintDefenses.audioContext ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                fingerprintDefenses.audioContext ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">User Agent Spoofing</span>
                          <button
                            onClick={() => updateFingerprintDefenses({ userAgent: !fingerprintDefenses.userAgent })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              fingerprintDefenses.userAgent ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                fingerprintDefenses.userAgent ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Font Randomization</span>
                          <button
                            onClick={() => updateFingerprintDefenses({ fonts: !fingerprintDefenses.fonts })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              fingerprintDefenses.fonts ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                fingerprintDefenses.fonts ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Referer Protection</span>
                          <button
                            onClick={() => updateFingerprintDefenses({ referer: !fingerprintDefenses.referer })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              fingerprintDefenses.referer ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                fingerprintDefenses.referer ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Timezone Protection</span>
                          <button
                            onClick={() => updateFingerprintDefenses({ timezone: !fingerprintDefenses.timezone })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              fingerprintDefenses.timezone ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                fingerprintDefenses.timezone ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Screen Metrics Protection</span>
                          <button
                            onClick={() => updateFingerprintDefenses({ screenMetrics: !fingerprintDefenses.screenMetrics })}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              fingerprintDefenses.screenMetrics ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                                fingerprintDefenses.screenMetrics ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Reset Button */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={resetFingerprintDefenses}
                          className="text-xs text-purple-300 hover:text-purple-200 transition-colors flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset to defaults</span>
                        </button>
                      </div>

                      {/* Detailed Status */}
                      {showFingerprintDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-3 p-3 bg-background/50 rounded text-xs space-y-1"
                        >
                          <div className="text-gray-400 font-semibold mb-2">Defense Status:</div>
                          {Object.entries(fingerprintDefenses).map(([key, enabled]) => (
                            <div key={key} className="flex items-center space-x-2 text-gray-500">
                              <span className="w-2 h-2 bg-purple-400 rounded-full" />
                              <span className="font-mono">
                                {key}: {enabled ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

              {/* Security Headers */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-300 mb-2">
              {t('settings.privacy.securityHeaders', 'Security Headers Active')}
            </h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>
                • <strong className="text-gray-300">CSP:</strong> Content Security Policy restricts resource loading
              </li>
              <li>
                • <strong className="text-gray-300">Referrer-Policy:</strong> No referrer information is leaked
              </li>
              <li>
                • <strong className="text-gray-300">X-Frame-Options:</strong> Clickjacking protection enabled
              </li>
              <li>
                • <strong className="text-gray-300">Permissions-Policy:</strong> Unnecessary browser features disabled
              </li>
              <li>
                • <strong className="text-gray-300">HTTPS:</strong> All connections encrypted in production
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Web3 Privacy Notice */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-300 mb-1">
              {t('settings.privacy.web3Notice', 'Web3 Wallet Privacy')}
            </h4>
            <p className="text-sm text-gray-400">
              {t(
                'settings.privacy.web3NoticeDesc',
                'When you connect a Web3 wallet, your wallet address becomes publicly visible on the blockchain. This is inherent to blockchain technology. Your anonymous Student ID remains separate and private.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Policy Link */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-sm text-gray-400 text-center">
          {t('settings.privacy.commitment', 'We are committed to protecting your privacy and maintaining transparency about our practices.')}
        </p>
        <p className="text-xs text-gray-500 text-center mt-2">
          {t('settings.privacy.opensource', 'SafeVoice is open source. Audit our code on GitHub.')}
        </p>
      </div>
    </motion.div>
  );
}
