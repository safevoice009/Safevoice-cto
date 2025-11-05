import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import './styles/globals.css'
import './i18n/config'
import App from './App.tsx'
import { initializeFingerprintDefenses, DEFAULT_FINGERPRINT_SETTINGS } from './lib/privacy/fingerprint'

// Initialize fingerprint defenses before React render for maximum protection
if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
  try {
    const storedSettings = window.localStorage.getItem('safevoice_fingerprint_settings');
    const settings = storedSettings ? { ...DEFAULT_FINGERPRINT_SETTINGS, ...JSON.parse(storedSettings) } : DEFAULT_FINGERPRINT_SETTINGS;
    initializeFingerprintDefenses(settings);
  } catch (error) {
    console.warn('Failed to initialize fingerprint defenses:', error);
    initializeFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);
  }
} else {
  initializeFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
