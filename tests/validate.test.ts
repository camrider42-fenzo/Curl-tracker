/**
 * Curl Tracker — photo requirement and log validation.
 */
import { describe, expect, it } from 'vitest'
import { fittedSize } from '../src/lib/photos.ts'
import { validateLog, type LogInput } from '../src/lib/validate.ts'

function valid(overrides: Partial<LogInput> = {}): LogInput {
  return {
    date: '2026-11-18',
    today: '2026-11-18',
    notes: 'Wash day.',
    photos: [{ id: 'photo-1' }],
    products: [],
    techniques: [],
    ...overrides,
  }
}

describe('photo size', () => {
  it('caps the long edge at 1600 and does not upscale', () => {
    expect(fittedSize(1800, 1200, 1600)).toEqual({ width: 1600, height: 1067 })
    expect(fittedSize(1200, 1800, 1600)).toEqual({ width: 1067, height: 1600 })
    expect(fittedSize(800, 600, 1600)).toEqual({ width: 800, height: 600 })
    expect(fittedSize(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 })
  })

  it('rejects a photo with no pixels', () => {
    expect(() => fittedSize(0, 100)).toThrow(/size/i)
  })
})

describe('log validation', () => {
  it('requires one photo and allows a log with no products', () => {
    expect(validateLog(valid())).toEqual([])
    expect(validateLog(valid({ products: [] }))).toEqual([])
  })

  it('rejects a log with no photo', () => {
    expect(validateLog(valid({ photos: [] })).join(' ')).toMatch(/at least one photo/i)
  })

  it('allows three photos and rejects a fourth', () => {
    expect(validateLog(valid({ photos: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }))).toEqual([])
    expect(validateLog(valid({ photos: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] })).join(' ')).toMatch(
      /up to 3/,
    )
  })

  it('rejects a future day and a date before 2000', () => {
    expect(validateLog(valid({ date: '2026-11-19' })).join(' ')).toMatch(/future/i)
    expect(validateLog(valid({ date: '1999-12-31' })).join(' ')).toMatch(/2000/)
  })

  it('rejects an incomplete product snapshot', () => {
    const errors = validateLog(
      valid({
        products: [{ id: '', name: 'Mystery cream', category: 'fillers' }],
      }),
    )
    expect(errors.join(' ')).toMatch(/product/i)
  })
})
