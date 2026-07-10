#!/usr/bin/env node
// Mobile re-audit: drives every route at iPhone 13 size and asserts
//   1. no page-level horizontal overflow
//   2. no clipped fixture rows (content wider than the row box)
//   3. four bottom-nav tabs, each ≥44px tall
//   4. PWA wiring (manifest, theme-color, apple-touch icon + startup images)
// Screenshots land in audit-out/ (gitignored). Exits 1 on any failure.
//
// A dev server must be running first:  npm run dev -- --port 3123
// Run:
//   LD_LIBRARY_PATH=<chromium system libs> node scripts/mobile-audit.mjs
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PLAYWRIGHT_NODE_MODULES =
  process.env.PLAYWRIGHT_NODE_MODULES ?? '/home/igodl/.npm/_npx/e41f203b7505f1fb/node_modules'
const { chromium, devices } = createRequire(path.join(PLAYWRIGHT_NODE_MODULES, 'noop.js'))('playwright')

const BASE = process.env.BASE_URL ?? 'http://localhost:3123'
const OUT = path.join(ROOT, 'audit-out')

const ROUTES = [
  '/',
  '/premier-league',
  '/premier-league?tab=results',
  '/premier-league?tab=table',
  '/premier-league?tab=teams',
  '/cups',
  '/calendar',
  '/calendar?view=week',
]

const failures = []

async function audit(page, route) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (overflow > 0) failures.push(`${route}: horizontal overflow of ${overflow}px`)
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('.board-row')]
      .filter((row) => row.scrollWidth > row.clientWidth + 1)
      .map((row) => (row.textContent ?? '').trim().slice(0, 60)),
  )
  for (const c of clipped) failures.push(`${route}: clipped fixture row "${c}"`)
  const name = route === '/' ? 'home' : route.replace(/[/?=]+/g, '-').replace(/^-|-$/g, '')
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true })
  console.log(`audited ${route} (overflow ${overflow}px, ${clipped.length} clipped rows)`)
}

const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['iPhone 13'] })
// Deterministic screenshots: the once-per-session splash must not overlay them.
await context.addInitScript(() => sessionStorage.setItem('lv-splash', '1'))
const page = await context.newPage()
await mkdir(OUT, { recursive: true })

for (const route of ROUTES) await audit(page, route)

// A real team page and a real game page, discovered live.
await page.goto(`${BASE}/premier-league?tab=teams`, { waitUntil: 'networkidle' })
const teamHref = await page.evaluate(() => {
  const links = [...document.querySelectorAll('main a[href^="/premier-league/"]')]
  return links.map((a) => a.getAttribute('href')).find((h) => h && !h.includes('?') && !h.includes('/game/')) ?? null
})
if (teamHref) {
  await audit(page, teamHref)
  const gameHref = await page.evaluate(
    () => document.querySelector('main a[href*="/game/"]')?.getAttribute('href') ?? null,
  )
  if (gameHref) await audit(page, gameHref)
  else console.log('note: no game link on the team page (off-season?) — skipping game route')
} else {
  failures.push('no team link found on /premier-league?tab=teams')
}

// Tap-target sweep of the new chrome.
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
const tabs = await page.$$eval('nav[aria-label="Primary"] > div > *', (els) =>
  els.map((el) => {
    const r = el.getBoundingClientRect()
    return { label: (el.textContent ?? '').trim(), w: r.width, h: r.height }
  }),
)
if (tabs.length !== 4) failures.push(`expected 4 bottom-nav tabs, found ${tabs.length}`)
for (const t of tabs) {
  if (t.h < 44 || t.w < 44) failures.push(`bottom-nav tab "${t.label}" is ${t.w}x${t.h}px (< 44px)`)
}

// PWA smoke.
const manifestRes = await context.request.get(`${BASE}/manifest.webmanifest`)
if (!manifestRes.ok()) {
  failures.push(`manifest.webmanifest returned ${manifestRes.status()}`)
} else {
  const man = await manifestRes.json()
  if (man.name !== 'Leagueville' || man.display !== 'standalone') failures.push('manifest missing name/display')
  if ((man.icons ?? []).length < 4) failures.push('manifest has fewer than 4 icons')
}
const html = await (await context.request.get(`${BASE}/`)).text()
for (const needle of ['rel="manifest"', 'name="theme-color"', 'apple-touch-icon', 'apple-touch-startup-image']) {
  if (!html.includes(needle)) failures.push(`home HTML missing ${needle}`)
}

await browser.close()

if (failures.length > 0) {
  console.error('\nAUDIT FAILURES:')
  for (const f of failures) console.error(' - ' + f)
  process.exit(1)
}
console.log('\nMobile audit passed. Screenshots in audit-out/')
