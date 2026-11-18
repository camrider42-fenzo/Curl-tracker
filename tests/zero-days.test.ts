/**
 * Curl Tracker — date and zero-day tests.
 * The zero-day rule is: no saved log inside the logged range counts as a
 * zero-product day, and a saved log never does, even with an empty product list.
 */
import { describe, expect, it } from 'vitest'
import { addDays, daysInclusive, eachDate, monthGrid, todayISO } from '../src/lib/dates.ts'
import { dayKind, loggedRange, zeroProductDates } from '../src/lib/zero-days.ts'

describe('civil dates', () => {
  it('steps across US daylight-saving transitions by calendar day', () => {
    expect(eachDate('2026-03-07', '2026-03-09')).toEqual(['2026-03-07', '2026-03-08', '2026-03-09'])
    expect(eachDate('2026-10-31', '2026-11-02')).toEqual(['2026-10-31', '2026-11-01', '2026-11-02'])
  })

  it('counts an inclusive span', () => {
    expect(daysInclusive('2026-11-14', '2026-11-18')).toBe(5)
    expect(addDays('2026-11-18', -4)).toBe('2026-11-14')
  })

  it('builds a Sunday-first grid for November 2026', () => {
    const grid = monthGrid('2026-11')
    expect(grid[0]).toBe('2026-11-01')
    expect(grid.filter(Boolean)).toHaveLength(30)
    expect(grid.length % 7).toBe(0)
  })

  it('formats today as a local civil date', () => {
    const now = new Date(2026, 10, 18, 23, 30)
    expect(todayISO(now)).toBe('2026-11-18')
  })
})

describe('zero-product days', () => {
  const today = '2026-11-18'

  it('has no range and no zero days before the first log', () => {
    expect(loggedRange([], today)).toBeNull()
    expect(zeroProductDates([], today)).toEqual([])
    expect(dayKind(today, today, new Set(), null)).toBe('untracked')
  })

  it('does not invent zeros when the only log is today', () => {
    expect(zeroProductDates(['2026-11-18'], today)).toEqual([])
    expect(dayKind('2026-11-17', today, new Set(['2026-11-18']), loggedRange(['2026-11-18'], today))).toBe(
      'untracked',
    )
  })

  it('fills every missing day from the first log through today', () => {
    const logs = ['2026-11-14', '2026-11-18']
    expect(loggedRange(logs, today)).toEqual({ start: '2026-11-14', end: '2026-11-18' })
    expect(zeroProductDates(logs, today)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17'])
  })

  it('treats a saved log as logged even when that log used no products', () => {
    const logs = new Set(['2026-11-14'])
    const range = loggedRange([...logs], today)
    expect(dayKind('2026-11-14', today, logs, range)).toBe('logged')
    expect(dayKind('2026-11-16', today, logs, range)).toBe('zero')
    expect(dayKind('2026-11-19', today, logs, range)).toBe('future')
    expect(dayKind('2026-11-01', today, logs, range)).toBe('untracked')
  })

  it('extends the range through a later log when today is behind it', () => {
    expect(loggedRange(['2026-11-20'], '2026-11-18')).toEqual({ start: '2026-11-20', end: '2026-11-20' })
  })
})
