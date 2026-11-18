/**
 * Curl Tracker — stored records.
 *
 * A log keeps a snapshot of each product and technique (id, name, and
 * category or custom flag) so later library edits do not rewrite history.
 * Photos are separate Blob rows; the log only stores their ids, in order.
 */
import type { CategoryId } from './data/categories.ts'

export interface ProductRef {
  id: string
  name: string
  category: CategoryId
}

export interface TechniqueRef {
  id: string
  name: string
  custom: boolean
}

export interface Product {
  id: string
  name: string
  category: CategoryId
  /** False for the preloaded library, true for products the person added. */
  custom: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomTechnique {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface LogRecord {
  /** Civil date YYYY-MM-DD in the user's local timezone. Primary key. */
  date: string
  products: ProductRef[]
  techniques: TechniqueRef[]
  notes: string
  photoIds: string[]
  createdAt: string
  updatedAt: string
}

export interface PhotoRecord {
  id: string
  logDate: string
  /** JPEG bytes. IndexedDB stores this Blob on the device. */
  blob: Blob
  width: number
  height: number
  createdAt: string
}
