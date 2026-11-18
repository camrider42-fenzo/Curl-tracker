# Curl Tracker

A mobile-first log for a daily curly-hair routine. It is a static Progressive Web App: no accounts and no server. Logs, photos, and the product library stay in IndexedDB in this browser. Install it from the browser menu and it opens full screen, including offline, after the first load.

Layouts are tuned for three portrait screens:

| Screen | CSS pixels | Layout |
| --- | --- | --- |
| Galaxy Z Fold 5 cover | 344 × 882 | Single column, tight padding |
| Pixel 10 Pro | 427 × 952 (also 410 × 914) | Single column, taller week and calendar |
| Galaxy Z Fold 5 inner | 690 × 829 (about 18:21.6) | Two columns |

A wide but short window, including the cover in landscape, stays one column. The two-column layout starts only when both sides are at least 640px.

## What a day stores

Each saved day has an ISO date, product snapshots (`id`, `name`, `category`), techniques, notes, one to three photo blobs, and created/updated timestamps. Photos can come from the camera or the gallery. They are resized in the browser to a JPEG whose longest side is at most 1600px. The browser has to be able to decode the file (JPEG, PNG, or WebP). HEIC often fails in non-Apple browsers.

A log needs at least one photo. It can be saved with zero products. Editing a log updates that day in place.

Categories are Cleansers/Shampoo, Conditioners, Leave-ins, Fillers, Sealers, Treatments/Masks, and Other. There is no Stylers category and no Hold category. Creams, leave-in creams, and curl creams are Fillers. Gels, mousses, and hairsprays are Sealers. Finishing oils are Sealers. Scalp and treatment oils are Treatments/Masks. Products you add are kept in the library until you delete them. Deleting a preloaded product does not bring it back. A log keeps the name it stored, so later library edits do not rewrite history.

## Zero-product days

Zero-product days are not stored. They are every date from the first saved log through the later of the last saved log and today that has no log. Days before the first log are untracked. A saved log with an empty product list is a logged day, not a zero day. History draws a **0** on zero days, and the export writes an explicit row for each of them.

## Backup

**On this device only.** Export regularly. Export all downloads a zip with:

- `data.json` — schema version 1, the library, custom techniques, and every day in the logged range, including zero-product rows
- `photos/` — one JPEG per stored picture
- `README.md` — the schema, written so another tool can read the zip without this app

Import replaces everything in this browser. Zero-product rows are skipped on import and derived again from the saved logs. A corrupt span longer than 12,000 days is refused so a bad date cannot build a huge zip. The earliest date you can log is 2000-01-01.

## Run locally

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:47321](http://127.0.0.1:47321)

```bash
npm test
npm run build
npm run preview
```

Preview serves the production build, including the service worker, at [http://127.0.0.1:47322](http://127.0.0.1:47322).

`npm run build` is `tsc -b` and then Vite. With `BASE_PATH` unset, asset URLs are relative (`./`), so `dist/` can be dropped on any static host. Set `BASE_PATH` to `/repo-name/` when the site is served from a subpath.

```bash
npx playwright install chromium
npm run preview
npm run check:ui
```

`check:ui` runs the headless layout check against the preview server at the Fold cover, Fold inner, and Pixel 10 Pro sizes.

## GitHub Pages

`.github/workflows/pages.yml` tests, builds, and deploys `dist/` on every push to `main`. The workflow sets `BASE_PATH` to `/<repository>/` for a project site and `/` for a user or organization site (`<owner>.github.io`). Routes use the URL hash (`#/today`, `#/history`, `#/log/YYYY-MM-DD`), so Pages does not need a single-page fallback.
