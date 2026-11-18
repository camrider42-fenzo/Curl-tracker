/**
 * Curl Tracker — PWA icons.
 * Drawn in-process so the repo does not need a design tool. The maskable
 * icon keeps the spiral inside the center safe zone Android launchers crop to.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

function crc32(buffer) {
  let crc = ~0
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index]
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([name, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const start = y * (width * 4 + 1)
    raw[start] = 0
    rgba.copy(raw, start + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function draw(size, maskable) {
  const data = Buffer.alloc(size * size * 4)
  const center = (size - 1) / 2
  const maxRadius = size * (maskable ? 0.26 : 0.34)
  const minRadius = size * 0.05
  const stroke = size * (maskable ? 0.028 : 0.034)
  const turns = Math.PI * 2 * 2.35
  const growth = (maxRadius - minRadius) / turns
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center
      const dy = y - center
      const radius = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)
      let nearest = stroke
      for (let turn = 0; turn <= 3; turn += 1) {
        const theta = angle + Math.PI * 2 * turn
        if (theta < 0) continue
        const spiral = minRadius + growth * theta
        nearest = Math.min(nearest, Math.abs(radius - spiral))
      }
      let red = 0x16
      let green = 0x13
      let blue = 0x0f
      const lift = Math.max(0, 1 - radius / (size * 0.62)) * 14
      red += lift
      green += lift * 0.7
      blue += lift * 0.4
      if (radius > minRadius * 0.4 && radius < maxRadius + stroke && nearest < stroke * 0.55) {
        const mix = Math.min(1, (1 - nearest / (stroke * 0.55)) * 1.3)
        red = red + (0xe7 - red) * mix
        green = green + (0xa1 - green) * mix
        blue = blue + (0x5a - blue) * mix
      }
      const offset = (y * size + x) * 4
      data[offset] = red
      data[offset + 1] = green
      data[offset + 2] = blue
      data[offset + 3] = 255
    }
  }
  return data
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192, 192, draw(192, false)))
writeFileSync('public/icons/icon-512.png', png(512, 512, draw(512, false)))
writeFileSync('public/icons/icon-maskable-512.png', png(512, 512, draw(512, true)))
console.log('wrote public/icons')
