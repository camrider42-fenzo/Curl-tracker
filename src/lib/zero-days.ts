/**
 * Curl Tracker — zero-product days.
 *
 * A zero-product day is a calendar date inside the logged range with no
 * saved log. It is not stored. History, stats, and the export all derive
 * it from the saved dates.
 *
 * The range starts on the earliest saved log and ends on the later of the
 * latest saved log and today. Days before the first log are untracked, not
 * zero. A saved log with an empty product list is still a logged day.
 */
import { daysInclusive, eachDate } from './dates.ts'

/** Above this, an export would be a corrupt or accidental date, not a routine. */
export const MAX_RANGE_DAYS = 12_000

export interface DateRange {
  start: string
  end: string
}

export type DayKind = 'logged' | 'zero' | 'future' | 'untracked'

export function loggedRange(logDates: readonly string[], today: string): DateRange | null {
  if (logDates.length === 0) return null
  const sorted = [...logDates].sort()
  const start = sorted[0]
  const lastLog = sorted[sorted.length - 1]
  return { start, end: lastLog > today ? lastLog : today }
}

export function assertExportSpan(range: DateRange): void {
  const span = daysInclusive(range.start, range.end)
  if (span > MAX_RANGE_DAYS) {
    throw new Error(
      `The logged range is ${span} days, which is too long to export. Delete the stray log and try again.`,
    )
  }
}

export function zeroProductDates(logDates: readonly string[], today: string): string[] {
  const range = loggedRange(logDates, today)
  if (!range) return []
  const saved = new Set(logDates)
  return eachDate(range.start, range.end).filter((date) => !saved.has(date))
}

export function dayKind(
  date: string,
  today: string,
  logDates: ReadonlySet<string>,
  range: DateRange | null,
): DayKind {
  if (logDates.has(date)) return 'logged'
  if (date > today) return 'future'
  if (range && date >= range.start && date <= range.end) return 'zero'
  return 'untracked'
}
