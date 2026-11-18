/** Curl Tracker — user-facing error text. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Something went wrong on this device.'
}
