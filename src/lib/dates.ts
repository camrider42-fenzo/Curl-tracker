/**
 * Curl Tracker — civil dates.
 *
 * Every log is a calendar day in the user's local timezone, not a UTC
 * instant. Stepping with `setDate` (a calendar day) rather than adding
 * 86_400_000 ms keeps a day from being skipped or repeated across DST.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    parseISODate(value)
    return true
  } catch {
    return false
  }
}

/** Local midnight for a YYYY-MM-DD string. Throws if the calendar day is impossible. */
export function parseISODate(iso: string): Date {
  const match = ISO_DATE.exec(iso)
  if (!match) throw new Error(`Bad date: ${iso}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Bad date: ${iso}`)
  }
  return date
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(now = new Date()): string {
  return toISODate(now)
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Inclusive calendar span. Empty when `end` is before `start`. */
export function eachDate(start: string, end: string): string[] {
  if (start > end) return []
  const dates: string[] = []
  const cursor = parseISODate(start)
  const last = parseISODate(end).getTime()
  while (cursor.getTime() <= last) {
    dates.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/** Inclusive day count, DST-safe because both ends are UTC midnights of the civil date. */
export function daysInclusive(start: string, end: string): number {
  const startUtc = Date.UTC(
    parseISODate(start).getFullYear(),
    parseISODate(start).getMonth(),
    parseISODate(start).getDate(),
  )
  const endDate = parseISODate(end)
  const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  return Math.round((endUtc - startUtc) / 86_400_000) + 1
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  const first = parseISODate(`${month}-01`)
  const next = new Date(first.getFullYear(), first.getMonth() + delta, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Sunday-first month grid. `null` pads the days that belong to the
 * neighbouring months so the cells stay in seven columns.
 */
export function monthGrid(month: string): (string | null)[] {
  const first = parseISODate(`${month}-01`)
  const year = first.getFullYear()
  const monthIndex = first.getMonth()
  const count = new Date(year, monthIndex + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let index = 0; index < first.getDay(); index += 1) cells.push(null)
  for (let day = 1; day <= count; day += 1) {
    cells.push(toISODate(new Date(year, monthIndex, day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function trailingDays(end: string, count: number): string[] {
  const dates: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) dates.push(addDays(end, -offset))
  return dates
}

export function formatLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatWeekday(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', { weekday: 'short' })
}

export function formatMonth(month: string): string {
  const iso = month.length === 7 ? `${month}-01` : month
  return parseISODate(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
