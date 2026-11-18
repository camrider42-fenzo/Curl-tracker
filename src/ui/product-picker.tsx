/**
 * Curl Tracker — multi-select product picker for a log.
 * Choosing a product stores a snapshot. "New product" writes it to the
 * library first, so it is there for the next log too.
 */
import { useState } from 'preact/hooks'
import { CATEGORIES, type CategoryId } from '../data/categories.ts'
import type { Product, ProductRef } from '../types.ts'
import { Modal } from './modal.tsx'
import { ProductForm } from './product-form.tsx'

export function ProductPicker(props: {
  products: Product[]
  selected: ProductRef[]
  onChange: (next: ProductRef[]) => void
  onCreate: (input: { name: string; category: CategoryId }) => Promise<Product>
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const selectedIds = new Set(props.selected.map((item) => item.id))
  const q = query.trim().toLowerCase()
  const visible = props.products.filter((product) => !q || product.name.toLowerCase().includes(q))
  const missing = props.selected.filter((item) => !props.products.some((product) => product.id === item.id))

  function toggle(product: Product) {
    if (selectedIds.has(product.id)) {
      props.onChange(props.selected.filter((item) => item.id !== product.id))
      return
    }
    props.onChange([
      ...props.selected,
      { id: product.id, name: product.name, category: product.category },
    ])
  }

  return (
    <div class="stack">
      {props.selected.length > 0 ? (
        <ul class="chip-row">
          {props.selected.map((item) => (
            <li key={item.id}>
              <button type="button" class="chip is-on" onClick={() => props.onChange(props.selected.filter((row) => row.id !== item.id))}>
                {item.name}
                <span class="chip-x" aria-hidden="true">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p class="meta">No products selected. A log can still be saved without any.</p>
      )}
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
      {missing.map((item) => (
        <label key={item.id} class="check-row">
          <input type="checkbox" checked onChange={() => toggle({ ...item, custom: false, createdAt: '', updatedAt: '' })} />
          <span>
            {item.name}
            <small class="meta"> Removed from the library. Uncheck to drop it from this log.</small>
          </span>
        </label>
      ))}
      {CATEGORIES.map((category) => {
        const items = visible.filter((product) => product.category === category.id)
        if (items.length === 0) return null
        const expanded = q.length > 0 || open.has(category.id)
        const chosen = items.filter((product) => selectedIds.has(product.id)).length
        return (
          <section key={category.id}>
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
              <span class="count">
                {chosen > 0 ? `${chosen}/` : ''}
                {items.length}
              </span>
            </button>
            {expanded ? (
              <div>
                {items.map((product) => (
                  <label key={product.id} class="check-row">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggle(product)}
                    />
                    <span>{product.name}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </section>
        )
      })}
      <button type="button" class="btn btn-ghost" onClick={() => setCreating(true)}>
        New product
      </button>
      {creating ? (
        <Modal title="New product" onClose={() => setCreating(false)}>
          <p class="meta">This is saved to the library and can be used on other days.</p>
          <ProductForm
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              const created = await props.onCreate(input)
              props.onChange([
                ...props.selected,
                { id: created.id, name: created.name, category: created.category },
              ])
              setCreating(false)
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}
