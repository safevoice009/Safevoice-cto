import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import './styles/globals.css'
import './i18n/config'
import App from './App.tsx'
import { initializePrivacyProtections } from './lib/privacy/middleware'

// Initialize privacy protections before rendering
initializePrivacyProtections()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
