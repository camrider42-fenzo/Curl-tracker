/**
 * Curl Tracker — preloaded library.
 * Fillers and Sealers replace Stylers and Hold. Oils are split by job.
 */
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../src/data/categories.ts'
import { SEED_PRODUCTS } from '../src/data/seed-products.ts'

describe('seeded categories', () => {
  it('uses Fillers and Sealers and not Stylers or Hold', () => {
    const labels = CATEGORIES.map((category) => category.label.toLowerCase())
    const ids = CATEGORIES.map((category) => category.id)
    expect(labels).toContain('fillers')
    expect(labels).toContain('sealers')
    expect(labels).toContain('cleansers/shampoo')
    expect(labels).toContain('treatments/masks')
    expect(ids.join(' ')).not.toMatch(/styler|hold/)
    expect(labels.join(' ')).not.toMatch(/styler|\bhold\b/)
  })

  it('puts every seed product in a real category and covers each category', () => {
    const ids = new Set(CATEGORIES.map((category) => category.id))
    expect(SEED_PRODUCTS.every((product) => ids.has(product.category))).toBe(true)
    for (const category of CATEGORIES) {
      expect(SEED_PRODUCTS.some((product) => product.category === category.id)).toBe(true)
    }
    const productIds = SEED_PRODUCTS.map((product) => product.id)
    expect(new Set(productIds).size).toBe(productIds.length)
  })

  it('keeps creams in Fillers and gels, mousses, and sprays in Sealers', () => {
    const fillers = SEED_PRODUCTS.filter((product) => product.category === 'fillers')
    const sealers = SEED_PRODUCTS.filter((product) => product.category === 'sealers')
    expect(fillers.some((product) => /curl enhancing smoothie/i.test(product.name))).toBe(true)
    expect(fillers.some((product) => /curling cream/i.test(product.name))).toBe(true)
    expect(fillers.some((product) => /curling custard/i.test(product.name))).toBe(true)
    expect(fillers.some((product) => /gel|mousse|hair spray|hairspray/i.test(product.name))).toBe(false)
    expect(sealers.some((product) => /gel/i.test(product.name))).toBe(true)
    expect(sealers.some((product) => /mousse/i.test(product.name))).toBe(true)
    expect(sealers.some((product) => /spray/i.test(product.name))).toBe(true)
  })

  it('splits oils into finishing sealers and treatment oils', () => {
    expect(
      SEED_PRODUCTS.some((product) => product.category === 'sealers' && /argan oil|ghost oil|coconut oil/i.test(product.name)),
    ).toBe(true)
    expect(
      SEED_PRODUCTS.some(
        (product) => product.category === 'treatments' && /rosemary mint scalp|jamaican black castor oil$|strength \+ moisture oil/i.test(product.name),
      ),
    ).toBe(true)
  })
})
