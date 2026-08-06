import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { registerSW } from 'virtual:pwa-register'
import { redirectAliasHostToPrimary } from './lib/canonicalHost'
import App from './App'
import './styles/index.css'

// Keep one origin so onboarding / prefs / Spotify session stay shared
if (!redirectAliasHostToPrimary()) {
  registerSW({ immediate: true })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <Analytics />
    </StrictMode>,
  )
}
