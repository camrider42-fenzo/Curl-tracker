/**
 * Curl Tracker — save rules.
 *
 * A log needs a real calendar date that is not in the future and at least
 * one photo (three at most). Products and techniques are optional. An empty
 * product list on a saved log is not a zero-product day; only a missing log is.
 */
import { isCategoryId, type CategoryId } from '../data/categories.ts'
import { isISODate } from './dates.ts'
import { MAX_PHOTOS, MIN_PHOTOS } from './photos.ts'
import type { ProductRef, TechniqueRef } from '../types.ts'

export const MAX_NOTES = 8000
export const MAX_NAME = 80
export const MIN_LOG_DATE = '2000-01-01'

export interface LogInput {
  date: string
  today: string
  notes: string
  photos: readonly { id: string }[]
  products: readonly ProductRef[]
  techniques: readonly TechniqueRef[]
}

export function validateProductName(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!clean) throw new Error('Give the product a name.')
  if (clean.length > MAX_NAME) throw new Error(`Product names are limited to ${MAX_NAME} characters.`)
  return clean
}

export function validateTechniqueName(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!clean) throw new Error('Give the technique a name.')
  if (clean.length > 60) throw new Error('Technique names are limited to 60 characters.')
  return clean
}

export function validateCategory(value: unknown): CategoryId {
  if (!isCategoryId(value)) throw new Error('Choose a category.')
  return value
}

/** Returns human-readable problems. An empty array means the log can be saved. */
export function validateLog(input: LogInput): string[] {
  const errors: string[] = []
  if (!isISODate(input.date)) errors.push('Choose a valid date.')
  else if (input.date < MIN_LOG_DATE) errors.push('Choose a date in 2000 or later.')
  else if (input.date > input.today) errors.push('You cannot log a future day.')

  if (input.photos.length < MIN_PHOTOS) {
    errors.push('Add at least one photo. A log needs a picture to save.')
  } else if (input.photos.length > MAX_PHOTOS) {
    errors.push(`A log can hold up to ${MAX_PHOTOS} photos.`)
  }

  if (input.notes.trim().length > MAX_NOTES) {
    errors.push(`Notes are limited to ${MAX_NOTES} characters.`)
  }

  for (const product of input.products) {
    if (!product.id || !product.name.trim() || !isCategoryId(product.category)) {
      errors.push('A selected product is missing its name or category.')
      break
    }
  }
  for (const technique of input.techniques) {
    if (!technique.id || !technique.name.trim() || typeof technique.custom !== 'boolean') {
      errors.push('A selected technique is incomplete.')
      break
    }
  }
  return errors
}

export function assertValidLog(input: LogInput): void {
  const errors = validateLog(input)
  if (errors.length > 0) throw new Error(errors[0])
}
