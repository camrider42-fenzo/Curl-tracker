/**
 * Curl Tracker — history.
 * A day with no log inside the tracked range shows a visible "0". Days before
 * the first log stay blank: they are not zero-product days.
 * On the Fold's inner screen the calendar and the selected day sit side by side.
 */
import { useState } from 'preact/hooks'
import { formatLong, formatMonth, formatShort, monthGrid, monthKey, shiftMonth } from '../lib/dates.ts'
import { dayKind, loggedRange, type DayKind } from '../lib/zero-days.ts'
import { useSnapshot } from '../state/store.ts'
import type { LogRecord } from '../types.ts'
import { cx } from './cx.ts'
import { useLogPhotos } from './use-photos.ts'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function kindText(kind: DayKind): string {
  if (kind === 'logged') return 'Log saved.'
  if (kind === 'zero') return 'Zero-product day. No log was saved.'
  if (kind === 'future') return 'Future day.'
  return 'Outside the tracked range.'
}

export function History(props: { selected: string | null }) {
  const snap = useSnapshot()
  const [month, setMonth] = useState(props.selected ? monthKey(props.selected) : monthKey(snap.today))
  const dates = snap.logs.map((log) => log.date)
  const range = loggedRange(dates, snap.today)
  const saved = new Set(dates)
  const cells = monthGrid(month)
  const selected = props.selected
  const selectedLog = selected ? snap.logs.find((log) => log.date === selected) ?? null : null
  const selectedKind = selected ? dayKind(selected, snap.today, saved, range) : null
  const rows = cells
    .filter((iso): iso is string => Boolean(iso))
    .filter((iso) => {
      const kind = dayKind(iso, snap.today, saved, range)
      return kind === 'logged' || kind === 'zero'
    })
    .reverse()

  return (
    <div class="stack">
      <div class="month-bar">
        <button type="button" class="btn btn-ghost" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
          Prev
        </button>
        <h2 data-testid="visible-month" data-month={month}>
          {formatMonth(month)}
        </h2>
        <button type="button" class="btn btn-ghost" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
          Next
        </button>
      </div>
      <ul class="legend">
        <li>
          <span class="swatch dot" aria-hidden="true" /> Logged
        </li>
        <li>
          <span class="swatch zero">0</span> Zero-product day
        </li>
      </ul>
      {!range ? (
        <p class="meta">Zero-product days show up after your first saved log. Until then, an empty day is just empty.</p>
      ) : null}
      <div class="history-layout" data-testid="history-layout">
        <div class="cal-wrap card">
          <div class="calendar" role="grid" aria-label={formatMonth(month)}>
            {WEEKDAYS.map((label) => (
              <div key={label} class="dow">
                {label}
              </div>
            ))}
            {cells.map((iso, index) =>
              iso ? (
                <button
                  key={iso}
                  type="button"
                  class={cx('day', dayKind(iso, snap.today, saved, range), selected === iso && 'is-selected')}
                  data-testid={`day-${iso}`}
                  data-kind={dayKind(iso, snap.today, saved, range)}
                  aria-label={`${formatLong(iso)}. ${kindText(dayKind(iso, snap.today, saved, range))}`}
                  aria-pressed={selected === iso}
                  disabled={iso > snap.today}
                  onClick={() => {
                    location.hash = `#/history/${iso}`
                  }}
                >
                  <span class="day-num">{Number(iso.slice(8))}</span>
                  {dayKind(iso, snap.today, saved, range) === 'zero' ? (
                    <span class="day-mark">0</span>
                  ) : dayKind(iso, snap.today, saved, range) === 'logged' ? (
                    <span class="day-mark day-dot" />
                  ) : (
                    <span class="day-mark" />
                  )}
                </button>
              ) : (
                <div key={`pad-${index}`} class="day pad" />
              ),
            )}
          </div>
        </div>
        <div class="day-detail card" data-testid="day-detail">
          {selected && selectedKind ? (
            <DayDetail date={selected} kind={selectedKind} log={selectedLog} today={snap.today} />
          ) : (
            <p class="meta">Select a day to see whether it was logged or counted as a zero-product day.</p>
          )}
        </div>
        <div class="day-list">
          {rows.length === 0 ? (
            <p class="meta">No logged or zero-product days in this month.</p>
          ) : (
            <ul class="plain-list">
              {rows.map((iso) => {
                const kind = dayKind(iso, snap.today, saved, range)
                const log = snap.logs.find((item) => item.date === iso)
                return (
                  <li key={iso}>
                    <a href={`#/history/${iso}`}>
                      <strong>{formatShort(iso)}</strong>
                      <span>{kind === 'zero' ? 'Zero-product day' : `${log?.products.length ?? 0} products`}</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function DayDetail(props: {
  date: string
  kind: DayKind
  log: LogRecord | null
  today: string
}) {
  const urls = useLogPhotos(props.log)
  if (props.kind === 'future') return <p>You cannot log a future day.</p>
  if (props.kind === 'zero') {
    return (
      <div class="stack">
        <p class="badge-zero">0 · Zero-product day</p>
        <h3>{formatLong(props.date)}</h3>
        <p>No log was saved, so this counts as a zero-product day. It stays that way in history, stats, and the export until you add a log.</p>
        <a class="btn btn-primary" href={`#/log/${props.date}`}>
          Add log
        </a>
      </div>
    )
  }
  if (props.kind === 'untracked') {
    return (
      <div class="stack">
        <h3>{formatLong(props.date)}</h3>
        <p>This day is before your first log, so it is not counted as a zero-product day.</p>
        {props.date <= props.today ? (
          <a class="btn btn-primary" href={`#/log/${props.date}`}>
            Add log
          </a>
        ) : null}
      </div>
    )
  }
  if (!props.log) return null
  return (
    <div class="stack">
      <h3>{formatLong(props.date)}</h3>
      {urls.length > 0 ? (
        <div class="photo-grid">
          {urls.map((url, index) => (
            <div key={url} class="photo-frame">
              <img src={url} alt={`Photo ${index + 1}`} />
            </div>
          ))}
        </div>
      ) : null}
      <p>{props.log.products.length > 0 ? props.log.products.map((product) => product.name).join(', ') : 'No products chosen.'}</p>
      {props.log.techniques.length > 0 ? <p class="meta">{props.log.techniques.map((item) => item.name).join(' · ')}</p> : null}
      {props.log.notes ? <p class="notes">{props.log.notes}</p> : null}
      <a class="btn btn-primary" href={`#/log/${props.date}`}>
        Edit log
      </a>
    </div>
  )
}
