/**
 * Curl Tracker — log editor.
 * One photo is required and three is the maximum. Pictures are resized in the
 * browser before they are stored. Saving an existing day keeps its createdAt.
 * The save action stays in the sticky bar so it is reachable on a tall Pixel
 * and on the shorter Fold inner screen.
 */
import { useEffect, useState } from 'preact/hooks'
import { addCustomTechnique, addProduct, deleteLog, getLog, getLogPhotos, saveLog } from '../db/db.ts'
import { formatShort } from '../lib/dates.ts'
import { errorMessage } from '../lib/errors.ts'
import { createId } from '../lib/ids.ts'
import { compressImage, formatBytes, MAX_PHOTOS } from '../lib/photos.ts'
import { validateLog } from '../lib/validate.ts'
import { allowNextNavigation, setLeaveGuard } from '../router.ts'
import { reload, useSnapshot } from '../state/store.ts'
import type { ProductRef, TechniqueRef } from '../types.ts'
import { ConfirmDialog } from './modal.tsx'
import { ProductPicker } from './product-picker.tsx'
import { TechniquePicker } from './technique-picker.tsx'

interface DraftPhoto {
  id: string
  blob: Blob
  width: number
  height: number
  url: string
}

interface Draft {
  originalDate: string | null
  date: string
  products: ProductRef[]
  techniques: TechniqueRef[]
  notes: string
  photos: DraftPhoto[]
}

function emptyDraft(date: string): Draft {
  return { originalDate: null, date, products: [], techniques: [], notes: '', photos: [] }
}

function fingerprint(draft: Draft): string {
  return JSON.stringify({
    date: draft.date,
    notes: draft.notes,
    products: draft.products.map((product) => product.id),
    techniques: draft.techniques.map((technique) => technique.id),
    photos: draft.photos.map((photo) => photo.id),
  })
}

export function Editor(props: { date: string }) {
  const snap = useSnapshot()
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(props.date))
  const [baseline, setBaseline] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty = loaded && fingerprint(draft) !== baseline

  useEffect(() => {
    setLeaveGuard(dirty ? 'Leave without saving this log?' : null, `#/log/${props.date}`)
    return () => setLeaveGuard(null, '')
  }, [dirty, props.date])

  useEffect(() => {
    let cancel = false
    const created: string[] = []
    setLoaded(false)
    setError(null)
    getLog(props.date)
      .then(async (existing) => {
        if (cancel) return
        if (!existing) {
          const next = emptyDraft(props.date)
          setDraft(next)
          setBaseline(fingerprint(next))
          setLoaded(true)
          return
        }
        const photos = await getLogPhotos(props.date)
        if (cancel) return
        const next: Draft = {
          originalDate: existing.date,
          date: existing.date,
          products: existing.products,
          techniques: existing.techniques,
          notes: existing.notes,
          photos: photos.map((photo) => {
            const url = URL.createObjectURL(photo.blob)
            created.push(url)
            return { id: photo.id, blob: photo.blob, width: photo.width, height: photo.height, url }
          }),
        }
        setDraft(next)
        setBaseline(fingerprint(next))
        setLoaded(true)
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(errorMessage(caught))
      })
    return () => {
      cancel = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [props.date])

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const room = MAX_PHOTOS - draft.photos.length
    if (room <= 0) {
      setError(`A log can hold up to ${MAX_PHOTOS} photos.`)
      return
    }
    const files = [...list].slice(0, room)
    if (list.length > room) setError(`Only ${MAX_PHOTOS} photos fit on a log. Extra pictures were left out.`)
    else setError(null)
    setBusy(true)
    try {
      const added: DraftPhoto[] = []
      for (const file of files) {
        const compressed = await compressImage(file)
        added.push({
          id: createId(),
          blob: compressed.blob,
          width: compressed.width,
          height: compressed.height,
          url: URL.createObjectURL(compressed.blob),
        })
      }
      setDraft((current) => ({ ...current, photos: [...current.photos, ...added] }))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  function removePhoto(id: string) {
    setDraft((current) => {
      const photo = current.photos.find((item) => item.id === id)
      if (photo) URL.revokeObjectURL(photo.url)
      return { ...current, photos: current.photos.filter((item) => item.id !== id) }
    })
  }

  async function save() {
    const problems = validateLog({
      date: draft.date,
      today: snap.today,
      notes: draft.notes,
      photos: draft.photos,
      products: draft.products,
      techniques: draft.techniques,
    })
    if (problems.length > 0) {
      setError(problems[0])
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveLog({
        date: draft.date,
        today: snap.today,
        originalDate: draft.originalDate,
        products: draft.products,
        techniques: draft.techniques,
        notes: draft.notes,
        photos: draft.photos.map((photo) => ({
          id: photo.id,
          blob: photo.blob,
          width: photo.width,
          height: photo.height,
        })),
      })
      await reload()
      allowNextNavigation()
      location.hash = draft.date === snap.today ? '#/today' : `#/history/${draft.date}`
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  async function destroy() {
    if (!draft.originalDate) return
    setBusy(true)
    try {
      await deleteLog(draft.originalDate)
      await reload()
      allowNextNavigation()
      location.hash = draft.originalDate === snap.today ? '#/today' : `#/history/${draft.originalDate}`
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  const backHref = props.date === snap.today ? '#/today' : `#/history/${props.date}`

  return (
    <div class="stack">
      <header class="editor-bar">
        <div class="editor-bar-row">
          <a class="btn btn-ghost" href={backHref}>
            Back
          </a>
          <h1 class="editor-title">{draft.originalDate ? `Edit ${formatShort(draft.date)}` : `Log ${formatShort(draft.date)}`}</h1>
          <button type="button" class="btn btn-primary" data-testid="save-log" disabled={!loaded || busy} onClick={() => void save()}>
            Save
          </button>
        </div>
        {error ? (
          <p class="form-error" data-testid="log-error" role="alert">
            {error}
          </p>
        ) : null}
      </header>
      {!loaded ? (
        <p class="status">Opening this day…</p>
      ) : (
        <div class="editor-grid" data-testid="editor-grid">
          <section class="card stack block-photos">
            <h2>Photos</h2>
            <p class="meta">At least one photo is required, up to {MAX_PHOTOS}. Pictures are resized to 1600px and stored on this device.</p>
            {draft.photos.length > 0 ? (
              <div class="photo-grid">
                {draft.photos.map((photo, index) => (
                  <figure key={photo.id} class="photo-tile">
                    <div class="photo-frame">
                      <img src={photo.url} alt={`Photo ${index + 1}`} />
                    </div>
                    <figcaption class="photo-meta">
                      {photo.width > 0 ? `${photo.width}×${photo.height} · ` : ''}
                      {formatBytes(photo.blob.size)}
                    </figcaption>
                    <button type="button" class="btn btn-ghost" onClick={() => removePhoto(photo.id)}>
                      Remove
                    </button>
                  </figure>
                ))}
              </div>
            ) : null}
            <div class="photo-actions">
              <button
                type="button"
                class="btn btn-ghost"
                disabled={draft.photos.length >= MAX_PHOTOS || busy}
                onClick={() => document.querySelector<HTMLInputElement>('[data-testid="photo-camera"]')?.click()}
              >
                Camera
              </button>
              <button
                type="button"
                class="btn btn-ghost"
                disabled={draft.photos.length >= MAX_PHOTOS || busy}
                onClick={() => document.querySelector<HTMLInputElement>('[data-testid="photo-gallery"]')?.click()}
              >
                Gallery
              </button>
            </div>
            <input
              class="visually-hidden"
              data-testid="photo-camera"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const input = event.currentTarget as HTMLInputElement
                void addFiles(input.files)
                input.value = ''
              }}
            />
            <input
              class="visually-hidden"
              data-testid="photo-gallery"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const input = event.currentTarget as HTMLInputElement
                void addFiles(input.files)
                input.value = ''
              }}
            />
            {busy ? <p class="meta">Preparing photo…</p> : null}
          </section>
          <section class="card stack block-products">
            <h2>Products</h2>
            <label>
              Date
              <input
                type="date"
                max={snap.today}
                min="2000-01-01"
                value={draft.date}
                onInput={(event) => {
                  const value = (event.currentTarget as HTMLInputElement).value
                  setDraft((current) => ({ ...current, date: value }))
                }}
              />
            </label>
            <ProductPicker
              products={snap.products}
              selected={draft.products}
              onChange={(products) => setDraft((current) => ({ ...current, products }))}
              onCreate={async (input) => {
                const created = await addProduct(input)
                await reload()
                return created
              }}
            />
          </section>
          <section class="card stack block-techniques">
            <h2>Techniques</h2>
            <TechniquePicker
              custom={snap.customTechniques}
              selected={draft.techniques}
              onChange={(techniques) => setDraft((current) => ({ ...current, techniques }))}
              onCreate={async (name) => {
                const created = await addCustomTechnique(name)
                await reload()
                return created
              }}
            />
          </section>
          <section class="card stack block-notes">
            <label>
              Notes
              <textarea
                data-testid="notes"
                maxLength={8000}
                value={draft.notes}
                placeholder="How the hair turned out, the weather, what to try next."
                onInput={(event) => {
                  const value = (event.currentTarget as HTMLTextAreaElement).value
                  setDraft((current) => ({ ...current, notes: value }))
                }}
              />
            </label>
            {draft.originalDate ? (
              <button type="button" class="btn btn-danger" data-testid="delete-log" onClick={() => setConfirmDelete(true)}>
                Delete log
              </button>
            ) : null}
          </section>
        </div>
      )}
      {confirmDelete ? (
        <ConfirmDialog
          title="Delete this log?"
          body="The photos go with it. If this day is inside your tracked range, it counts as a zero-product day again."
          confirmLabel="Delete log"
          testId="confirm-delete"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void destroy()}
        />
      ) : null}
    </div>
  )
}
