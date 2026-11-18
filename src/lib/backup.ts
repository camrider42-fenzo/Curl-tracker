/**
 * Curl Tracker — zip backup.
 *
 * `data.json` is schema-versioned. Every civil date from the first saved log
 * through the later of the last saved log and today is present. Missing logs
 * are explicit zero-product rows. Photo files live under `photos/` and are
 * named from the day, not from the in-browser id.
 *
 * Import ignores zero-product rows (they are derived) and replaces the
 * on-device library. Parsing happens before any write, so a bad zip leaves
 * the current library alone.
 */
import { unzip, zip, strFromU8, strToU8 } from 'fflate'
import { CATEGORIES, CATEGORY_NOTE, isCategoryId } from '../data/categories.ts'
import { PRESET_TECHNIQUES } from '../data/techniques.ts'
import type { CustomTechnique, LogRecord, PhotoRecord, Product, ProductRef, TechniqueRef } from '../types.ts'
import { createId } from './ids.ts'
import { eachDate, isISODate } from './dates.ts'
import { exportReadme } from './export-readme.ts'
import { APP_ID, SCHEMA_VERSION } from './schema.ts'
import { assertExportSpan, loggedRange } from './zero-days.ts'
import { MAX_PHOTOS, MIN_PHOTOS } from './photos.ts'
import { MAX_NOTES } from './validate.ts'
import type { RestorePayload } from '../db/db.ts'

export type { RestorePayload }

const PHOTO_PATH = /^photos\/[A-Za-z0-9._-]+$/

export interface ExportDay {
  date: string
  zeroProduct: boolean
  products: ProductRef[]
  techniques: TechniqueRef[]
  notes: string
  /** Paths relative to the zip root, in log order. */
  photos: string[]
  createdAt: string | null
  updatedAt: string | null
}

export interface ExportDocument {
  schemaVersion: typeof SCHEMA_VERSION
  app: typeof APP_ID
  exportedAt: string
  range: { start: string; end: string; inclusive: true } | null
  daysInclusive: number
  categoryNotes: string
  categories: { id: string; label: string }[]
  productLibrary: Product[]
  customTechniques: CustomTechnique[]
  techniquePresets: { id: string; name: string; group: string }[]
  days: ExportDay[]
}

export interface BackupInput {
  products: Product[]
  customTechniques: CustomTechnique[]
  logs: LogRecord[]
  photosById: Map<string, PhotoRecord>
  today: string
  exportedAt: string
}

function zeroDay(date: string): ExportDay {
  return {
    date,
    zeroProduct: true,
    products: [],
    techniques: [],
    notes: '',
    photos: [],
    createdAt: null,
    updatedAt: null,
  }
}

/** Pure document. Photo bytes are attached later by `buildBackupZip`. */
export function buildExportDocument(input: BackupInput): ExportDocument {
  const range = loggedRange(
    input.logs.map((log) => log.date),
    input.today,
  )
  if (range) assertExportSpan(range)
  const days: ExportDay[] = []
  const logsByDate = new Map(input.logs.map((log) => [log.date, log]))

  if (range) {
    for (const date of eachDate(range.start, range.end)) {
      const log = logsByDate.get(date)
      if (!log) {
        days.push(zeroDay(date))
        continue
      }
      // Numbered paths (`photos/YYYY-MM-DD-1.jpg`) follow the log's photo order.
      const photoPaths = log.photoIds.map((id, index) => {
        if (!input.photosById.has(id)) throw new Error(`The log on ${date} is missing a photo (${id}).`)
        return `photos/${date}-${index + 1}.jpg`
      })
      days.push({
        date,
        zeroProduct: false,
        products: log.products,
        techniques: log.techniques,
        notes: log.notes,
        photos: photoPaths,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    app: APP_ID,
    exportedAt: input.exportedAt,
    range: range ? { start: range.start, end: range.end, inclusive: true } : null,
    daysInclusive: days.length,
    categoryNotes: CATEGORY_NOTE,
    categories: CATEGORIES.map((category) => ({ id: category.id, label: category.label })),
    productLibrary: input.products,
    customTechniques: input.customTechniques,
    techniquePresets: PRESET_TECHNIQUES.map((technique) => ({
      id: technique.id,
      name: technique.name,
      group: technique.group,
    })),
    days,
  }
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  const copy = new Uint8Array(await blob.arrayBuffer())
  return copy
}

function zipFiles(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data)))
  })
}

function unzipFiles(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(bytes, (error, data) => (error ? reject(error) : resolve(data)))
  })
}

export async function buildBackupZip(input: BackupInput): Promise<Uint8Array> {
  const document = buildExportDocument(input)
  const files: Record<string, Uint8Array> = {
    'data.json': strToU8(JSON.stringify(document, null, 2)),
    'README.md': strToU8(exportReadme()),
  }
  for (const day of document.days) {
    if (day.zeroProduct) continue
    const log = input.logs.find((item) => item.date === day.date)
    if (!log) throw new Error(`Missing log for ${day.date}.`)
    for (let index = 0; index < day.photos.length; index += 1) {
      const photo = input.photosById.get(log.photoIds[index])
      if (!photo) throw new Error(`The log on ${day.date} is missing a photo.`)
      files[day.photos[index]] = await blobBytes(photo.blob)
    }
  }
  return zipFiles(files)
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is not an object.`)
  return value as Record<string, unknown>
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is missing.`)
  return value
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is missing.`)
  return value
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be true or false.`)
  return value
}

function readProductRef(value: unknown, label: string): ProductRef {
  const record = asObject(value, label)
  if (!isCategoryId(record.category)) throw new Error(`${label} has a category this app does not use.`)
  return {
    id: asString(record.id, `${label} id`).trim(),
    name: asString(record.name, `${label} name`).trim(),
    category: record.category,
  }
}

function readTechniqueRef(value: unknown, label: string): TechniqueRef {
  const record = asObject(value, label)
  return {
    id: asString(record.id, `${label} id`).trim(),
    name: asString(record.name, `${label} name`).trim(),
    custom: asBoolean(record.custom, `${label} custom`),
  }
}

function readLibraryProduct(value: unknown, index: number): Product {
  const label = `productLibrary[${index}]`
  const record = asObject(value, label)
  if (!isCategoryId(record.category)) throw new Error(`${label} has a category this app does not use.`)
  return {
    id: asString(record.id, `${label} id`).trim(),
    name: asString(record.name, `${label} name`).trim(),
    category: record.category,
    custom: asBoolean(record.custom, `${label} custom`),
    createdAt: asString(record.createdAt, `${label} createdAt`),
    updatedAt: asString(record.updatedAt, `${label} updatedAt`),
  }
}

function readCustomTechnique(value: unknown, index: number): CustomTechnique {
  const label = `customTechniques[${index}]`
  const record = asObject(value, label)
  return {
    id: asString(record.id, `${label} id`).trim(),
    name: asString(record.name, `${label} name`).trim(),
    createdAt: asString(record.createdAt, `${label} createdAt`),
    updatedAt: asString(record.updatedAt, `${label} updatedAt`),
  }
}

function findZipFile(files: Record<string, Uint8Array>, path: string): Uint8Array | undefined {
  return files[path] ?? files[`./${path}`]
}

export async function parseBackupZip(bytes: Uint8Array): Promise<RestorePayload> {
  let files: Record<string, Uint8Array>
  try {
    files = await unzipFiles(bytes)
  } catch {
    throw new Error('That file is not a zip backup.')
  }
  const rawJson = findZipFile(files, 'data.json')
  if (!rawJson) throw new Error('This zip has no data.json. Export a backup from Curl Tracker and try that file.')
  let parsed: unknown
  try {
    parsed = JSON.parse(strFromU8(rawJson))
  } catch {
    throw new Error('data.json is not valid JSON.')
  }
  const doc = asObject(parsed, 'data.json')
  if (doc.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`This backup uses schema version ${String(doc.schemaVersion)}. This app reads version ${SCHEMA_VERSION}.`)
  }
  if (doc.app !== APP_ID) throw new Error('This zip is not a Curl Tracker backup.')

  const products = asArray(doc.productLibrary, 'productLibrary').map((item, index) => readLibraryProduct(item, index))
  const productIds = new Set<string>()
  for (const product of products) {
    if (productIds.has(product.id)) throw new Error(`The product id ${product.id} is listed twice.`)
    productIds.add(product.id)
  }
  const techniques = asArray(doc.customTechniques, 'customTechniques').map((item, index) => readCustomTechnique(item, index))
  const techniqueIds = new Set<string>()
  for (const technique of techniques) {
    if (techniqueIds.has(technique.id)) throw new Error(`The technique id ${technique.id} is listed twice.`)
    techniqueIds.add(technique.id)
  }

  const logs: LogRecord[] = []
  const photos: PhotoRecord[] = []
  const seenDates = new Set<string>()
  for (const [index, value] of asArray(doc.days, 'days').entries()) {
    const label = `days[${index}]`
    const day = asObject(value, label)
    const date = asString(day.date, `${label} date`)
    if (!isISODate(date)) throw new Error(`${label} has a bad date.`)
    if (seenDates.has(date)) throw new Error(`${date} appears twice in the backup.`)
    seenDates.add(date)
    const zeroProduct = asBoolean(day.zeroProduct, `${label} zeroProduct`)
    const dayProducts = asArray(day.products, `${label} products`).map((item, productIndex) =>
      readProductRef(item, `${label} products[${productIndex}]`),
    )
    const dayTechniques = asArray(day.techniques, `${label} techniques`).map((item, techniqueIndex) =>
      readTechniqueRef(item, `${label} techniques[${techniqueIndex}]`),
    )
    const notes = typeof day.notes === 'string' ? day.notes : null
    if (notes === null) throw new Error(`${label} notes must be a string.`)
    if (notes.trim().length > MAX_NOTES) throw new Error(`${label} notes are too long.`)
    const photoPaths = asArray(day.photos, `${label} photos`).map((item, photoIndex) => {
      if (typeof item !== 'string' || !PHOTO_PATH.test(item)) {
        throw new Error(`${label} photos[${photoIndex}] is not a safe photos/ path.`)
      }
      return item
    })
    if (zeroProduct) {
      if (dayProducts.length || dayTechniques.length || photoPaths.length || notes.trim()) {
        throw new Error(`${date} is marked zero-product but also has log data.`)
      }
      continue
    }
    if (photoPaths.length < MIN_PHOTOS || photoPaths.length > MAX_PHOTOS) {
      throw new Error(`${date} needs between ${MIN_PHOTOS} and ${MAX_PHOTOS} photos.`)
    }
    const createdAt = asString(day.createdAt, `${label} createdAt`)
    const updatedAt = asString(day.updatedAt, `${label} updatedAt`)
    const photoIds: string[] = []
    for (const path of photoPaths) {
      const bytesForPhoto = findZipFile(files, path)
      if (!bytesForPhoto || bytesForPhoto.byteLength === 0) throw new Error(`Missing ${path} in the backup.`)
      const id = createId()
      photoIds.push(id)
      // Copy into a fresh ArrayBuffer. A Uint8Array view of a SharedArrayBuffer
      // is not a BlobPart under the DOM lib TypeScript ships.
      const jpeg = new Uint8Array(bytesForPhoto.byteLength)
      jpeg.set(bytesForPhoto)
      photos.push({
        id,
        logDate: date,
        blob: new Blob([jpeg], { type: 'image/jpeg' }),
        width: 0,
        height: 0,
        createdAt,
      })
    }
    logs.push({
      date,
      products: dayProducts,
      techniques: dayTechniques,
      notes: notes.trim(),
      photoIds,
      createdAt,
      updatedAt,
    })
  }

  return { products, techniques, logs, photos }
}
