import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { registerSW } from 'virtual:pwa-register'
import { forceCacheBustOnce, stripCacheBustQuery } from './lib/cacheBust'
import { redirectAliasHostToPrimary } from './lib/canonicalHost'
import App from './App'
import './styles/index.css'

async function boot() {
  // Keep one origin so onboarding / prefs / Spotify session stay shared
  if (redirectAliasHostToPrimary()) return

  // One-time: drop old SW/caches so everyone gets the latest UI/assets
  if (await forceCacheBustOnce()) return
  stripCacheBustQuery()

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Check for a newer SW while the tab is open
      window.setInterval(() => {
        void registration.update()
      }, 60_000)
    },
    onNeedRefresh() {
      void updateSW(true)
    },
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <Analytics />
    </StrictMode>,
  )
}

void boot()
