/**
 * Curl Tracker — headless check of the three portrait layouts.
 *
 *   Galaxy Z Fold 5 cover    344 × 882
 *   Galaxy Z Fold 5 inner    690 × 829   (about 18:21.6)
 *   Pixel 10 Pro             427 × 952   (1280×2856 at DPR 3)
 *
 * Also sweeps the shorter chrome heights and the other published Pixel CSS
 * size (410 × 914 at DPR 3.125) for overflow only. Screenshots are copied to
 * the artifacts directory only after every assertion passes.
 */
import { chromium } from 'playwright'
import { unzipSync, strFromU8 } from 'fflate'
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.CHECK_BASE || 'http://127.0.0.1:47322/'
const ARTIFACTS = '/opt/cursor/artifacts'
const STAGING = join(tmpdir(), 'curl-tracker-shots')

function crc32(buffer) {
  let crc = ~0
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index]
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function pngChunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([name, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** Solid PNG large enough that the app must downscale the long edge to 1600. */
function solidPng(width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x += 1) {
      const pixel = row + 1 + x * 4
      raw[pixel] = 180
      raw[pixel + 1] = 96
      raw[pixel + 2] = 48
      raw[pixel + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function addDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function assertNoOverflow(page, label) {
  const box = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  assert(box.scrollWidth <= box.clientWidth + 1, `${label} overflows horizontally (${box.scrollWidth} > ${box.clientWidth})`)
}

async function assertInView(locator, label) {
  const box = await locator.boundingBox()
  assert(box, `${label} is not visible`)
  const viewport = locator.page().viewportSize()
  assert(box.y >= -1 && box.y + box.height <= viewport.height + 1, `${label} is outside the viewport (y=${box.y}, h=${box.height}, vh=${viewport.height})`)
}

async function editorDisplay(page) {
  return page.getByTestId('editor-grid').evaluate((element) => getComputedStyle(element).display)
}

async function shot(page, name) {
  const path = join(STAGING, name)
  await page.screenshot({ path, fullPage: false })
  return path
}

async function boot(page, hash) {
  const target = new URL(hash, BASE).toString()
  await page.goto(target, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('app-ready').waitFor({ timeout: 15000 })
}

async function openEditor(page, iso) {
  await boot(page, `#/log/${iso}`)
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-testid="save-log"]')
    return button instanceof HTMLButtonElement && !button.disabled
  })
}

async function attachPhoto(page, fixture) {
  await page.getByTestId('photo-gallery').setInputFiles(fixture)
  try {
    await page.locator('.photo-meta', { hasText: /1600×/ }).first().waitFor({ timeout: 15000 })
  } catch (error) {
    const message = await page.getByTestId('log-error').textContent().catch(() => '')
    throw new Error(`Photo was not resized to 1600. ${message || error.message}`)
  }
}

async function saveLog(page) {
  await page.getByTestId('save-log').click()
  await page.getByTestId('app-ready').waitFor()
  await page.waitForFunction(() => !location.hash.startsWith('#/log/'))
}

async function runDevice(browser, device, fixture) {
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: 1,
    hasTouch: true,
    colorScheme: 'dark',
    locale: 'en-US',
  })
  const page = await context.newPage()
  const problems = []
  page.on('pageerror', (error) => problems.push(error.message))
  page.on('dialog', (dialog) => {
    problems.push(`Unexpected confirm: ${dialog.message()}`)
    dialog.dismiss().catch(() => {})
  })

  await boot(page, '#/today')
  const today = await page.getByTestId('app-ready').getAttribute('data-date')
  assert(today && /^\d{4}-\d{2}-\d{2}$/.test(today), 'Today is missing from the shell')
  const note = await page.getByTestId('data-note').innerText()
  assert(note.startsWith('On this device only.'), 'The on-device note is missing')
  await assertNoOverflow(page, `${device.name} today`)

  await boot(page, '#/products')
  const labels = await page.locator('.category-label').allTextContents()
  for (const required of ['Cleansers/Shampoo', 'Fillers', 'Sealers']) {
    assert(labels.includes(required), `${device.name} is missing the ${required} category`)
  }
  for (const label of labels) {
    assert(!/^(stylers?|hold)$/i.test(label.trim()), `${device.name} still has a ${label} category`)
  }
  const categoryNote = await page.getByTestId('category-note').innerText()
  assert(/finishing oils/i.test(categoryNote) && /Sealers/.test(categoryNote), 'Oil split is not explained')
  await assertNoOverflow(page, `${device.name} products`)

  if (device.name === 'pixel_10_pro') await shot(page, 'pixel_10_pro_products.png')

  if (device.addProduct) {
    await page.getByTestId('add-product').click()
    await page.getByLabel('Name').fill('House flax gel')
    await page.getByLabel('Category').selectOption({ label: 'Sealers' })
    await page.getByTestId('save-product').click()
    try {
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 8000 })
    } catch (error) {
      const message = await page.locator('.form-error').textContent().catch(() => '')
      throw new Error(`New product did not save. ${message || error.message}`)
    }
    await page.getByTestId('product-search').fill('House flax')
    await page.getByText('House flax gel', { exact: true }).waitFor()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByTestId('app-ready').waitFor()
    await page.getByTestId('product-search').fill('House flax')
    await page.getByText('House flax gel', { exact: true }).waitFor()
  }

  await openEditor(page, today)
  await page.getByTestId('save-log').click()
  await page.getByTestId('log-error').waitFor()
  const photoError = await page.getByTestId('log-error').innerText()
  assert(/photo/i.test(photoError), `Saving with no photo should explain why. Got: ${photoError}`)
  assert((await editorDisplay(page)) === device.editorDisplay, `${device.name} editor is ${await editorDisplay(page)}, expected ${device.editorDisplay}`)
  await assertInView(page.getByTestId('save-log'), `${device.name} save`)
  await assertNoOverflow(page, `${device.name} editor empty`)
  if (device.name === 'fold_cover') await shot(page, 'fold_cover_photo_required.png')

  await attachPhoto(page, fixture)
  await page.getByTestId('product-search').fill('smoothie')
  await page.getByRole('checkbox', { name: /Curl Enhancing Smoothie/ }).check()
  await page.getByRole('checkbox', { name: 'Scrunch', exact: true }).check()
  await page.getByLabel('Notes').fill('First pass, diffused.')
  await page.evaluate(() => window.scrollTo(0, 0))
  await assertNoOverflow(page, `${device.name} editor filled`)
  if (device.name === 'fold_inner') await shot(page, 'fold_inner_editor.png')
  if (device.name === 'pixel_10_pro') await shot(page, 'pixel_10_pro_editor.png')
  await saveLog(page)

  await openEditor(page, today)
  await page.getByLabel('Notes').fill('Edited: second scrunch pass.')
  await saveLog(page)
  await boot(page, '#/today')
  await page.getByText('Edited: second scrunch pass.').waitFor()
  if (device.name === 'pixel_10_pro') await shot(page, 'pixel_10_pro_today.png')

  const past = addDays(today, -4)
  await openEditor(page, past)
  await attachPhoto(page, fixture)
  await saveLog(page)

  await boot(page, '#/history')
  await page.waitForFunction(
    (iso) => document.querySelector(`[data-testid="day-${iso}"]`)?.getAttribute('data-kind') === 'logged',
    past,
  )
  const month = past.slice(0, 7)
  const visible = await page.getByTestId('visible-month').getAttribute('data-month')
  if (visible !== month) {
    const goBack = month < visible
    for (let step = 0; step < 3 && (await page.getByTestId('visible-month').getAttribute('data-month')) !== month; step += 1) {
      await page.getByRole('button', { name: goBack ? 'Previous month' : 'Next month' }).click()
    }
  }
  for (const offset of [-3, -2, -1]) {
    const iso = addDays(today, offset)
    const cell = page.getByTestId(`day-${iso}`)
    const kind = await cell.getAttribute('data-kind')
    assert(kind === 'zero', `${iso} should be a zero-product day, was ${kind}. month=${await page.getByTestId('visible-month').getAttribute('data-month')} today=${today}`)
    assert((await cell.locator('.day-mark').innerText()).trim() === '0', `${iso} should show a visible 0`)
  }
  const yesterday = addDays(today, -1)
  await page.getByTestId(`day-${yesterday}`).click()
  await page.getByTestId('day-detail').getByText(/zero-product/i).waitFor()
  await page.evaluate(() => window.scrollTo(0, 0))
  await assertNoOverflow(page, `${device.name} history`)
  if (device.name === 'fold_cover') await shot(page, 'fold_cover_history.png')
  if (device.name === 'fold_inner') await shot(page, 'fold_inner_history.png')

  if (device.backup) {
    await boot(page, '#/more')
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-all').click()
    const download = await downloadPromise
    const zipPath = join(tmpdir(), 'curl-tracker-check.zip')
    await download.saveAs(zipPath)
    const packed = unzipSync(new Uint8Array(readFileSync(zipPath)))
    const data = JSON.parse(strFromU8(packed['data.json']))
    const readme = strFromU8(packed['README.md'])
    assert(data.schemaVersion === 1, 'Export schema is not version 1')
    assert(data.days.some((day) => day.zeroProduct === true), 'Export is missing an explicit zero-product day')
    assert(/schema version 1/i.test(readme), 'README does not describe the schema')
    assert(
      data.productLibrary.some((product) => product.name === 'House flax gel'),
      'House flax gel was not in the exported library',
    )
    const photoName = Object.keys(packed).find((name) => name.startsWith('photos/') && name.endsWith('.jpg'))
    assert(photoName, 'Export is missing a photo')
    assert(packed[photoName].byteLength > 0, 'Exported photo is empty')
    await page.getByText(/Backup downloaded/).waitFor()
    await shot(page, 'pixel_10_pro_backup.png')

    await openEditor(page, today)
    await page.getByTestId('delete-log').click()
    await page.getByTestId('confirm-delete').click()
    await page.waitForFunction(() => !location.hash.startsWith('#/log/'))
    await boot(page, '#/today')
    assert((await page.getByText('Edited: second scrunch pass.').count()) === 0, 'Deleted log is still on Today')

    await boot(page, '#/more')
    await page.getByTestId('import-zip').setInputFiles(zipPath)
    await page.getByTestId('confirm-import').click()
    await page.getByText(/Restored \d+ saved logs/).waitFor()
    await boot(page, '#/today')
    await page.getByText('Edited: second scrunch pass.').waitFor()
  }

  assert(problems.length === 0, problems.join('\n'))
  await context.close()
}

async function sweep(browser, size, fixture) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    hasTouch: true,
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  await boot(page, '#/today')
  const today = await page.getByTestId('app-ready').getAttribute('data-date')
  await assertNoOverflow(page, `${size.name} today`)
  await openEditor(page, today)
  await attachPhoto(page, fixture)
  const display = await editorDisplay(page)
  assert(display === size.editorDisplay, `${size.name} editor is ${display}, expected ${size.editorDisplay}`)
  await assertInView(page.getByTestId('save-log'), `${size.name} save`)
  await assertNoOverflow(page, `${size.name} editor`)
  await context.close()
}

async function checkInstall(browser) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await boot(page, '#/today')
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  assert(manifestHref, 'Manifest link is missing')
  const manifest = await page.evaluate(async (href) => {
    const response = await fetch(href)
    if (!response.ok) throw new Error(`Manifest fetch failed: ${response.status}`)
    return response.json()
  }, manifestHref)
  assert(manifest.display === 'standalone', 'Manifest is not standalone')
  const worker = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported'
    const registration = await navigator.serviceWorker.ready
    return registration.active ? registration.active.scriptURL : ''
  })
  assert(worker && worker !== 'unsupported', 'Service worker did not become active')
  await context.close()
}

const devices = [
  { name: 'fold_cover', width: 344, height: 882, editorDisplay: 'flex', addProduct: false, backup: false },
  { name: 'fold_inner', width: 690, height: 829, editorDisplay: 'grid', addProduct: false, backup: false },
  { name: 'pixel_10_pro', width: 427, height: 952, editorDisplay: 'flex', addProduct: true, backup: true },
]

const sweeps = [
  { name: 'fold_cover_chrome', width: 344, height: 746, editorDisplay: 'flex' },
  { name: 'fold_inner_chrome', width: 690, height: 717, editorDisplay: 'grid' },
  { name: 'pixel_10_pro_alt', width: 410, height: 914, editorDisplay: 'flex' },
]

rmSync(STAGING, { recursive: true, force: true })
mkdirSync(STAGING, { recursive: true })
const fixture = join(tmpdir(), 'curl-tracker-fixture.png')
writeFileSync(fixture, solidPng(1800, 1200))

const browser = await chromium.launch({ headless: true })
try {
  await checkInstall(browser)
  for (const device of devices) await runDevice(browser, device, fixture)
  for (const size of sweeps) await sweep(browser, size, fixture)
} finally {
  await browser.close()
}

mkdirSync(ARTIFACTS, { recursive: true })
for (const name of [
  'fold_cover_photo_required.png',
  'fold_cover_history.png',
  'fold_inner_editor.png',
  'fold_inner_history.png',
  'pixel_10_pro_products.png',
  'pixel_10_pro_editor.png',
  'pixel_10_pro_today.png',
  'pixel_10_pro_backup.png',
]) {
  copyFileSync(join(STAGING, name), join(ARTIFACTS, name))
}
console.log('viewport check passed')
