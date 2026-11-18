/**
 * Curl Tracker — app shell.
 *
 * Reference portrait viewports:
 *   Galaxy Z Fold 5 cover   344 × 882   single column, tight padding
 *   Pixel 10 Pro            427 × 952   single column, tall ~20:9 phone
 *   Galaxy Z Fold 5 inner   690 × 829   near-square, two columns
 */
import { useEffect } from 'preact/hooks'
import { boot, useSnapshot } from '../state/store.ts'
import { useRoute } from '../router.ts'
import { formatLong } from '../lib/dates.ts'
import { Editor } from './editor.tsx'
import { History } from './history.tsx'
import { IconHistory, IconMore, IconProducts, IconToday, Mark } from './icons.tsx'
import { More } from './more.tsx'
import { Products } from './products.tsx'
import { Today } from './today.tsx'

const TABS = [
  { href: '#/today', label: 'Today', icon: IconToday, name: 'today' },
  { href: '#/history', label: 'History', icon: IconHistory, name: 'history' },
  { href: '#/products', label: 'Products', icon: IconProducts, name: 'products' },
  { href: '#/more', label: 'More', icon: IconMore, name: 'more' },
] as const

export function App() {
  const snap = useSnapshot()
  const route = useRoute()
  useEffect(() => {
    void boot()
  }, [])

  return (
    <div class="shell" data-testid={snap.ready ? 'app-ready' : 'app-loading'} data-date={snap.today}>
      <a class="skip" href="#main">
        Skip to content
      </a>
      <div class="column">
        {route.name === 'log' ? null : (
          <header class="app-header">
            <div class="brand">
              <Mark />
              <div>
                <p class="eyebrow">Daily curly routine</p>
                <h1 class="wordmark">Curl Tracker</h1>
              </div>
            </div>
            <p class="today-line">{formatLong(snap.today)}</p>
          </header>
        )}
        <main id="main" class="view">
          {!snap.ready && !snap.error ? <p class="status">Opening your log…</p> : null}
          {snap.error && !snap.ready ? (
            <section class="card stack">
              <h2>This browser could not open the log</h2>
              <p>{snap.error}</p>
              <button type="button" class="btn btn-primary" onClick={() => void boot()}>
                Try again
              </button>
            </section>
          ) : null}
          {snap.ready && route.name === 'today' ? <Today /> : null}
          {snap.ready && route.name === 'history' ? <History selected={route.date} /> : null}
          {snap.ready && route.name === 'products' ? <Products /> : null}
          {snap.ready && route.name === 'more' ? <More /> : null}
          {snap.ready && route.name === 'log' ? <Editor key={route.date} date={route.date} /> : null}
        </main>
      </div>
      <div class="tabbar-wrap">
        <nav class="tabbar" aria-label="Primary">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const current = route.name === tab.name || (route.name === 'log' && tab.name === 'today')
            return (
              <a key={tab.href} class="tab" href={tab.href} aria-current={current ? 'page' : undefined}>
                <Icon />
                <span class="nav-label">{tab.label}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
