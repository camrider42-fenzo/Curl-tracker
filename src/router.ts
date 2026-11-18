/**
 * Curl Tracker — hash routes.
 *
 * Hash URLs keep the app on a static host: GitHub Pages only has to serve
 * index.html, and the day lives after the #. A dirty log editor can block
 * the next hash change until the person confirms they want to leave.
 */
import { useEffect, useState } from 'preact/hooks'
import { isISODate } from './lib/dates.ts'

export type Route =
  | { name: 'today' }
  | { name: 'history'; date: string | null }
  | { name: 'log'; date: string }
  | { name: 'products' }
  | { name: 'more' }

export function parseRoute(hash: string): Route {
  const path = (hash.startsWith('#') ? hash.slice(1) : hash).split('?')[0] || '/today'
  const parts = path.split('/').filter(Boolean)
  const head = parts[0] ?? 'today'
  if (head === 'history') return { name: 'history', date: isISODate(parts[1]) ? parts[1] : null }
  if (head === 'log' && isISODate(parts[1])) return { name: 'log', date: parts[1] }
  if (head === 'products') return { name: 'products' }
  if (head === 'more') return { name: 'more' }
  return { name: 'today' }
}

let guardMessage: string | null = null
let guardHash = ''
let skipGuard = false

export function setLeaveGuard(message: string | null, hash: string): void {
  guardMessage = message
  guardHash = hash
}

/** The next hash change is an intentional save or delete, not a stray tap. */
export function allowNextNavigation(): void {
  skipGuard = true
}

function consumeNavigation(): boolean {
  if (skipGuard) {
    skipGuard = false
    return false
  }
  if (!guardMessage) return false
  const stay = !window.confirm(guardMessage)
  if (stay) {
    skipGuard = true
    if (location.hash !== guardHash) location.hash = guardHash
    return true
  }
  guardMessage = null
  return false
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash))
  useEffect(() => {
    const onChange = () => {
      if (consumeNavigation()) return
      setRoute(parseRoute(location.hash))
    }
    window.addEventListener('hashchange', onChange)
    if (!location.hash) location.hash = '#/today'
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
