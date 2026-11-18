/**
 * Curl Tracker — text inside the backup zip.
 *
 * Written for a person and for an assistant that will analyze the JSON
 * without any other context. Field names match data.json.
 */
import { CATEGORIES, CATEGORY_NOTE } from '../data/categories.ts'
import { SCHEMA_VERSION } from './schema.ts'

export function exportReadme(): string {
  const categories = CATEGORIES.map((category) => `- \`${category.id}\` — ${category.label}`).join('\n')
  return `# Curl Tracker backup

This zip is a full backup of one browser's Curl Tracker library.
A person or an assistant can analyze hair routines from \`data.json\` and the JPEG files in \`photos/\`. Nothing in this archive is fetched from a server.

## Files

- \`data.json\` — schema version ${SCHEMA_VERSION}. UTF-8 JSON.
- \`photos/\` — JPEG files named by the paths in \`days[].photos\`.
- \`README.md\` — this file.

## Range

\`range\` is the inclusive civil-date span from the earliest saved log through the later of the latest saved log and the export day's local date. Every calendar date in that span appears exactly once in \`days\`, sorted ascending. \`range\` is \`null\` and \`days\` is \`[]\` when the person has not saved a log yet. The product library is still included.

\`daysInclusive\` is the number of dates in that span.

## How to read a day

\`days[].zeroProduct\` is the flag that matters:

- \`false\` — a log the person saved. It has 1 to 3 photos. \`products\` may still be an empty array when they saved a log without choosing products. \`createdAt\` and \`updatedAt\` are ISO-8601 timestamps.
- \`true\` — nobody saved a log for that date. Curl Tracker counts the day as a zero-product day in history, stats, and this export. \`products\`, \`techniques\`, and \`photos\` are empty, \`notes\` is \`""\`, and both timestamps are \`null\`. These rows are generated at export time. They are not stored in the app. Do not invent products, photos, or techniques for them.

A saved log with an empty \`products\` array is not a zero-product day. Only a missing log is.

## Dates

\`date\` is a civil date \`YYYY-MM-DD\` in the user's local timezone, not a UTC instant. Do not shift it by a timezone offset. \`exportedAt\` is an ISO-8601 timestamp for when the zip was built.

## Categories

${categories}

${CATEGORY_NOTE}

Product names on a day are the snapshot saved with that log. \`productLibrary\` is the current library and may have been renamed or deleted since. Match a day to the library by \`products[].id\` when the id is still there, and trust the snapshot for what was used that day.

\`productLibrary[].custom\` is \`false\` for a preloaded product and \`true\` for one the person added. Added products stay in the library until deleted.

## Photos

Paths are relative to the zip root and use forward slashes, for example \`photos/2026-11-18-1.jpg\`.
The number is the order on the log, from 1 to 3.
Files are JPEGs whose longest side is at most 1600 pixels.
On import, zero-product rows are skipped. The app rebuilds them from the saved logs.

## Techniques

\`techniquePresets\` lists the built-in techniques (\`id\`, \`name\`, \`group\`).
\`customTechniques\` lists techniques the person added. Those stay until deleted.
A day stores \`{ id, name, custom }\` as a snapshot. Preset ids look like \`preset:scrunch\`. Custom ids are random. \`custom: true\` means the technique was added by the person.

## Restoring

Importing this zip replaces the library on that device: products, custom techniques, logs, and photos. It does not merge.
`
}
