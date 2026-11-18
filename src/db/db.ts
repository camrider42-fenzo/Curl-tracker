/**
 * Curl Tracker — on-device database.
 *
 * Everything the app remembers lives in the IndexedDB database `curl-tracker`
 * in this browser profile. There is no account and no server.
 *
 *   products    library rows. Seeded once, then permanent until deleted.
 *   techniques  custom techniques only. Presets live in code.
 *   logs        one record per civil date.
 *   photos      JPEG blobs, indexed by the log date they belong to.
 *   meta        the one-time seed flag.
 *
 * Requests on a transaction are scheduled together, without an `await`
 * between them. IndexedDB commits a transaction as soon as control returns
 * to the event loop with no request outstanding.
 */
import { categoryIndex } from '../data/categories.ts'
import { SEED_PRODUCTS } from '../data/seed-products.ts'
import { PRESET_TECHNIQUES } from '../data/techniques.ts'
import type { CategoryId } from '../data/categories.ts'
import { createId } from '../lib/ids.ts'
import { assertValidLog, validateCategory, validateProductName, validateTechniqueName } from '../lib/validate.ts'
import type { CustomTechnique, LogRecord, PhotoRecord, Product, ProductRef, TechniqueRef } from '../types.ts'

const DB_NAME = 'curl-tracker'
const DB_VERSION = 1

type StoreName = 'products' | 'techniques' | 'logs' | 'photos' | 'meta'

interface MetaRecord {
  key: string
  value: boolean
}

let dbPromise: Promise<IDBDatabase> | null = null
let initPromise: Promise<void> | null = null

export async function resetForTests(): Promise<void> {
  initPromise = null
  if (dbPromise) {
    try {
      const db = await dbPromise
      db.close()
    } catch {
      // Opening may have failed; dropping the promise is enough.
    }
  }
  dbPromise = null
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('techniques')) db.createObjectStore('techniques', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'date' })
        if (!db.objectStoreNames.contains('photos')) {
          const photos = db.createObjectStore('photos', { keyPath: 'id' })
          photos.createIndex('byDate', 'logDate', { unique: false })
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        dbPromise = null
        reject(request.error ?? new Error('Could not open the on-device database.'))
      }
    })
  }
  return dbPromise
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('The database request failed.'))
  })
}

async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readonly')
  return requestToPromise(tx.objectStore(storeName).getAll() as IDBRequest<T[]>)
}

async function putValue(storeName: StoreName, value: unknown): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not save.'))
    tx.onabort = () => reject(tx.error ?? new Error('Could not save.'))
  })
}

async function deleteKey(storeName: StoreName, key: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not delete.'))
    tx.onabort = () => reject(tx.error ?? new Error('Could not delete.'))
  })
}

async function readMeta(key: string): Promise<boolean> {
  const db = await openDb()
  const tx = db.transaction('meta', 'readonly')
  const record = await requestToPromise(tx.objectStore('meta').get(key) as IDBRequest<MetaRecord | undefined>)
  return Boolean(record?.value)
}

function sortProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const byCategory = categoryIndex(a.category) - categoryIndex(b.category)
    if (byCategory !== 0) return byCategory
    return a.name.localeCompare(b.name)
  })
}

export async function listProducts(): Promise<Product[]> {
  return sortProducts(await getAll<Product>('products'))
}

export async function listCustomTechniques(): Promise<CustomTechnique[]> {
  const techniques = await getAll<CustomTechnique>('techniques')
  return techniques.sort((a, b) => a.name.localeCompare(b.name))
}

export async function listLogs(): Promise<LogRecord[]> {
  const logs = await getAll<LogRecord>('logs')
  return logs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export async function getLog(date: string): Promise<LogRecord | undefined> {
  const db = await openDb()
  const tx = db.transaction('logs', 'readonly')
  return requestToPromise(tx.objectStore('logs').get(date) as IDBRequest<LogRecord | undefined>)
}

export async function listPhotos(): Promise<PhotoRecord[]> {
  return getAll<PhotoRecord>('photos')
}

export async function getLogPhotos(date: string): Promise<PhotoRecord[]> {
  const log = await getLog(date)
  if (!log) return []
  const db = await openDb()
  const tx = db.transaction('photos', 'readonly')
  const rows = await requestToPromise(
    tx.objectStore('photos').index('byDate').getAll(date) as IDBRequest<PhotoRecord[]>,
  )
  const byId = new Map(rows.map((row) => [row.id, row]))
  return log.photoIds.flatMap((id) => {
    const photo = byId.get(id)
    return photo ? [photo] : []
  })
}

/**
 * Seed the library only when this browser has never been seeded.
 * A person who deletes every product, including the preloaded ones, keeps
 * an empty library. Reopening the app does not put the seed rows back.
 */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = seedIfNeeded().catch((error: unknown) => {
      initPromise = null
      throw error
    })
  }
  return initPromise
}

async function seedIfNeeded(): Promise<void> {
  const seeded = await readMeta('seeded')
  if (!seeded) {
    const existing = await listProducts()
    if (existing.length === 0) {
      const now = new Date().toISOString()
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['products', 'meta'], 'readwrite')
        const products = tx.objectStore('products')
        for (const seed of SEED_PRODUCTS) {
          const product: Product = { ...seed, custom: false, createdAt: now, updatedAt: now }
          products.put(product)
        }
        tx.objectStore('meta').put({ key: 'seeded', value: true } satisfies MetaRecord)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('Could not prepare the product library.'))
        tx.onabort = () => reject(tx.error ?? new Error('Could not prepare the product library.'))
      })
      return
    }
    await putValue('meta', { key: 'seeded', value: true } satisfies MetaRecord)
  }
}

async function assertUniqueProductName(name: string, ignoreId?: string): Promise<void> {
  const products = await listProducts()
  const clash = products.some(
    (product) => product.id !== ignoreId && product.name.toLowerCase() === name.toLowerCase(),
  )
  if (clash) throw new Error('A product with that name is already in the library.')
}

export async function addProduct(input: { name: string; category: CategoryId }): Promise<Product> {
  const name = validateProductName(input.name)
  const category = validateCategory(input.category)
  await assertUniqueProductName(name)
  const now = new Date().toISOString()
  const product: Product = { id: createId(), name, category, custom: true, createdAt: now, updatedAt: now }
  await putValue('products', product)
  return product
}

export async function updateProduct(
  id: string,
  input: { name: string; category: CategoryId },
): Promise<Product> {
  const name = validateProductName(input.name)
  const category = validateCategory(input.category)
  const products = await listProducts()
  const current = products.find((product) => product.id === id)
  if (!current) throw new Error('That product is no longer in the library.')
  await assertUniqueProductName(name, id)
  const next: Product = { ...current, name, category, updatedAt: new Date().toISOString() }
  await putValue('products', next)
  return next
}

/**
 * Removes a library row only. Saved logs keep the product snapshot they
 * stored, so history still shows what was used that day.
 */
export async function deleteProduct(id: string): Promise<void> {
  await deleteKey('products', id)
}

export async function addCustomTechnique(name: string): Promise<CustomTechnique> {
  const clean = validateTechniqueName(name)
  const custom = await listCustomTechniques()
  const taken = new Set<string>([
    ...PRESET_TECHNIQUES.map((technique) => technique.name.toLowerCase()),
    ...custom.map((technique) => technique.name.toLowerCase()),
  ])
  if (taken.has(clean.toLowerCase())) throw new Error('That technique is already on the list.')
  const now = new Date().toISOString()
  const technique: CustomTechnique = { id: createId(), name: clean, createdAt: now, updatedAt: now }
  await putValue('techniques', technique)
  return technique
}

export async function deleteCustomTechnique(id: string): Promise<void> {
  await deleteKey('techniques', id)
}

export interface SaveLogInput {
  date: string
  today: string
  /** Date of the log that was loaded. Null when this day has no log yet. */
  originalDate: string | null
  products: ProductRef[]
  techniques: TechniqueRef[]
  notes: string
  photos: { id: string; blob: Blob; width: number; height: number }[]
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }
  return result
}

export async function saveLog(input: SaveLogInput): Promise<LogRecord> {
  const notes = input.notes.trim()
  const products = dedupeById(input.products)
  const techniques = dedupeById(input.techniques)
  assertValidLog({ ...input, notes, products, techniques })

  const existingAtDate = await getLog(input.date)
  const existingOriginal =
    input.originalDate && input.originalDate !== input.date ? await getLog(input.originalDate) : existingAtDate

  if (!input.originalDate && existingAtDate) {
    throw new Error('That day already has a log. Open that day to edit it.')
  }
  if (input.originalDate && input.originalDate !== input.date && existingAtDate) {
    throw new Error('That day already has a log. Open that day to edit it.')
  }

  const now = new Date().toISOString()
  const createdAt =
    (input.originalDate ? existingOriginal?.createdAt : existingAtDate?.createdAt) ?? now
  const record: LogRecord = {
    date: input.date,
    products,
    techniques,
    notes,
    photoIds: input.photos.map((photo) => photo.id),
    createdAt,
    updatedAt: now,
  }
  const staleIds = new Set<string>([
    ...(existingAtDate?.photoIds ?? []),
    ...(existingOriginal?.photoIds ?? []),
  ])

  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['logs', 'photos'], 'readwrite')
    const logs = tx.objectStore('logs')
    const photos = tx.objectStore('photos')
    logs.put(record)
    if (input.originalDate && input.originalDate !== input.date) logs.delete(input.originalDate)
    for (const id of staleIds) photos.delete(id)
    for (const photo of input.photos) {
      const row: PhotoRecord = {
        id: photo.id,
        logDate: input.date,
        blob: photo.blob,
        width: photo.width,
        height: photo.height,
        createdAt: now,
      }
      photos.put(row)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not save the log.'))
    tx.onabort = () => reject(tx.error ?? new Error('Could not save the log.'))
  })
  return record
}

export async function deleteLog(date: string): Promise<void> {
  const existing = await getLog(date)
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['logs', 'photos'], 'readwrite')
    tx.objectStore('logs').delete(date)
    for (const id of existing?.photoIds ?? []) tx.objectStore('photos').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not delete the log.'))
    tx.onabort = () => reject(tx.error ?? new Error('Could not delete the log.'))
  })
}

export interface RestorePayload {
  products: Product[]
  techniques: CustomTechnique[]
  logs: LogRecord[]
  photos: PhotoRecord[]
}

/** Replace the whole library. Used by zip import. Marks the seed as done. */
export async function replaceAll(payload: RestorePayload): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['products', 'techniques', 'logs', 'photos', 'meta'], 'readwrite')
    tx.objectStore('products').clear()
    tx.objectStore('techniques').clear()
    tx.objectStore('logs').clear()
    tx.objectStore('photos').clear()
    for (const product of payload.products) tx.objectStore('products').put(product)
    for (const technique of payload.techniques) tx.objectStore('techniques').put(technique)
    for (const log of payload.logs) tx.objectStore('logs').put(log)
    for (const photo of payload.photos) tx.objectStore('photos').put(photo)
    tx.objectStore('meta').put({ key: 'seeded', value: true } satisfies MetaRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not restore the backup.'))
    tx.onabort = () => reject(tx.error ?? new Error('Could not restore the backup.'))
  })
}
