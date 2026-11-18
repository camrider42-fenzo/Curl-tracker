/**
 * Curl Tracker — product library.
 * Preloaded products and products the person adds are the same kind of row:
 * editable, deletable, and still there after a restart.
 */
import { useState } from 'preact/hooks'
import { CATEGORIES, CATEGORY_NOTE, type CategoryId } from '../data/categories.ts'
import { addProduct, deleteProduct, updateProduct } from '../db/db.ts'
import { reload, useSnapshot } from '../state/store.ts'
import type { Product } from '../types.ts'
import { ConfirmDialog, Modal } from './modal.tsx'
import { ProductForm } from './product-form.tsx'

export function Products() {
  const snap = useSnapshot()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const q = query.trim().toLowerCase()
  const visible = snap.products.filter((product) => !q || product.name.toLowerCase().includes(q))

  async function save(input: { name: string; category: CategoryId }, existing: Product | null) {
    if (existing) await updateProduct(existing.id, input)
    else await addProduct(input)
    await reload()
    setEditing(null)
    setCreating(false)
  }

  return (
    <div class="stack">
      <p class="category-note" data-testid="category-note">
        {CATEGORY_NOTE}
      </p>
      <div class="library-tools">
        <label>
          Search products
          <input
            type="search"
            data-testid="product-search"
            placeholder="Search the library"
            value={query}
            onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
          />
        </label>
        <button type="button" class="btn btn-primary" data-testid="add-product" onClick={() => setCreating(true)}>
          Add product
        </button>
      </div>
      <div class="library">
        {CATEGORIES.map((category) => {
          const items = visible.filter((product) => product.category === category.id)
          if (q && items.length === 0) return null
          const expanded = q.length > 0 || open.has(category.id)
          return (
            <section key={category.id} class="card category" data-testid={`category-${category.id}`}>
              <button
                type="button"
                class="category-toggle"
                aria-expanded={expanded}
                onClick={() => {
                  const next = new Set(open)
                  if (next.has(category.id)) next.delete(category.id)
                  else next.add(category.id)
                  setOpen(next)
                }}
              >
                <span class="category-label">{category.label}</span>
                <span class="count">{items.length}</span>
              </button>
              {expanded ? (
                items.length === 0 ? (
                  <p class="meta">Nothing in this category.</p>
                ) : (
                  <ul class="plain-list">
                    {items.map((product) => (
                      <li key={product.id} class="product-row">
                        <div>
                          <div class="product-name">{product.name}</div>
                          {product.custom ? <div class="meta">Added by you</div> : null}
                        </div>
                        <button type="button" class="btn btn-ghost" onClick={() => setEditing(product)}>
                          Edit
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </section>
          )
        })}
      </div>
      {creating ? (
        <Modal title="New product" onClose={() => setCreating(false)}>
          <ProductForm onCancel={() => setCreating(false)} onSubmit={(input) => save(input, null)} />
        </Modal>
      ) : null}
      {editing ? (
        <Modal title="Edit product" onClose={() => setEditing(null)}>
          <ProductForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(input) => save(input, editing)}
            onDelete={() => {
              setPendingDelete(editing)
              setEditing(null)
            }}
          />
        </Modal>
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete this product?"
          body="It leaves the library. Logs you already saved keep the name they stored."
          confirmLabel="Delete product"
          testId="confirm-delete-product"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const id = pendingDelete.id
            setPendingDelete(null)
            void deleteProduct(id).then(() => reload())
          }}
        />
      ) : null}
    </div>
  )
}
