/**
 * Curl Tracker — entry.
 * Fonts are bundled (not loaded from a CDN) so the installed app can open offline.
 * The service worker is registered only for a production build; dev keeps a
 * fresh module graph.
 */
import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-700.css'
import '@fontsource/fraunces/latin-600.css'
import '@fontsource/fraunces/latin-700.css'
import './styles.css'
import { App } from './ui/app.tsx'

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}

const root = document.getElementById('app')
if (!root) throw new Error('Missing #app')
render(<App />, root)
