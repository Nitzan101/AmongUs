// Generates the PWA icons as PNGs with no image dependencies: pixels are
// computed directly and encoded with Node's built-in zlib.
// Run with `node scripts/make-icons.mjs` after changing the brand colours.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixel) {
  // Raw scanlines, each prefixed with filter byte 0.
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.max(0, Math.min(1, v))
/**
 * Coverage for "distance `d` is within half-width `w`", antialiased over
 * roughly one pixel. `e` is the edge width in the same normalised units.
 */
const cov = (d, w, e) => clamp01((w - d) / e + 0.5)

/**
 * A magnifying glass — the detective motif from the app's icon — over the
 * brand gradient. `glyphScale` shrinks the art for maskable icons, whose
 * outer edges get cropped to a circle by the launcher.
 */
function icon(glyphScale) {
  return (x, y, size) => {
    const u = x / size
    const v = y / size
    // Brand gradient (brand-600 -> brand-400), diagonally.
    const t = Math.min(1, Math.max(0, (u + v) / 2))
    let r = lerp(0x7c, 0xa7, t)
    let g = lerp(0x3a, 0x8b, t)
    let b = lerp(0xed, 0xfa, t)

    // Geometry in units of the icon size, centred and scaled.
    const s = glyphScale
    const e = 1.5 / size // ~1.5px antialiasing, in normalised units
    const dx = (u - 0.44) / s
    const dy = (v - 0.42) / s
    const dist = Math.hypot(dx, dy)

    // Lens ring
    const ring = cov(Math.abs(dist - 0.26), 0.055, e / s)
    // Handle: a thick bar running down-right from the lens edge.
    const hx = dx - 0.3
    const hy = dy - 0.3
    const along = (hx + hy) / Math.SQRT2
    const across = (hx - hy) / Math.SQRT2
    // Starts just inside the ring so the handle reads as attached.
    const onHandle =
      cov(Math.abs(across), 0.06, e / s) *
      cov(Math.abs(along - 0.045), 0.175, e / s)
    // Faint glass tint inside the lens.
    const glass = cov(dist, 0.21, e / s) * 0.22

    const white = clamp01(Math.max(ring, onHandle) + glass)
    r = lerp(r, 255, white)
    g = lerp(g, 255, white)
    b = lerp(b, 255, white)
    return [Math.round(r), Math.round(g), Math.round(b), 255]
  }
}

mkdirSync(OUT, { recursive: true })
const files = [
  ['pwa-192.png', 192, 1.0],
  ['pwa-512.png', 512, 1.0],
  ['apple-touch-icon.png', 180, 1.0],
  ['pwa-maskable-512.png', 512, 0.72],
]
for (const [name, size, scale] of files) {
  writeFileSync(join(OUT, name), png(size, icon(scale)))
  console.log('wrote', name, size)
}
