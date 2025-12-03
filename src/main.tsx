import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import './styles/globals.css'
import './i18n/config'
import App from './App.tsx'
import { initializePrivacyProtections } from './lib/privacy/middleware'
import { registerSW } from 'virtual:pwa-register'

// Initialize basic privacy protections before rendering
// Fingerprint protections will be initialized in App.tsx when store is available
initializePrivacyProtections()

// Register service worker for offline support
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
