/**
 * Curl Tracker — in-memory snapshot of the library.
 *
 * Views subscribe to this instead of reading IndexedDB on every render.
 * Mutations go through the database module, then `reload()`.
 */
import { useEffect, useState } from 'preact/hooks'
import { initDatabase, listCustomTechniques, listLogs, listProducts } from '../db/db.ts'
import { todayISO } from '../lib/dates.ts'
import { errorMessage } from '../lib/errors.ts'
import type { CustomTechnique, LogRecord, Product } from '../types.ts'

export interface Snapshot {
  ready: boolean
  error: string | null
  today: string
  products: Product[]
  customTechniques: CustomTechnique[]
  logs: LogRecord[]
}

let snapshot: Snapshot = {
  ready: false,
  error: null,
  today: todayISO(),
  products: [],
  customTechniques: [],
  logs: [],
}

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getSnapshot(): Snapshot {
  return snapshot
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let booting: Promise<void> | null = null

async function refresh(): Promise<void> {
  await initDatabase()
  const [products, customTechniques, logs] = await Promise.all([
    listProducts(),
    listCustomTechniques(),
    listLogs(),
  ])
  snapshot = { ready: true, error: null, today: todayISO(), products, customTechniques, logs }
  emit()
}

export function boot(): Promise<void> {
  if (!booting) {
    booting = refresh().catch((error: unknown) => {
      booting = null
      snapshot = { ...snapshot, ready: false, error: errorMessage(error) }
      emit()
    })
  }
  return booting
}

export function reload(): Promise<void> {
  return refresh()
}

export function useSnapshot(): Snapshot {
  const [snap, setSnap] = useState(snapshot)
  useEffect(() => {
    setSnap(getSnapshot())
    return subscribe(() => setSnap(getSnapshot()))
  }, [])
  return snap
}
