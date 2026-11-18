/**
 * Curl Tracker — ids.
 *
 * Seed products use stable `seed:` ids so a backup can round-trip them.
 * Everything the person creates uses a UUID.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}
