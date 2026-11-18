/**
 * Curl Tracker — create or edit a library product.
 * New products are written to IndexedDB immediately and stay until deleted.
 */
import { useState } from 'preact/hooks'
import { CATEGORIES, type CategoryId } from '../data/categories.ts'
import { errorMessage } from '../lib/errors.ts'
import type { Product } from '../types.ts'

export function ProductForm(props: {
  initial?: Product | null
  onSubmit: (input: { name: string; category: CategoryId }) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(props.initial?.name ?? '')
  const [category, setCategory] = useState<CategoryId>(props.initial?.category ?? 'fillers')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: Event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await props.onSubmit({ name, category })
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  return (
    <form class="stack" noValidate onSubmit={(event) => void submit(event)}>
      <label>
        Name
        <input
          value={name}
          maxLength={80}
          autoComplete="off"
          onInput={(event) => setName((event.currentTarget as HTMLInputElement).value)}
        />
      </label>
      <label>
        Category
        <select
          value={category}
          onChange={(event) => setCategory((event.currentTarget as HTMLSelectElement).value as CategoryId)}
        >
          {CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p class="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="submit" class="btn btn-primary" data-testid="save-product" disabled={busy}>
          Save product
        </button>
      </div>
      {props.onDelete ? (
        <button type="button" class="btn btn-danger btn-block" onClick={props.onDelete}>
          Delete product
        </button>
      ) : null}
    </form>
  )
}
