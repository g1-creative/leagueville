#!/usr/bin/env node
// Regenerates every brand PNG (app icons, iOS splash screens, header/footer/
// splash-intro art, favicon) from assets/logo-league.png using Playwright's
// bundled headless Chromium canvas. No npm dependency is added: Playwright is
// resolved from the local npx cache via PLAYWRIGHT_NODE_MODULES.
//
// Run:
//   LD_LIBRARY_PATH=<chromium system libs> node scripts/generate-brand-assets.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PLAYWRIGHT_NODE_MODULES =
  process.env.PLAYWRIGHT_NODE_MODULES ?? '/home/igodl/.npm/_npx/e41f203b7505f1fb/node_modules'
const { chromium } = createRequire(path.join(PLAYWRIGHT_NODE_MODULES, 'noop.js'))('playwright')

const SRC = path.join(ROOT, 'assets/logo-league.png')

// Source geometry, measured directly on the actual 1254×1254 master
// (assets/logo-league.png) via pixel bounding-box analysis + visual iteration.
const MARK = { sx: 280, sy: 95, s: 710 } // square crop around the LV+ball mark
const BALL = { sx: 490, sy: 300, s: 280 } // the soccer ball alone

// One PNG per current iPhone class, portrait only.
const SPLASH_SIZES = [
  [750, 1334],
  [828, 1792],
  [1125, 2436],
  [1170, 2532],
  [1179, 2556],
  [1206, 2622],
  [1242, 2688],
  [1284, 2778],
  [1290, 2796],
]

const jobs = [
  // App icons: mark only — the wordmark is illegible at icon sizes.
  { out: 'public/icons/icon-192.png', kind: 'crop', crop: MARK, size: 192, pad: 0.08 },
  { out: 'public/icons/icon-512.png', kind: 'crop', crop: MARK, size: 512, pad: 0.08 },
  // Maskable variants: extra safe-zone padding so OS masks never clip the mark.
  { out: 'public/icons/icon-maskable-192.png', kind: 'crop', crop: MARK, size: 192, pad: 0.2 },
  { out: 'public/icons/icon-maskable-512.png', kind: 'crop', crop: MARK, size: 512, pad: 0.2 },
  { out: 'public/icons/apple-touch-icon.png', kind: 'crop', crop: MARK, size: 180, pad: 0.08 },
  // Favicon: Next serves src/app/icon.png automatically (replaces favicon.ico).
  { out: 'src/app/icon.png', kind: 'crop', crop: MARK, size: 64, pad: 0.08 },
  // Site art: header/footer lockup mark, splash-intro logo + ball.
  { out: 'public/brand/mark.png', kind: 'crop', crop: MARK, size: 256, pad: 0 },
  { out: 'public/brand/ball.png', kind: 'crop', crop: BALL, size: 160, pad: 0 },
  { out: 'public/brand/logo-full.png', kind: 'full', size: 640 },
  // iOS launch screens: full logo (mark + wordmark) at 55% width, centered.
  ...SPLASH_SIZES.map(([w, h]) => ({ out: `public/splash/splash-${w}x${h}.png`, kind: 'splash', w, h })),
]

const png = await readFile(SRC)
const dataUrl = `data:image/png;base64,${png.toString('base64')}`

const browser = await chromium.launch()
const page = await browser.newPage()
const results = await page.evaluate(
  async ({ dataUrl, jobs }) => {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = dataUrl
    })
    return jobs.map((job) => {
      const canvas = document.createElement('canvas')
      canvas.width = job.kind === 'splash' ? job.w : job.size
      canvas.height = job.kind === 'splash' ? job.h : job.size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#000000' // the logo's own background colour
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingQuality = 'high'
      if (job.kind === 'crop') {
        const inner = job.size * (1 - 2 * job.pad)
        const off = (job.size - inner) / 2
        ctx.drawImage(img, job.crop.sx, job.crop.sy, job.crop.s, job.crop.s, off, off, inner, inner)
      } else if (job.kind === 'full') {
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, job.size, job.size)
      } else {
        const w = Math.round(job.w * 0.55) // logo is square, so height === width
        ctx.drawImage(img, 0, 0, img.width, img.height, Math.round((job.w - w) / 2), Math.round((job.h - w) / 2), w, w)
      }
      return canvas.toDataURL('image/png')
    })
  },
  { dataUrl, jobs },
)
await browser.close()

for (let i = 0; i < jobs.length; i++) {
  const out = path.join(ROOT, jobs[i].out)
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, Buffer.from(results[i].split(',')[1], 'base64'))
  console.log('wrote', jobs[i].out)
}
