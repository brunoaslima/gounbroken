import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initPostHog } from './lib/posthog'

initPostHog()

/**
 * Auto-reload when a new service worker takes control.
 *
 * Flow:
 *   1. New deploy → new sw.js is detected by the browser.
 *   2. Workbox installs the new SW (skipWaiting:true skips the waiting phase).
 *   3. clientsClaim:true makes it take control of all open tabs immediately.
 *   4. 'controllerchange' fires in every tab that just got the new SW.
 *   5. We reload → browser fetches new index.html (now served from new SW cache)
 *      → new JS bundle loads → no more black screen.
 *
 * The `refreshing` flag prevents an infinite reload loop in edge cases.
 */
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
