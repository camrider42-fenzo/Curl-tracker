/**
 * Curl Tracker — today.
 * The tall Pixel screen gets the log plus the week underneath. The near-square
 * Fold inner screen puts the week beside the log instead of below it.
 */
import { formatLong, formatShort, formatWeekday, trailingDays } from '../lib/dates.ts'
import { dayKind, loggedRange, zeroProductDates } from '../lib/zero-days.ts'
import type { LogRecord } from '../types.ts'
import { useSnapshot } from '../state/store.ts'
import { DataNote } from './data-note.tsx'
import { useLogPhotos } from './use-photos.ts'

export function Today() {
  const snap = useSnapshot()
  const dates = snap.logs.map((log) => log.date)
  const range = loggedRange(dates, snap.today)
  const zeros = zeroProductDates(dates, snap.today)
  const saved = new Set(dates)
  const todayLog = snap.logs.find((log) => log.date === snap.today) ?? null
  const counts = new Map<string, number>()
  for (const log of snap.logs) {
    for (const product of log.products) counts.set(product.name, (counts.get(product.name) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const week = trailingDays(snap.today, 7)

  return (
    <div class="today-layout">
      <div class="stack">
        <DataNote />
        {todayLog ? (
          <LogCard log={todayLog} />
        ) : (
          <section class="card today-card">
            {range ? <p class="badge-zero">0 · Zero-product day</p> : null}
            <h2>{range ? 'No log for today' : 'Nothing tracked yet'}</h2>
            <p>
              {range
                ? 'Today has no saved log, so it counts as a zero-product day until you add one.'
                : 'The first day you save starts your history. After that, any day you skip counts as a zero-product day.'}
            </p>
            <a class="btn btn-primary" href={`#/log/${snap.today}`} data-testid="log-today">
              Log today
            </a>
          </section>
        )}
      </div>
      <div class="stack">
        <section class="stats" aria-label="Stats">
          <div class="stat">
            <strong>{snap.logs.length}</strong>
            <span>Logged</span>
          </div>
          <div class="stat">
            <strong>{zeros.length}</strong>
            <span>Zero days</span>
          </div>
          <div class="stat">
            <strong>{snap.products.length}</strong>
            <span>In library</span>
          </div>
        </section>
        {top ? (
          <p class="meta">
            Most used: {top[0]} · {top[1]} {top[1] === 1 ? 'day' : 'days'}
          </p>
        ) : null}
        <section class="card">
          <h2 class="section-title">This week</h2>
          <div class="week">
            {week.map((iso) => {
              const kind = dayKind(iso, snap.today, saved, range)
              return (
                <a key={iso} class={`week-cell ${kind}`} href={`#/history/${iso}`}>
                  <span class="meta">{formatWeekday(iso).slice(0, 2)}</span>
                  <span class="day-num">{Number(iso.slice(8))}</span>
                  {kind === 'zero' ? <span class="day-mark">0</span> : kind === 'logged' ? <span class="day-mark day-dot" /> : <span class="day-mark" />}
                </a>
              )
            })}
          </div>
          <p class="meta week-caption">Week of {formatShort(week[0])} – {formatLong(snap.today).replace(/, \d{4}$/, '')}.</p>
        </section>
      </div>
    </div>
  )
}

function LogCard(props: { log: LogRecord }) {
  const urls = useLogPhotos(props.log)
  return (
    <section class="card today-card">
      <p class="eyebrow">Today's log</p>
      <h2>{formatLong(props.log.date)}</h2>
      {urls.length > 0 ? (
        <div class="photo-grid">
          {urls.map((url, index) => (
            <div key={url} class="photo-frame">
              <img src={url} alt={`Photo ${index + 1} from today's log`} />
            </div>
          ))}
        </div>
      ) : null}
      <p>{props.log.products.length > 0 ? props.log.products.map((product) => product.name).join(', ') : 'No products chosen.'}</p>
      {props.log.techniques.length > 0 ? (
        <p class="meta">{props.log.techniques.map((technique) => technique.name).join(' · ')}</p>
      ) : null}
      {props.log.notes ? <p class="notes">{props.log.notes}</p> : null}
      <a class="btn btn-primary" href={`#/log/${props.log.date}`} data-testid="edit-log">
        Edit log
      </a>
    </section>
  )
}
