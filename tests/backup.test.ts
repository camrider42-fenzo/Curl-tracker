/**
 * Curl Tracker — export schema, zero-day rows, and zip import.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { LogRecord, PhotoRecord, Product } from '../src/types.ts'
import { buildBackupZip, buildExportDocument, parseBackupZip, type BackupInput } from '../src/lib/backup.ts'
import { SCHEMA_VERSION } from '../src/lib/schema.ts'
import { eachDate } from '../src/lib/dates.ts'

function product(id: string, name: string): Product {
  return {
    id,
    name,
    category: 'fillers',
    custom: id.startsWith('seed:') ? false : true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  }
}

function photo(id: string, date: string, bytes: number[]): PhotoRecord {
  return {
    id,
    logDate: date,
    blob: new Blob([Uint8Array.from(bytes)], { type: 'image/jpeg' }),
    width: 1600,
    height: 1067,
    createdAt: '2026-11-14T15:00:00.000Z',
  }
}

function log(date: string, photoIds: string[], products: Product[] = []): LogRecord {
  return {
    date,
    products: products.map((item) => ({ id: item.id, name: item.name, category: item.category })),
    techniques: [{ id: 'preset:scrunch', name: 'Scrunch', custom: false }],
    notes: `Notes for ${date}`,
    photoIds,
    createdAt: `${date}T15:00:00.000Z`,
    updatedAt: `${date}T16:00:00.000Z`,
  }
}

function input(extra?: Partial<BackupInput>): BackupInput {
  const smoothie = product('seed:sheamoisture-curl-smoothie', 'SheaMoisture Coconut & Hibiscus Curl Enhancing Smoothie')
  const house = product('custom-1', 'House flax gel')
  house.category = 'sealers'
  const photos = [photo('p1', '2026-11-14', [1, 2, 3, 4]), photo('p2', '2026-11-18', [9, 8, 7])]
  const logs = [
    log('2026-11-14', ['p1'], [smoothie]),
    log('2026-11-18', ['p2'], []),
  ]
  return {
    products: [smoothie, house],
    customTechniques: [
      {
        id: 'tech-1',
        name: 'Denman brush',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    ],
    logs,
    photosById: new Map(photos.map((item) => [item.id, item])),
    today: '2026-11-18',
    exportedAt: '2026-11-18T18:00:00.000Z',
    ...extra,
  }
}

describe('export schema', () => {
  it('writes a versioned document with an explicit zero-product day for every gap', () => {
    const document = buildExportDocument(input())
    expect(document.schemaVersion).toBe(SCHEMA_VERSION)
    expect(document.app).toBe('curl-tracker')
    expect(document.range).toEqual({ start: '2026-11-14', end: '2026-11-18', inclusive: true })
    expect(document.days.map((day) => day.date)).toEqual(eachDate('2026-11-14', '2026-11-18'))
    expect(document.days.filter((day) => day.zeroProduct).map((day) => day.date)).toEqual([
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
    ])
    const zero = document.days[1]
    expect(zero).toEqual({
      date: '2026-11-15',
      zeroProduct: true,
      products: [],
      techniques: [],
      notes: '',
      photos: [],
      createdAt: null,
      updatedAt: null,
    })
    const logged = document.days[0]
    expect(logged.zeroProduct).toBe(false)
    expect(logged.products).toEqual([
      {
        id: 'seed:sheamoisture-curl-smoothie',
        name: 'SheaMoisture Coconut & Hibiscus Curl Enhancing Smoothie',
        category: 'fillers',
      },
    ])
    expect(logged.techniques[0]).toMatchObject({ id: 'preset:scrunch', name: 'Scrunch', custom: false })
    expect(logged.photos).toEqual(['photos/2026-11-14-1.jpg'])
    expect(logged.createdAt).toBe('2026-11-14T15:00:00.000Z')
    // A saved log with no products is still not a zero day.
    expect(document.days[4].zeroProduct).toBe(false)
    expect(document.days[4].products).toEqual([])
    expect(document.categoryNotes).toMatch(/Fillers/)
    expect(document.categoryNotes).toMatch(/Sealers/)
    expect(document.categoryNotes.toLowerCase()).not.toMatch(/stylers category/)
    expect(document.productLibrary.map((item) => item.name)).toContain('House flax gel')
  })

  it('exports an empty day list but keeps the library when nothing is logged', () => {
    const document = buildExportDocument({ ...input(), logs: [], photosById: new Map() })
    expect(document.range).toBeNull()
    expect(document.days).toEqual([])
    expect(document.productLibrary).toHaveLength(2)
  })

  it('refuses a corrupt range that would explode the zip', () => {
    const stray = log('1990-01-01', ['old'])
    expect(() =>
      buildExportDocument(
        input({
          logs: [stray, log('2026-11-18', ['p2'])],
          photosById: new Map([
            ['old', photo('old', '1990-01-01', [1])],
            ['p2', photo('p2', '2026-11-18', [2])],
          ]),
        }),
      ),
    ).toThrow(/too long/i)
  })
})

describe('zip round trip', () => {
  it('packs data.json, a schema README, and the photo folder', async () => {
    const bytes = await buildBackupZip(input())
    const files = unzipSync(bytes)
    expect(files['data.json']).toBeTruthy()
    expect(files['README.md']).toBeTruthy()
    expect(files['photos/2026-11-14-1.jpg']).toBeTruthy()
    expect(files['photos/2026-11-18-1.jpg']).toBeTruthy()
    const readme = strFromU8(files['README.md'])
    expect(readme).toMatch(/schema version 1/i)
    expect(readme).toMatch(/zeroProduct/)
    expect(readme).toMatch(/Fillers/)
    expect(readme).toMatch(/do not invent products/i)
    const data = JSON.parse(strFromU8(files['data.json'])) as { schemaVersion: number }
    expect(data.schemaVersion).toBe(1)
    expect(Array.from(files['photos/2026-11-14-1.jpg'])).toEqual([1, 2, 3, 4])
  })

  it('restores logs and photos and drops generated zero days', async () => {
    const restored = await parseBackupZip(await buildBackupZip(input()))
    expect(restored.logs.map((item) => item.date).sort()).toEqual(['2026-11-14', '2026-11-18'])
    expect(restored.products.map((item) => item.name)).toContain('House flax gel')
    expect(restored.techniques.map((item) => item.name)).toEqual(['Denman brush'])
    expect(restored.photos).toHaveLength(2)
    const first = restored.photos.find((item) => item.logDate === '2026-11-14')
    expect(Array.from(new Uint8Array(await first!.blob.arrayBuffer()))).toEqual([1, 2, 3, 4])
  })

  it('rejects a newer schema and a logged day with no photo', async () => {
    const bytes = await buildBackupZip(input())
    const files = unzipSync(bytes)
    const doc = JSON.parse(strFromU8(files['data.json'])) as { schemaVersion: number; days: { date: string; zeroProduct: boolean; photos: string[] }[] }
    doc.schemaVersion = 2
    files['data.json'] = strToU8(JSON.stringify(doc))
    await expect(parseBackupZip(zipSync(files))).rejects.toThrow(/schema version 2/)

    doc.schemaVersion = 1
    const day = doc.days.find((item) => item.date === '2026-11-18')
    day!.photos = []
    day!.zeroProduct = false
    files['data.json'] = strToU8(JSON.stringify(doc))
    await expect(parseBackupZip(zipSync(files))).rejects.toThrow(/photos/)
  })
})
