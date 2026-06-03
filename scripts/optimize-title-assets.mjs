/**
 * Optimizes the title-screen assets:
 *   1. Encodes the hero background to AVIF + WebP (2400px wide) from the
 *      full-res PNG source in design-assets/.
 *   2. Subsets the Open Runde 600/700 woff2 faces down to the glyphs the
 *      UI actually renders.
 *
 * The full-res PNG and unsubset fonts live in design-assets/ (out of the
 * build) so this is fully repeatable. Run: `npm run optimize:title`.
 */
import sharp from 'sharp'
import subsetFont from 'subset-font'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
const sizeOf = async (p) => (await stat(p)).size

// ── Background: AVIF + WebP from the PNG source ──────────────────────────
const BG_SRC = join(root, 'design-assets/hero-bg-source.png')
const BG_WIDTH = 2400

async function buildBackground() {
  const base = sharp(BG_SRC).resize({ width: BG_WIDTH })
  const avifPath = join(root, 'public/hero-bg.avif')
  const webpPath = join(root, 'public/hero-bg.webp')
  await base.clone().avif({ quality: 56, effort: 6 }).toFile(avifPath)
  await base.clone().webp({ quality: 76, effort: 6 }).toFile(webpPath)
  console.log(`  hero-bg.avif  ${kb(await sizeOf(avifPath))}`)
  console.log(`  hero-bg.webp  ${kb(await sizeOf(webpPath))}`)
}

// ── Fonts: subset to the glyphs used on the title screen ─────────────────
// Full printable ASCII + common typographic punctuation — keeps any UI copy
// safe while dropping the thousands of unused Latin-extended/symbol glyphs.
const GLYPHS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
  'abcdefghijklmnopqrstuvwxyz{|}~' +
  '‘’“”–—… ·•' // ‘ ’ “ ” – — … nbsp · •

const FONTS = ['open-runde-600.woff2', 'open-runde-700.woff2']

async function buildFonts() {
  for (const name of FONTS) {
    const src = join(root, 'design-assets/fonts-full', name)
    const out = join(root, 'public/fonts', name)
    const before = await sizeOf(src)
    const subset = await subsetFont(await readFile(src), GLYPHS, {
      targetFormat: 'woff2',
    })
    await writeFile(out, subset)
    console.log(`  ${name}  ${kb(before)} -> ${kb(subset.length)}`)
  }
}

console.log('Background:')
await buildBackground()
console.log('Fonts:')
await buildFonts()
console.log('Done.')
