/**
 * Curl Tracker — IndexedDB storage.
 * Covers product permanence, photo blobs, editing a log, and the photo rule
 * at the storage boundary (not only in the form).
 */
import { describe, expect, it } from 'vitest'
import {
  addCustomTechnique,
  addProduct,
  deleteCustomTechnique,
  deleteProduct,
  getLog,
  getLogPhotos,
  initDatabase,
  listCustomTechniques,
  listLogs,
  listProducts,
  replaceAll,
  resetForTests,
  saveLog,
  updateProduct,
  type SaveLogInput,
} from '../src/db/db.ts'
import { SEED_PRODUCTS } from '../src/data/seed-products.ts'
import { buildBackupZip, parseBackupZip } from '../src/lib/backup.ts'

function jpeg(bytes: number[]): Blob {
  return new Blob([Uint8Array.from(bytes)], { type: 'image/jpeg' })
}

function draft(overrides: Partial<SaveLogInput> = {}): SaveLogInput {
  return {
    date: '2026-11-18',
    today: '2026-11-18',
    originalDate: null,
    products: [],
    techniques: [],
    notes: 'First save',
    photos: [{ id: 'photo-a', blob: jpeg([1, 2, 3, 4]), width: 800, height: 600 }],
    ...overrides,
  }
}

describe('product permanence', () => {
  it('seeds once and keeps a product the person adds across a restart', async () => {
    await initDatabase()
    const seeded = await listProducts()
    expect(seeded).toHaveLength(SEED_PRODUCTS.length)
    expect(seeded.some((product) => product.category === 'fillers')).toBe(true)
    expect(seeded.some((product) => product.category === 'sealers')).toBe(true)

    const created = await addProduct({ name: 'House flax gel', category: 'sealers' })
    expect(created.custom).toBe(true)

    // Close the connection without wiping the factory. This is a restart.
    await resetForTests()
    await initDatabase()
    const reopened = await listProducts()
    expect(reopened).toHaveLength(SEED_PRODUCTS.length + 1)
    expect(reopened.some((product) => product.id === created.id && product.name === 'House flax gel')).toBe(true)
  })

  it('edits and deletes library rows without resurrecting a deleted seed product', async () => {
    await initDatabase()
    const created = await addProduct({ name: 'House flax gel', category: 'sealers' })
    const edited = await updateProduct(created.id, { name: 'House flax jelly', category: 'fillers' })
    expect(edited.name).toBe('House flax jelly')
    expect(edited.category).toBe('fillers')
    expect(edited.createdAt).toBe(created.createdAt)

    const seed = (await listProducts()).find((product) => product.id === 'seed:cantu-curling-cream')
    expect(seed).toBeTruthy()
    await deleteProduct(seed!.id)
    await deleteProduct(created.id)
    await resetForTests()
    await initDatabase()
    const names = (await listProducts()).map((product) => product.id)
    expect(names).not.toContain('seed:cantu-curling-cream')
    expect(names).not.toContain(created.id)
  })

  it('rejects a duplicate product name and keeps custom techniques', async () => {
    await initDatabase()
    await expect(addProduct({ name: '  cantu shea butter coconut curling cream ', category: 'fillers' })).rejects.toThrow(
      /already/i,
    )
    const technique = await addCustomTechnique('Denman brush')
    await resetForTests()
    await initDatabase()
    expect((await listCustomTechniques()).map((item) => item.name)).toEqual(['Denman brush'])
    await deleteCustomTechnique(technique.id)
    expect(await listCustomTechniques()).toEqual([])
    await expect(addCustomTechnique('Scrunch')).rejects.toThrow(/already/i)
  })
})

describe('log storage', () => {
  it('refuses to save without a photo', async () => {
    await initDatabase()
    await expect(saveLog(draft({ photos: [] }))).rejects.toThrow(/photo/i)
    expect(await listLogs()).toEqual([])
  })

  it('stores the jpeg blob and keeps createdAt when the log is edited', async () => {
    await initDatabase()
    const smoothie = (await listProducts()).find((product) => product.id === 'seed:sheamoisture-curl-smoothie')!
    await saveLog(
      draft({
        products: [{ id: smoothie.id, name: smoothie.name, category: smoothie.category }],
        techniques: [{ id: 'preset:scrunch', name: 'Scrunch', custom: false }],
      }),
    )
    const first = await getLog('2026-11-18')
    const stored = await getLogPhotos('2026-11-18')
    expect(Array.from(new Uint8Array(await stored[0].blob.arrayBuffer()))).toEqual([1, 2, 3, 4])

    // Two saves in the same millisecond would share an ISO timestamp.
    await new Promise((resolve) => setTimeout(resolve, 5))
    await saveLog(
      draft({
        originalDate: '2026-11-18',
        notes: 'Edited note',
        photos: [{ id: 'photo-b', blob: jpeg([9, 9]), width: 1600, height: 1067 }],
        products: [{ id: smoothie.id, name: smoothie.name, category: smoothie.category }],
      }),
    )
    const second = await getLog('2026-11-18')
    expect(second?.createdAt).toBe(first?.createdAt)
    expect(second?.notes).toBe('Edited note')
    expect(second?.updatedAt).not.toBe(first?.updatedAt)
    const photos = await getLogPhotos('2026-11-18')
    expect(photos.map((item) => item.id)).toEqual(['photo-b'])
    expect(Array.from(new Uint8Array(await photos[0].blob.arrayBuffer()))).toEqual([9, 9])
  })

  it('moves a log onto an empty day and refuses to overwrite another log', async () => {
    await initDatabase()
    await saveLog(draft({ date: '2026-11-14', today: '2026-11-18' }))
    await saveLog(draft({ date: '2026-11-18', photos: [{ id: 'photo-b', blob: jpeg([2]), width: 10, height: 10 }] }))
    await expect(
      saveLog(
        draft({
          date: '2026-11-18',
          originalDate: '2026-11-14',
          photos: [{ id: 'photo-c', blob: jpeg([3]), width: 10, height: 10 }],
        }),
      ),
    ).rejects.toThrow(/already has a log/)
    expect(await getLog('2026-11-14')).toBeTruthy()

    await saveLog(
      draft({
        date: '2026-11-16',
        originalDate: '2026-11-14',
        photos: [{ id: 'photo-d', blob: jpeg([4]), width: 10, height: 10 }],
      }),
    )
    expect(await getLog('2026-11-14')).toBeUndefined()
    expect((await getLog('2026-11-16'))?.photoIds).toEqual(['photo-d'])
  })

  it('round-trips a saved log through a backup without storing zero days', async () => {
    await initDatabase()
    await saveLog(draft({ date: '2026-11-14', today: '2026-11-18' }))
    await saveLog(draft({ date: '2026-11-18', photos: [{ id: 'photo-b', blob: jpeg([7, 7]), width: 4, height: 4 }] }))
    await addProduct({ name: 'House flax gel', category: 'sealers' })
    const products = await listProducts()
    const logs = await listLogs()
    const photos = await getLogPhotos('2026-11-14').then(async (first) => {
      const second = await getLogPhotos('2026-11-18')
      return [...first, ...second]
    })
    const zip = await buildBackupZip({
      products,
      customTechniques: [],
      logs,
      photosById: new Map(photos.map((item) => [item.id, item])),
      today: '2026-11-18',
      exportedAt: '2026-11-18T18:00:00.000Z',
    })
    const payload = await parseBackupZip(zip)
    expect(payload.logs.map((item) => item.date)).toEqual(['2026-11-14', '2026-11-18'])
    await replaceAll(payload)
    const restored = await listLogs()
    expect(restored.map((item) => item.date)).toEqual(['2026-11-14', '2026-11-18'])
    expect((await listProducts()).some((item) => item.name === 'House flax gel')).toBe(true)
    // Seed flag stays set, so a restart does not merge the original seed back in
    // on top of the imported library. The import already contains the seed.
    await resetForTests()
    await initDatabase()
    expect(await listLogs()).toHaveLength(2)
  })
})
