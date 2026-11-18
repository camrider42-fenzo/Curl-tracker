/**
 * Curl Tracker — test setup.
 *
 * Each test gets a fresh in-memory IndexedDB. `resetForTests` drops the open
 * connection so the next call really opens the database again. Replacing
 * `indexedDB` drops the previous factory, which is what "a new browser" means.
 * A test that wants to prove data survives a restart calls `resetForTests`
 * itself and does not replace `indexedDB`.
 */
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach } from 'vitest'
import { resetForTests } from '../src/db/db.ts'

beforeEach(async () => {
  await resetForTests()
  globalThis.indexedDB = new IDBFactory() as unknown as typeof globalThis.indexedDB
})
