/**
 * Curl Tracker — object URLs for one log's photos.
 * Revoked when the log changes or the view unmounts so a long history
 * does not keep every JPEG alive.
 */
import { useEffect, useState } from 'preact/hooks'
import { getLogPhotos } from '../db/db.ts'
import type { LogRecord } from '../types.ts'

export function useLogPhotos(log: LogRecord | null): string[] {
  const [urls, setUrls] = useState<string[]>([])
  const token = log ? `${log.date}:${log.updatedAt}` : ''
  useEffect(() => {
    let cancel = false
    let created: string[] = []
    if (!log || log.photoIds.length === 0) {
      setUrls([])
      return
    }
    getLogPhotos(log.date)
      .then((rows) => {
        created = rows.map((row) => URL.createObjectURL(row.blob))
        if (cancel) {
          created.forEach((url) => URL.revokeObjectURL(url))
          return
        }
        setUrls(created)
      })
      .catch(() => {
        if (!cancel) setUrls([])
      })
    return () => {
      cancel = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [token])
  return urls
}
