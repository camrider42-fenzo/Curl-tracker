/**
 * Curl Tracker — backup, restore, and custom techniques.
 * Export builds one zip: data.json, README.md, and photos/. Import replaces
 * this browser's library only after the zip has been checked.
 */
import { useEffect, useState } from 'preact/hooks'
import { deleteCustomTechnique, listPhotos, replaceAll } from '../db/db.ts'
import { buildBackupZip, parseBackupZip, type RestorePayload } from '../lib/backup.ts'
import { errorMessage } from '../lib/errors.ts'
import { reload, useSnapshot } from '../state/store.ts'
import { DataNote } from './data-note.tsx'
import { ConfirmDialog } from './modal.tsx'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
}

function downloadZip(bytes: Uint8Array, filename: string): void {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Revoke after the browser has started the download. Doing it in the same
  // turn can cancel the file on some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function More() {
  const snap = useSnapshot()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState<RestorePayload | null>(null)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [installEvent, setInstallEvent] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallPrompt)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function exportAll() {
    setBusy('Packing the backup…')
    setError(null)
    setMessage(null)
    try {
      const photos = await listPhotos()
      const bytes = await buildBackupZip({
        products: snap.products,
        customTechniques: snap.customTechniques,
        logs: snap.logs,
        photosById: new Map(photos.map((photo) => [photo.id, photo])),
        today: snap.today,
        exportedAt: new Date().toISOString(),
      })
      downloadZip(bytes, `curl-tracker-${snap.today}.zip`)
      setMessage('Backup downloaded. Keep that zip if you change phones or browsers.')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy('Reading the backup…')
    setError(null)
    setMessage(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setPending(await parseBackupZip(bytes))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div class="more-grid">
      <div class="more-span">
        <DataNote />
      </div>
      <section class="card stack">
        <h2>Backup</h2>
        <p>
          Export everything — logs, the product library, custom techniques, and photos — as one zip.
          Zero-product days are written into data.json for the days you skipped. Import replaces what is stored in this browser.
        </p>
        <button type="button" class="btn btn-primary" data-testid="export-all" disabled={busy !== null} onClick={() => void exportAll()}>
          Export all
        </button>
        <label class="btn btn-ghost file-button">
          Import zip
          <input
            class="visually-hidden"
            data-testid="import-zip"
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const input = event.currentTarget as HTMLInputElement
              const file = input.files?.[0]
              input.value = ''
              void onFile(file)
            }}
          />
        </label>
        {busy ? <p class="meta">{busy}</p> : null}
        {message ? <p class="ok-note">{message}</p> : null}
        {error ? (
          <p class="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {installEvent ? (
          <button
            type="button"
            class="btn btn-ghost"
            onClick={() => {
              void installEvent.prompt()
              setInstallEvent(null)
            }}
          >
            Install app
          </button>
        ) : (
          <p class="meta">Install Curl Tracker from the browser menu to open it full screen. After the first load it works offline.</p>
        )}
      </section>
      <section class="card stack">
        <h2>Your techniques</h2>
        {snap.customTechniques.length === 0 ? (
          <p class="meta">Techniques you add while logging are kept here until you remove them.</p>
        ) : (
          <ul class="plain-list">
            {snap.customTechniques.map((technique) => (
              <li key={technique.id} class="product-row">
                <span>{technique.name}</span>
                <button type="button" class="btn btn-ghost" onClick={() => setRemoveId(technique.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {pending ? (
        <ConfirmDialog
          title="Replace data on this device?"
          body={`This replaces the library in this browser with ${pending.logs.length} saved logs and ${pending.products.length} products. Zero-product days are rebuilt from those logs.`}
          confirmLabel="Replace everything"
          testId="confirm-import"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const payload = pending
            setPending(null)
            setBusy('Restoring…')
            void replaceAll(payload)
              .then(() => reload())
              .then(() => {
                setMessage(`Restored ${payload.logs.length} saved logs and ${payload.products.length} products.`)
                setBusy(null)
              })
              .catch((caught: unknown) => {
                setError(errorMessage(caught))
                setBusy(null)
              })
          }}
        />
      ) : null}
      {removeId ? (
        <ConfirmDialog
          title="Remove this technique?"
          body="It leaves the list for new logs. Days you already saved keep the name they stored."
          confirmLabel="Remove technique"
          testId="confirm-delete-technique"
          onCancel={() => setRemoveId(null)}
          onConfirm={() => {
            const id = removeId
            setRemoveId(null)
            void deleteCustomTechnique(id).then(() => reload())
          }}
        />
      ) : null}
    </div>
  )
}
