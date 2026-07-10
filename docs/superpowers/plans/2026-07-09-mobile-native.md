# Mobile Native Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Leagueville on a phone feel like a native app: installable PWA with branded icons and splash screens, a cinematic in-app splash, bottom tab navigation, correctly rendering fixtures, ≥44px touch targets, and tables that fit a 390px screen.

**Architecture:** Responsive single codebase — all mobile chrome is Tailwind-breakpoint-gated inside existing components (`md:hidden` bottom nav + league sheet, `hidden md:flex` desktop nav, responsive table columns). PWA assets are generated once from `assets/logo-league.png` by a committed Playwright-Chromium script and served from `public/`. No user-agent detection, no separate route tree, no service worker.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind 4 (`@theme` tokens in `globals.css`), Vitest + @testing-library/react (jsdom), Playwright headless Chromium for asset generation and the final audit (resolved from a local npx cache — not an npm dependency).

## Global Constraints

- **No new npm dependencies.** Scripts resolve Playwright via `createRequire` from `PLAYWRIGHT_NODE_MODULES` (default `/home/igodl/.npm/_npx/e41f203b7505f1fb/node_modules`). Chromium needs `LD_LIBRARY_PATH=/tmp/claude-1000/-home-igodl-code-soccer/9213bd29-14d5-46a9-92b8-38fb0f6a3281/scratchpad/libs/usr/lib/x86_64-linux-gnu` when launched.
- **Desktop (`md`+) stays visually unchanged**, except the brand additions the spec explicitly requires (header logo lockup, footer mark, favicon). Every mobile-only style must be reverted at `sm:`/`md:` back to today's exact classes.
- **Dark theme `#0a100e` (pitch) everywhere**: manifest `background_color`/`theme_color`, `<meta name="theme-color">`, iOS status bar `black-translucent`. Icon/splash PNG backgrounds are `#000000` to match the logo artwork's own black field.
- **All new interactive elements are ≥44px tall on mobile** (bottom-nav tabs, sheet rows, buttons, selects).
- **TDD with Vitest.** Test command: `npm test` (vitest run, jsdom). Every task leaves the whole suite green.
- **Code style:** single quotes, no semicolons, server components by default, `'use client'` only where state/effects are needed, existing utility classes (`.board`, `.board-row`, `.btn`, `.btn-primary`, `.btn-muted`, `.eyebrow`, `.display`, `.num`).
- **Never rename competition slugs** (`src/lib/leagues.ts` — they are persisted in localStorage picks and .ics URLs).
- **No service worker / offline support** in this pass.
- Dev server for manual/smoke checks: `npm run dev -- --port 3123`.
- Logo source: `/home/igodl/code/soccer/assets/logo-league.png`, 1232×1232 PNG on pure black. Geometry (measured): LV mark square crop `x 280, y 170, side 720`; soccer ball crop `x 505, y 315, side 240`; ball sits at `left 41%, top 25.6%, width 19.5%` of the full square logo.

---

### Task 1: FixtureCard `min-w-0` bug fix

The two `flex-1` team containers lack `min-w-0`, so `truncate` can never shrink them; rows overflow and `.board { overflow: hidden }` clips team names (with pick buttons rendered, home names disappear entirely).

**Files:**
- Modify: `src/components/FixtureCard.tsx:37,62`
- Test: `src/components/FixtureCard.test.tsx`

**Interfaces:**
- Consumes: existing `FixtureCard({ fixture, pickable?, showLeague? })`.
- Produces: no API change. Invariant later tasks rely on: **both team halves in the `sm`+ layout are `div` elements whose className contains both `flex-1` and `min-w-0`** (Task 8's rewrite must keep this so this test stays green).

- [ ] **Step 1: Write the failing test**

Append to the `describe('FixtureCard', ...)` block in `src/components/FixtureCard.test.tsx`:

```tsx
  it('lets long team names truncate instead of overflowing the row', () => {
    const fixture: Fixture = {
      ...base,
      home: { id: 'h', name: 'Borussia Mönchengladbach Development Squad' },
      away: { id: 'a', name: 'Wolverhampton Wanderers Reserves and Academy' },
    }
    const { container } = render(<FixtureCard fixture={fixture} pickable />)
    const halves = container.querySelectorAll('div.flex-1')
    expect(halves.length).toBe(2)
    for (const el of halves) {
      // Without min-w-0 a flex child refuses to shrink below its content,
      // so truncate cannot engage and .board's overflow:hidden clips names.
      expect(el.className).toContain('min-w-0')
    }
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/FixtureCard.test.tsx`
Expected: FAIL — `expected 'flex flex-1 items-center justify-end gap-2.5 text-right' to contain 'min-w-0'`

- [ ] **Step 3: Add `min-w-0` to both team halves**

In `src/components/FixtureCard.tsx` change line 37:

```tsx
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
```

and line 62:

```tsx
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
```

(The `truncate` spans inside need no change — `overflow: hidden` already zeroes their automatic minimum size.)

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — all files green, including the new test.

- [ ] **Step 5: Commit**

```bash
git add src/components/FixtureCard.tsx src/components/FixtureCard.test.tsx
git commit -m "fix: let fixture team names truncate instead of clipping"
```

---

### Task 2: Brand asset pipeline (icons, splash screens, favicon)

A committed one-off Node script renders every PNG we need from `assets/logo-league.png` using Playwright's Chromium canvas. Generated PNGs are committed; the script is kept for regeneration.

**Files:**
- Create: `scripts/generate-brand-assets.mjs`
- Create (generated): `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-192.png`, `public/icons/icon-maskable-512.png`, `public/icons/apple-touch-icon.png`, `public/brand/mark.png`, `public/brand/ball.png`, `public/brand/logo-full.png`, `public/splash/splash-{750x1334,828x1792,1125x2436,1170x2532,1179x2556,1206x2622,1242x2688,1284x2778,1290x2796}.png`, `src/app/icon.png`
- Delete: `src/app/favicon.ico` (replaced by `src/app/icon.png`, which Next serves as the favicon automatically)

**Interfaces:**
- Consumes: `assets/logo-league.png` (1232×1232).
- Produces (paths later tasks hard-code):
  - `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-maskable-192.png`, `/icons/icon-maskable-512.png` → Task 3 manifest
  - `/icons/apple-touch-icon.png` → Task 3 `metadata.icons.apple`
  - `/splash/splash-<W>x<H>.png` (9 files) → Task 3 `appleWebApp.startupImage`
  - `/brand/mark.png` (256px LV mark, no padding) → Task 6 header + footer
  - `/brand/logo-full.png` (640px full logo) and `/brand/ball.png` (160px ball) → Task 7 splash intro

- [ ] **Step 1: Write the generation script**

Create `scripts/generate-brand-assets.mjs`:

```js
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

// Source geometry, measured on the 1232×1232 master.
const MARK = { sx: 280, sy: 170, s: 720 } // square crop around the LV+ball mark
const BALL = { sx: 505, sy: 315, s: 240 } // the soccer ball alone

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
```

- [ ] **Step 2: Run the script**

Run:

```bash
cd /home/igodl/code/soccer && LD_LIBRARY_PATH=/tmp/claude-1000/-home-igodl-code-soccer/9213bd29-14d5-46a9-92b8-38fb0f6a3281/scratchpad/libs/usr/lib/x86_64-linux-gnu node scripts/generate-brand-assets.mjs
```

Expected: 18 `wrote <path>` lines (6 icons+favicon, 3 brand art, 9 splash), exit 0.

- [ ] **Step 3: Verify PNG dimensions (this is the test for this task)**

Run:

```bash
cd /home/igodl/code/soccer && node -e '
const fs = require("fs")
const files = ["public/icons/icon-192.png","public/icons/icon-512.png","public/icons/icon-maskable-192.png","public/icons/icon-maskable-512.png","public/icons/apple-touch-icon.png","src/app/icon.png","public/brand/mark.png","public/brand/ball.png","public/brand/logo-full.png","public/splash/splash-750x1334.png","public/splash/splash-828x1792.png","public/splash/splash-1125x2436.png","public/splash/splash-1170x2532.png","public/splash/splash-1179x2556.png","public/splash/splash-1206x2622.png","public/splash/splash-1242x2688.png","public/splash/splash-1284x2778.png","public/splash/splash-1290x2796.png"]
for (const f of files) { const b = fs.readFileSync(f); console.log(f, b.readUInt32BE(16) + "x" + b.readUInt32BE(20)) }'
```

Expected output (exactly these sizes):

```
public/icons/icon-192.png 192x192
public/icons/icon-512.png 512x512
public/icons/icon-maskable-192.png 192x192
public/icons/icon-maskable-512.png 512x512
public/icons/apple-touch-icon.png 180x180
src/app/icon.png 64x64
public/brand/mark.png 256x256
public/brand/ball.png 160x160
public/brand/logo-full.png 640x640
public/splash/splash-750x1334.png 750x1334
public/splash/splash-828x1792.png 828x1792
public/splash/splash-1125x2436.png 1125x2436
public/splash/splash-1170x2532.png 1170x2532
public/splash/splash-1179x2556.png 1179x2556
public/splash/splash-1206x2622.png 1206x2622
public/splash/splash-1242x2688.png 1242x2688
public/splash/splash-1284x2778.png 1284x2778
public/splash/splash-1290x2796.png 1290x2796
```

Also eyeball `public/icons/icon-512.png` and `public/splash/splash-1170x2532.png` (open with the Read tool): the icon must show the white L + ball + green check centered on black with no wordmark; the splash must show the full logo with wordmark centered on black.

- [ ] **Step 4: Replace the favicon**

```bash
cd /home/igodl/code/soccer && git rm src/app/favicon.ico
```

Expected: `rm 'src/app/favicon.ico'`. (`src/app/icon.png` from Step 2 becomes the favicon — Next emits the `<link rel="icon">` for it automatically.)

- [ ] **Step 5: Suite still green, then commit**

Run: `npm test` — Expected: PASS.

```bash
git add scripts/generate-brand-assets.mjs public/icons public/brand public/splash src/app/icon.png
git commit -m "feat: brand asset pipeline — app icons, iOS splash screens, favicon"
```

---

### Task 3: PWA manifest + viewport + Apple web-app metadata

**Files:**
- Create: `src/app/manifest.ts`
- Test: `src/app/manifest.test.ts`
- Modify: `src/app/layout.tsx:1,14-18` (imports + metadata/viewport exports only — header/body changes come in Task 6)

**Interfaces:**
- Consumes: icon and splash files from Task 2 (exact paths listed there).
- Produces: `manifest(): MetadataRoute.Manifest` default export served at `/manifest.webmanifest`; `export const viewport: Viewport`; extended `metadata` with `icons.apple` and `appleWebApp` incl. `startupImage`. Task 11's audit greps the served HTML for `rel="manifest"`, `name="theme-color"`, `apple-touch-icon`, `apple-touch-startup-image`.

- [ ] **Step 1: Write the failing manifest test**

Create `src/app/manifest.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import manifest from './manifest'

describe('manifest', () => {
  const m = manifest()

  it('installs as a standalone app themed to the pitch', () => {
    expect(m.name).toBe('Leagueville')
    expect(m.short_name).toBe('Leagueville')
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.background_color).toBe('#0a100e')
    expect(m.theme_color).toBe('#0a100e')
  })

  it('ships any + maskable icons at 192 and 512', () => {
    const icons = m.icons ?? []
    const find = (purpose: string, size: string) =>
      icons.find((i) => i.purpose === purpose && i.sizes === size)
    expect(find('any', '192x192')?.src).toBe('/icons/icon-192.png')
    expect(find('any', '512x512')?.src).toBe('/icons/icon-512.png')
    expect(find('maskable', '192x192')?.src).toBe('/icons/icon-maskable-192.png')
    expect(find('maskable', '512x512')?.src).toBe('/icons/icon-maskable-512.png')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/app/manifest.test.ts`
Expected: FAIL — `Cannot find module './manifest'` (or equivalent resolve error).

- [ ] **Step 3: Create the manifest**

Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Leagueville',
    short_name: 'Leagueville',
    description:
      'Fixtures, results, standings and squads for the Premier League, La Liga, Ligue 1, Brasileirão and MLS — plus eleven cup competitions — with one-click calendar subscriptions.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a100e',
    theme_color: '#0a100e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/app/manifest.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add viewport + Apple metadata to the root layout**

In `src/app/layout.tsx`, change line 1 from:

```tsx
import type { Metadata } from 'next'
```

to:

```tsx
import type { Metadata, Viewport } from 'next'
```

and replace the existing `export const metadata` block (lines 14–18) with:

```tsx
export const viewport: Viewport = {
  themeColor: '#0a100e',
  viewportFit: 'cover', // enables env(safe-area-inset-*) on notched phones
}

// iOS launch screens are matched by exact device metrics; a missed device
// degrades to a plain dark launch, never a broken one.
const STARTUP_IMAGES = [
  { w: 750, h: 1334, dw: 375, dh: 667, dpr: 2 },
  { w: 828, h: 1792, dw: 414, dh: 896, dpr: 2 },
  { w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3 },
  { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 },
  { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 },
  { w: 1206, h: 2622, dw: 402, dh: 874, dpr: 3 },
  { w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3 },
  { w: 1284, h: 2778, dw: 428, dh: 926, dpr: 3 },
  { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 },
].map(({ w, h, dw, dh, dpr }) => ({
  url: `/splash/splash-${w}x${h}.png`,
  media: `(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}))

export const metadata: Metadata = {
  title: 'Leagueville — Soccer fixtures & calendars',
  description:
    'Fixtures, results, standings and squads for the Premier League, La Liga, Ligue 1, Brasileirão and MLS — plus eleven cup competitions — with one-click calendar subscriptions.',
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Leagueville',
    startupImage: STARTUP_IMAGES,
  },
}
```

- [ ] **Step 6: Smoke-check the served HTML**

```bash
cd /home/igodl/code/soccer && npm run dev -- --port 3123 &
sleep 8
curl -s http://localhost:3123/ | grep -o 'rel="manifest"\|name="theme-color" content="#0a100e"\|apple-touch-icon\|apple-touch-startup-image' | sort | uniq -c
curl -s http://localhost:3123/manifest.webmanifest | head -c 200
kill %1
```

Expected: all four grep patterns appear (startup-image ×9), and the manifest JSON starts with `{"name":"Leagueville"`.

- [ ] **Step 7: Full suite, commit**

Run: `npm test` — Expected: PASS.

```bash
git add src/app/manifest.ts src/app/manifest.test.ts src/app/layout.tsx
git commit -m "feat: PWA manifest, viewport and Apple web-app metadata"
```

---

### Task 4: LeagueSheet bottom sheet

A mobile bottom sheet listing the 5 leagues, following the focus/Escape pattern already proven in `CalendarView.tsx`'s day panel.

**Files:**
- Create: `src/components/LeagueSheet.tsx`
- Test: `src/components/LeagueSheet.test.tsx`

**Interfaces:**
- Consumes: `LEAGUES` from `@/lib/leagues` (5 entries with `slug`, `name`, `shortName`, `accent`).
- Produces: `LeagueSheet({ open, hint = false, onClose }: { open: boolean; hint?: boolean; onClose: () => void })` — client component. Renders `null` when closed. `hint` shows the unpinned-My-Team explainer line. Task 5's `BottomNav` renders it.

- [ ] **Step 1: Write the failing tests**

Create `src/components/LeagueSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LeagueSheet } from './LeagueSheet'

describe('LeagueSheet', () => {
  it('renders nothing while closed', () => {
    const { container } = render(<LeagueSheet open={false} onClose={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('lists the five leagues as links that close the sheet on tap', () => {
    const onClose = vi.fn()
    render(<LeagueSheet open onClose={onClose} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(5)
    expect(screen.getByText('Premier League').closest('a')?.getAttribute('href')).toBe('/premier-league')
    expect(screen.getByText('MLS').closest('a')?.getAttribute('href')).toBe('/mls')
    fireEvent.click(screen.getByText('La Liga'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows the pin explainer only when hint is set', () => {
    const { rerender } = render(<LeagueSheet open onClose={() => {}} />)
    expect(screen.queryByText(/No team pinned/)).toBeNull()
    rerender(<LeagueSheet open hint onClose={() => {}} />)
    expect(screen.getByText(/No team pinned — pick a league, open a team/)).toBeDefined()
  })

  it('closes on Escape and on backdrop tap', () => {
    const onClose = vi.fn()
    render(<LeagueSheet open onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Close leagues' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('moves focus into the sheet on open and restores it on close', () => {
    const { rerender } = render(
      <>
        <button>opener</button>
        <LeagueSheet open={false} onClose={() => {}} />
      </>,
    )
    screen.getByText('opener').focus()
    rerender(
      <>
        <button>opener</button>
        <LeagueSheet open onClose={() => {}} />
      </>,
    )
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
    rerender(
      <>
        <button>opener</button>
        <LeagueSheet open={false} onClose={() => {}} />
      </>,
    )
    expect(document.activeElement).toBe(screen.getByText('opener'))
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/components/LeagueSheet.test.tsx`
Expected: FAIL — cannot resolve `./LeagueSheet`.

- [ ] **Step 3: Implement the component**

Create `src/components/LeagueSheet.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { LEAGUES } from '@/lib/leagues'

// Bottom sheet above the mobile tab bar. Same focus/Escape pattern as the
// calendar day panel in CalendarView.
export function LeagueSheet({
  open,
  hint = false,
  onClose,
}: {
  open: boolean
  hint?: boolean
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      panelRef.current?.focus()
    } else {
      openerRef.current?.focus()
      openerRef.current = null
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button aria-label="Close leagues" onClick={onClose} className="absolute inset-0 bg-pitch/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Leagues"
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 overscroll-contain rounded-t-[10px] border-t border-rule bg-board pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 outline-none"
      >
        <div aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-full bg-rule" />
        {hint && (
          <p className="border-b border-rule px-4 pb-3 text-xs leading-relaxed text-dim">
            No team pinned — pick a league, open a team, tap ☆ Pin as my team.
          </p>
        )}
        <nav aria-label="Leagues">
          {LEAGUES.map((l) => (
            <Link
              key={l.slug}
              href={`/${l.slug}`}
              onClick={onClose}
              className="flex min-h-12 items-center gap-3 border-b border-rule/60 px-4 text-sm font-semibold last:border-b-0 active:bg-board-hi"
            >
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: l.accent }} />
              {l.name}
              <span className="eyebrow ml-auto">{l.shortName}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/components/LeagueSheet.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/LeagueSheet.tsx src/components/LeagueSheet.test.tsx
git commit -m "feat: LeagueSheet mobile bottom sheet"
```

---

### Task 5: BottomNav tab bar

Four fixed bottom tabs (`md:hidden`): Home, Leagues (opens the sheet), Calendar, My Team (pinned team page, or the sheet with a hint when unpinned).

**Files:**
- Create: `src/components/BottomNav.tsx`
- Modify: `src/components/MyTeam.tsx` (extract a `useMyTeam` hook; `MyTeamLink` reuses it)
- Test: `src/components/BottomNav.test.tsx`

**Interfaces:**
- Consumes: `LeagueSheet({ open, hint?, onClose })` from Task 4; `LEAGUES` from `@/lib/leagues`; `usePathname` from `next/navigation`; `lv-myteam` localStorage key + `lv-myteam` window event (existing).
- Produces:
  - `BottomNav()` — client component, no props, renders its own `LeagueSheet`. Task 6 mounts it in the root layout. Its `<nav aria-label="Primary">` and `h-14` (3.5rem) height are relied on by Task 6's offsets and Task 11's audit.
  - `useMyTeam(): { league: string; slug: string; name: string } | null` exported from `src/components/MyTeam.tsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/BottomNav.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const nav = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  beforeEach(() => {
    window.localStorage.clear()
    nav.pathname = '/'
  })

  it('renders the four tabs with Home active on /', () => {
    render(<BottomNav />)
    expect(screen.getByText('Home')).toBeDefined()
    expect(screen.getByText('Leagues')).toBeDefined()
    expect(screen.getByText('Calendar')).toBeDefined()
    expect(screen.getByText('My Team')).toBeDefined()
    expect(screen.getByText('Home').closest('a')?.getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Calendar').closest('a')?.getAttribute('aria-current')).toBeNull()
  })

  it('marks Calendar active on /calendar', () => {
    nav.pathname = '/calendar'
    render(<BottomNav />)
    expect(screen.getByText('Calendar').closest('a')?.getAttribute('aria-current')).toBe('page')
  })

  it('opens the league sheet from the Leagues tab, without the pin hint', () => {
    render(<BottomNav />)
    fireEvent.click(screen.getByText('Leagues'))
    expect(screen.getByRole('dialog', { name: 'Leagues' })).toBeDefined()
    expect(screen.queryByText(/No team pinned/)).toBeNull()
  })

  it('unpinned My Team opens the sheet with the pin explainer', () => {
    render(<BottomNav />)
    fireEvent.click(screen.getByText('My Team'))
    expect(screen.getByRole('dialog', { name: 'Leagues' })).toBeDefined()
    expect(screen.getByText(/No team pinned — pick a league, open a team/)).toBeDefined()
  })

  it('pinned My Team links to the team page and shows the short name', () => {
    window.localStorage.setItem(
      'lv-myteam',
      JSON.stringify({ league: 'premier-league', slug: 'arsenal', name: 'Arsenal' }),
    )
    nav.pathname = '/premier-league/arsenal'
    render(<BottomNav />)
    const tab = screen.getByText('Arsenal').closest('a')
    expect(tab?.getAttribute('href')).toBe('/premier-league/arsenal')
    expect(tab?.getAttribute('aria-current')).toBe('page')
  })

  it('marks Leagues active on league pages that are not the pinned team', () => {
    nav.pathname = '/la-liga'
    render(<BottomNav />)
    expect(screen.getByText('Leagues').closest('button')?.className).toContain('text-chalk')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/components/BottomNav.test.tsx`
Expected: FAIL — cannot resolve `./BottomNav`.

- [ ] **Step 3: Extract `useMyTeam` in MyTeam.tsx**

Replace the whole of `src/components/MyTeam.tsx` with:

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const KEY = 'lv-myteam'

interface MyTeam {
  league: string
  slug: string
  name: string
}

function read(): MyTeam | null {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

/** The pinned team, kept live across tabs of this page via the lv-myteam event. */
export function useMyTeam(): MyTeam | null {
  const [team, setTeam] = useState<MyTeam | null>(null)
  useEffect(() => {
    setTeam(read())
    const onChange = () => setTeam(read())
    window.addEventListener('lv-myteam', onChange)
    return () => window.removeEventListener('lv-myteam', onChange)
  }, [])
  return team
}

export function MyTeamLink() {
  const team = useMyTeam()
  if (!team) return null
  return (
    <Link
      href={`/${team.league}/${team.slug}`}
      className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-dim transition-colors hover:text-chalk"
    >
      ★ {team.name}
    </Link>
  )
}

export function PinTeamButton({ league, slug, name }: MyTeam) {
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    setPinned(read()?.slug === slug)
  }, [slug])
  const togglePin = () => {
    const next = read()?.slug === slug ? null : { league, slug, name }
    window.localStorage.setItem(KEY, JSON.stringify(next))
    setPinned(next !== null)
    window.dispatchEvent(new Event('lv-myteam'))
  }
  return (
    <button onClick={togglePin} className="btn" aria-pressed={pinned}>
      {pinned ? '★ Unpin my team' : '☆ Pin as my team'}
    </button>
  )
}
```

- [ ] **Step 4: Implement BottomNav**

Create `src/components/BottomNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LEAGUES } from '@/lib/leagues'
import { LeagueSheet } from './LeagueSheet'
import { useMyTeam } from './MyTeam'

function TabIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      {children}
    </svg>
  )
}

const TAB = 'flex min-h-11 flex-col items-center justify-center gap-1 transition-colors'
const LABEL = 'max-w-full truncate px-1 text-[10px] font-semibold uppercase tracking-wider'

export function BottomNav() {
  const pathname = usePathname()
  const team = useMyTeam()
  const [sheet, setSheet] = useState<'closed' | 'leagues' | 'myteam'>('closed')

  const myTeamActive = team !== null && pathname === `/${team.league}/${team.slug}`
  const leaguesActive =
    !myTeamActive &&
    (pathname === '/cups' ||
      pathname.startsWith('/cups/') ||
      LEAGUES.some((l) => pathname === `/${l.slug}` || pathname.startsWith(`/${l.slug}/`)))

  const cls = (active: boolean) => `${TAB} ${active ? 'text-chalk' : 'text-dim'}`

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-pitch/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid h-14 grid-cols-4">
          <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className={cls(pathname === '/')}>
            <TabIcon>
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
            </TabIcon>
            <span className={LABEL}>Home</span>
          </Link>
          <button onClick={() => setSheet('leagues')} aria-haspopup="dialog" className={cls(leaguesActive)}>
            <TabIcon>
              <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M7 6H4v1a3 3 0 0 0 3 3" />
              <path d="M17 6h3v1a3 3 0 0 1-3 3" />
              <path d="M12 14v3" />
              <path d="M8 21h8m-4-4v4" />
            </TabIcon>
            <span className={LABEL}>Leagues</span>
          </button>
          <Link
            href="/calendar"
            aria-current={pathname === '/calendar' ? 'page' : undefined}
            className={cls(pathname === '/calendar')}
          >
            <TabIcon>
              <path d="M4 5h16v15H4z" />
              <path d="M4 9h16" />
              <path d="M8 3v4M16 3v4" />
            </TabIcon>
            <span className={LABEL}>Calendar</span>
          </Link>
          {team ? (
            <Link
              href={`/${team.league}/${team.slug}`}
              aria-current={myTeamActive ? 'page' : undefined}
              className={cls(myTeamActive)}
            >
              <TabIcon>
                <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />
              </TabIcon>
              <span className={LABEL}>{team.name}</span>
            </Link>
          ) : (
            <button onClick={() => setSheet('myteam')} aria-haspopup="dialog" className={cls(false)}>
              <TabIcon>
                <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />
              </TabIcon>
              <span className={LABEL}>My Team</span>
            </button>
          )}
        </div>
      </nav>
      <LeagueSheet open={sheet !== 'closed'} hint={sheet === 'myteam'} onClose={() => setSheet('closed')} />
    </>
  )
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- src/components/BottomNav.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 6: Full suite (MyTeam refactor must not break anything), commit**

Run: `npm test` — Expected: PASS.

```bash
git add src/components/BottomNav.tsx src/components/BottomNav.test.tsx src/components/MyTeam.tsx
git commit -m "feat: BottomNav mobile tab bar with pinned My Team tab"
```

---

### Task 6: Mobile app shell — slim header, logo lockup, wire the chrome into the layout

Header collapses to one slim row on phones (logo lockup + timezone select); `LeagueNav`/`MyTeamLink` hide below `md`; `BottomNav` mounts; the selection tray and calendar day panel float above the nav; footer gains the mark.

**Files:**
- Modify: `src/app/layout.tsx` (full file below)
- Modify: `src/components/LeagueNav.tsx:13`
- Modify: `src/components/MyTeam.tsx` (MyTeamLink className)
- Modify: `src/components/SelectionTray.tsx:10`
- Modify: `src/components/CalendarView.tsx:268`

**Interfaces:**
- Consumes: `BottomNav()` (Task 5), `/brand/mark.png` (Task 2). BottomNav bar height is `3.5rem` (`h-14`) + `env(safe-area-inset-bottom)` — every offset below uses that.
- Produces: nothing new for later tasks except the mounted shell; Task 7 adds `<SplashIntro />` to this same layout.

- [ ] **Step 1: Hide LeagueNav below md**

In `src/components/LeagueNav.tsx` change line 13 from:

```tsx
    <nav className="-mb-px flex gap-4 overflow-x-auto">
```

to:

```tsx
    <nav className="-mb-px hidden gap-4 overflow-x-auto md:flex">
```

- [ ] **Step 2: Hide MyTeamLink below md**

In `src/components/MyTeam.tsx`, in `MyTeamLink`, change the Link className from:

```tsx
      className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-dim transition-colors hover:text-chalk"
```

to:

```tsx
      className="hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-dim transition-colors hover:text-chalk md:inline"
```

- [ ] **Step 3: Lift the SelectionTray above the bottom nav**

In `src/components/SelectionTray.tsx` change line 10 from:

```tsx
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-pitch/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
```

to:

```tsx
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 border-t border-rule bg-pitch/95 px-4 py-3 backdrop-blur sm:px-6 md:bottom-0 lg:px-8">
```

- [ ] **Step 4: Make the calendar day panel nav-aware**

In `src/components/CalendarView.tsx` (line 268), the day-panel `className` currently reads:

```tsx
          className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto border-t border-rule bg-pitch/95 p-4 backdrop-blur outline-none sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 sm:rounded-[3px] sm:border"
```

Replace it with (the floating variant now starts at `md`, where the bottom nav disappears):

```tsx
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 max-h-[70vh] overflow-y-auto border-t border-rule bg-pitch/95 p-4 backdrop-blur outline-none md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-[3px] md:border"
```

- [ ] **Step 5: Rewrite the root layout body**

Replace the `RootLayout` function in `src/app/layout.tsx` with (imports for `Image` and `BottomNav` added; metadata/viewport from Task 3 stay untouched):

```tsx
import type { Metadata, Viewport } from 'next'
import { Archivo, Martian_Mono } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { LeagueNav } from '@/components/LeagueNav'
import { MyTeamLink } from '@/components/MyTeam'
import { SelectionTray } from '@/components/SelectionTray'
import { TimezoneProvider } from '@/components/TimezoneProvider'
import { TimezoneSelect } from '@/components/TimezoneSelect'
import './globals.css'
```

(keep the font constants and the Task 3 `viewport`/`STARTUP_IMAGES`/`metadata` blocks exactly as they are, then:)

```tsx
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The font vars must live on :root — @theme declares --font-sans there as
  // var(--font-archivo), which is invalid at computed-value time if the vars
  // are only defined further down the tree.
  return (
    <html lang="en" className={`${archivo.variable} ${martian.variable}`}>
      <body className="bg-pitch text-chalk antialiased">
        <TimezoneProvider>
          <header className="sticky top-0 z-40 border-b border-rule bg-pitch/90 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/brand/mark.png" alt="" width={20} height={20} className="size-5" priority />
                <span className="display text-[15px] leading-none">Leagueville</span>
              </Link>
              <LeagueNav />
              <div className="ml-auto flex items-center gap-3">
                <MyTeamLink />
                <TimezoneSelect />
              </div>
            </div>
          </header>
          <main className="px-4 py-8 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-24 lg:px-8">
            {children}
          </main>
          <SelectionTray />
          <BottomNav />
          <footer className="border-t border-rule px-4 py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-8 lg:px-8">
            <div className="flex items-start gap-3">
              <Image src="/brand/mark.png" alt="Leagueville" width={24} height={24} className="size-6" />
              <div>
                <p className="eyebrow">Data from ESPN and TheSportsDB</p>
                <p className="mt-1.5 text-xs text-dim">Not affiliated with any league or club.</p>
              </div>
            </div>
          </footer>
        </TimezoneProvider>
      </body>
    </html>
  )
}
```

(The home hero keeps its pure-type treatment — the spec's "may incorporate the mark tastefully" is optional and the pixel-identical-desktop constraint wins.)

- [ ] **Step 6: Run the suite (LeagueNav test asserts content, not classes — must stay green)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Smoke-check the rendered shell**

```bash
cd /home/igodl/code/soccer && npm run dev -- --port 3123 &
sleep 8
curl -s http://localhost:3123/ | grep -c 'aria-label="Primary"'
curl -s http://localhost:3123/ | grep -o 'hidden gap-4 overflow-x-auto md:flex\|/brand/mark.png' | sort | uniq -c
kill %1
```

Expected: `aria-label="Primary"` count `1`; the LeagueNav class string appears once; `/brand/mark.png` appears at least twice (header + footer).

- [ ] **Step 8: Commit**

```bash
git add src/app/layout.tsx src/components/LeagueNav.tsx src/components/MyTeam.tsx src/components/SelectionTray.tsx src/components/CalendarView.tsx
git commit -m "feat: mobile app shell — slim header, logo lockup, bottom nav wiring"
```

---

### Task 7: Cinematic in-app splash

Once per session (sessionStorage), a full-screen black overlay plays ≤1.6s of pure CSS: the ball drops/rolls in, the full logo resolves around it, the overlay fades. Skipped under `prefers-reduced-motion`. Content renders concurrently underneath, so TTI is unaffected.

**Files:**
- Create: `src/components/SplashIntro.tsx`
- Modify: `src/app/globals.css` (splash keyframes/classes)
- Modify: `src/app/layout.tsx` (mount)
- Test: `src/components/SplashIntro.test.tsx`

**Interfaces:**
- Consumes: `/brand/logo-full.png` and `/brand/ball.png` (Task 2). Ball placement inside the square logo: `left 41%, top 25.6%, width 19.5%` (measured on the master).
- Produces: `SplashIntro()` — client component, no props, mounted once in the root layout. sessionStorage key: `lv-splash`. Task 11's audit presets that key so screenshots skip the overlay.

- [ ] **Step 1: Write the failing tests**

Create `src/components/SplashIntro.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { SplashIntro } from './SplashIntro'

beforeEach(() => {
  window.sessionStorage.clear()
  // jsdom has no matchMedia
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('SplashIntro', () => {
  it('plays on a fresh session and records the visit', () => {
    const { getByTestId } = render(<SplashIntro />)
    expect(getByTestId('splash')).toBeDefined()
    expect(window.sessionStorage.getItem('lv-splash')).toBe('1')
  })

  it('does not play again within the same session', () => {
    window.sessionStorage.setItem('lv-splash', '1')
    const { queryByTestId } = render(<SplashIntro />)
    expect(queryByTestId('splash')).toBeNull()
  })

  it('skips entirely under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const { queryByTestId } = render(<SplashIntro />)
    expect(queryByTestId('splash')).toBeNull()
  })

  it('removes itself after the animation window', () => {
    vi.useFakeTimers()
    const { queryByTestId } = render(<SplashIntro />)
    expect(queryByTestId('splash')).toBeDefined()
    act(() => {
      vi.advanceTimersByTime(1700)
    })
    expect(queryByTestId('splash')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/components/SplashIntro.test.tsx`
Expected: FAIL — cannot resolve `./SplashIntro`.

- [ ] **Step 3: Implement the component**

Create `src/components/SplashIntro.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

const KEY = 'lv-splash'

// Once-per-session cinematic intro. All motion is CSS (see .lv-splash in
// globals.css); JS only decides whether to mount and when to unmount. The app
// renders concurrently underneath, so the splash costs no time-to-interactive.
export function SplashIntro() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(KEY)) return
      window.sessionStorage.setItem(KEY, '1')
    } catch {
      return // storage unavailable — never risk replaying on every navigation
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setShow(true)
    // Fallback for the animationend event (the global reduced-motion CSS kill
    // switch, a hidden tab, etc. must never leave the overlay stuck).
    const timer = window.setTimeout(() => setShow(false), 1700)
    return () => window.clearTimeout(timer)
  }, [])

  if (!show) return null
  return (
    <div
      data-testid="splash"
      aria-hidden
      className="lv-splash"
      onAnimationEnd={(e) => {
        if (e.animationName === 'lv-splash-out') setShow(false)
      }}
    >
      <div className="lv-splash-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-full.png" alt="" className="lv-splash-logo" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/ball.png" alt="" className="lv-splash-ball" />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add the splash CSS**

Append to `src/app/globals.css`, after the `@layer components` block and before the `:where(...)` focus rule:

```css
/* Cinematic splash intro — once per session, ≤1.6s total, pure CSS motion.
   Timeline: ball drops/rolls in (0–0.55s), full logo resolves around it
   (0.55–1.05s), overlay fades out (1.3–1.6s). The component skips mounting
   under prefers-reduced-motion, so the global animation kill switch below
   never traps the overlay on screen. */
.lv-splash {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: #000;
  animation: lv-splash-out 0.3s ease 1.3s forwards;
}
.lv-splash-stage {
  position: relative;
  width: min(55vw, 340px);
  aspect-ratio: 1;
}
.lv-splash-logo {
  width: 100%;
  height: 100%;
  opacity: 0;
  animation: lv-logo-in 0.5s ease 0.55s forwards;
}
.lv-splash-ball {
  position: absolute;
  /* the ball's position inside the square master logo */
  left: 41%;
  top: 25.6%;
  width: 19.5%;
  animation: lv-ball-in 0.55s cubic-bezier(0.34, 1.3, 0.64, 1) forwards;
}
@keyframes lv-ball-in {
  from {
    transform: translateY(-60vh) rotate(-300deg);
  }
  to {
    transform: translateY(0) rotate(0deg);
  }
}
@keyframes lv-logo-in {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes lv-splash-out {
  to {
    opacity: 0;
    visibility: hidden;
  }
}
```

- [ ] **Step 5: Mount it in the root layout**

In `src/app/layout.tsx` add the import:

```tsx
import { SplashIntro } from '@/components/SplashIntro'
```

and render it as the first child inside `<TimezoneProvider>`:

```tsx
        <TimezoneProvider>
          <SplashIntro />
          <header className="sticky top-0 z-40 border-b border-rule bg-pitch/90 backdrop-blur">
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test -- src/components/SplashIntro.test.tsx`
Expected: PASS (4 tests). Then `npm test` — all green.

- [ ] **Step 7: Manual check**

Run `npm run dev -- --port 3123`, open `http://localhost:3123` in a fresh browser tab: black overlay, ball drops and rolls in, logo resolves, fade — total under 1.6s. Reload: no splash (same session). Kill the server.

- [ ] **Step 8: Commit**

```bash
git add src/components/SplashIntro.tsx src/components/SplashIntro.test.tsx src/app/globals.css src/app/layout.tsx
git commit -m "feat: cinematic once-per-session splash intro"
```

---

### Task 8: FixtureCard stacked mobile layout

Below `sm`, restack in the style of `GameRow`: time/score as a left column, teams on two lines, league chip inline, pick button right; the row (except the pick button) links to `/{league}/game/{id}`. From `sm` up, today's single-line layout is untouched.

**Files:**
- Modify: `src/components/FixtureCard.tsx` (full rewrite below)
- Test: `src/components/FixtureCard.test.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `Fixture` from `@/lib/types`; game route `/{competition}/game/{id}` (exists: `src/app/[league]/game/[id]/page.tsx`); `formatKickoff`, `TeamLogo`, `useTz`, `usePicks` as today.
- Produces: same public API `FixtureCard({ fixture, pickable?, showLeague? })`. Renders **two** sibling rows: `sm:hidden` mobile and `hidden sm:flex` desktop — jsdom tests must use `getAllBy*`. Keeps Task 1's invariant (exactly 2 `div.flex-1` elements, both `min-w-0`). The mobile pick button is `min-h-11` (Task 9 relies on this being already done).

- [ ] **Step 1: Rewrite the test file (failing first)**

Replace `src/components/FixtureCard.test.tsx` entirely with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Fixture } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { FixtureCard } from './FixtureCard'

const base: Fixture = {
  id: '1',
  competition: 'premier-league',
  kickoff: '2026-08-22T14:00:00.000Z',
  status: 'scheduled',
  statusDetail: '',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
}

// The card renders a stacked mobile row (sm:hidden) and the classic desktop
// row (hidden sm:flex); jsdom applies no media queries, so shared content
// appears twice.
describe('FixtureCard', () => {
  it('shows team names and kickoff time in both layouts for a scheduled game', () => {
    render(<FixtureCard fixture={base} />)
    expect(screen.getAllByText('Liverpool')).toHaveLength(2)
    expect(screen.getAllByText('Everton')).toHaveLength(2)
    expect(screen.getAllByText('2:00 PM')).toHaveLength(2) // default tz is UTC
  })

  it('shows the score in both layouts for a finished game', () => {
    render(
      <FixtureCard
        fixture={{
          ...base,
          status: 'final',
          statusDetail: 'FT',
          home: { ...base.home, score: 2 },
          away: { ...base.away, score: 1 },
        }}
      />,
    )
    expect(screen.getAllByText('2–1')).toHaveLength(2)
    expect(screen.getByText('FT')).toBeDefined()
  })

  it('shows a pick toggle in each layout only when pickable and scheduled', () => {
    render(<FixtureCard fixture={base} pickable />)
    expect(screen.getAllByRole('button', { name: /cal/i })).toHaveLength(2)
  })

  it('shows a competition badge for cup fixtures when showLeague is set', () => {
    render(<FixtureCard fixture={{ ...base, competition: 'fa-cup' }} showLeague />)
    expect(screen.getAllByText('FA Cup')).toHaveLength(2)
  })

  it('links the mobile row to the game page', () => {
    const { container } = render(<FixtureCard fixture={base} pickable />)
    const link = container.querySelector('a[href="/premier-league/game/1"]')
    expect(link).not.toBeNull()
    expect(link?.textContent).toContain('Liverpool')
    expect(link?.textContent).toContain('Everton')
  })

  it('lets long team names truncate instead of overflowing the row', () => {
    const fixture: Fixture = {
      ...base,
      home: { id: 'h', name: 'Borussia Mönchengladbach Development Squad' },
      away: { id: 'a', name: 'Wolverhampton Wanderers Reserves and Academy' },
    }
    const { container } = render(<FixtureCard fixture={fixture} pickable />)
    const halves = container.querySelectorAll('div.flex-1')
    expect(halves.length).toBe(2)
    for (const el of halves) {
      expect(el.className).toContain('min-w-0')
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/components/FixtureCard.test.tsx`
Expected: FAIL — `getAllByText('Liverpool')` finds 1 element (expected 2) and the game-page link is missing.

- [ ] **Step 3: Rewrite the component**

Replace `src/components/FixtureCard.tsx` entirely with:

```tsx
'use client'

import Link from 'next/link'
import { getCompetition } from '@/lib/leagues'
import { formatKickoff } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { TeamLogo } from './TeamLogo'
import { useTz } from './TimezoneProvider'
import { usePicks } from './picks'

export function FixtureCard({
  fixture,
  pickable = false,
  showLeague = false,
}: {
  fixture: Fixture
  pickable?: boolean
  showLeague?: boolean
}) {
  const { tz } = useTz()
  const { picks, toggle } = usePicks()
  const token = `${fixture.competition}:${fixture.id}`
  const picked = picks.includes(token)
  const competition = getCompetition(fixture.competition)
  const live = fixture.status === 'live'
  const showScore = live || fixture.status === 'final'

  const chip = showLeague && competition && (
    <span
      className="num shrink-0 rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${competition.accent}26`, color: competition.accent }}
    >
      {competition.shortName}
    </span>
  )

  const pickButton = (mobile: boolean) =>
    pickable &&
    fixture.status === 'scheduled' && (
      <button
        onClick={() => toggle(token)}
        aria-pressed={picked}
        className={`shrink-0 rounded-[2px] border font-bold uppercase tracking-wider transition-colors ${
          mobile ? 'min-h-11 px-2.5 text-[11px]' : 'px-2 py-1 text-[10px]'
        } ${
          picked ? 'border-chalk bg-chalk text-pitch' : 'border-rule text-dim hover:border-chalk/45 hover:text-chalk'
        }`}
      >
        {picked ? 'In cal' : '+ Cal'}
      </button>
    )

  return (
    <>
      {/* < sm: stacked GameRow-style row; everything but the pick button links
          to the game page. Team names render in full, truncating only as a
          last resort. */}
      <div className="board-row flex min-h-14 items-center gap-2 px-3 py-2 sm:hidden">
        <Link href={`/${fixture.competition}/game/${fixture.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex w-14 shrink-0 flex-col items-start gap-1 text-dim">
            {fixture.status === 'postponed' ? (
              <span className="eyebrow line-through decoration-1">PPD</span>
            ) : showScore ? (
              <span className="num text-[13px] font-bold text-chalk">
                <span className={live ? 'score-live' : undefined}>
                  {fixture.home.score ?? '-'}–{fixture.away.score ?? '-'}
                </span>
              </span>
            ) : (
              <span className="num text-[12px] font-medium leading-tight">{formatKickoff(fixture.kickoff, tz)}</span>
            )}
            {live && (
              <span className="eyebrow flex items-center gap-1 text-chalk">
                <span className="dot-live" aria-hidden />
                {fixture.statusDetail}
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5">
              <TeamLogo src={fixture.home.logo} alt={fixture.home.name} size={18} />
              <span className="truncate text-[13px] font-medium">{fixture.home.name}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TeamLogo src={fixture.away.logo} alt={fixture.away.name} size={18} />
              <span className="truncate text-[13px] font-medium">{fixture.away.name}</span>
            </span>
          </span>
          {chip}
        </Link>
        {pickButton(true)}
      </div>

      {/* sm+: the original single-line layout, truncating correctly. */}
      <div className="board-row hidden items-center gap-3 px-4 py-3 sm:flex">
        {chip}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
          <span className="truncate text-sm font-medium">{fixture.home.name}</span>
          <TeamLogo src={fixture.home.logo} alt={fixture.home.name} size={28} />
        </div>
        <div className="w-[92px] shrink-0 text-center">
          {showScore ? (
            <>
              <div className="num text-[17px] font-bold leading-tight">
                <span className={live ? 'score-live' : undefined}>
                  {fixture.home.score ?? '-'}–{fixture.away.score ?? '-'}
                </span>
              </div>
              <div className="eyebrow mt-1 flex items-center justify-center gap-1.5">
                {live && <span className="dot-live" aria-hidden />}
                <span className={live ? 'text-chalk' : undefined}>
                  {live ? `Live · ${fixture.statusDetail}` : fixture.statusDetail}
                </span>
              </div>
            </>
          ) : fixture.status === 'postponed' ? (
            <div className="eyebrow line-through decoration-1">Postponed</div>
          ) : (
            <div className="num text-[13px] font-medium leading-tight">{formatKickoff(fixture.kickoff, tz)}</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamLogo src={fixture.away.logo} alt={fixture.away.name} size={28} />
          <span className="truncate text-sm font-medium">{fixture.away.name}</span>
        </div>
        {pickButton(false)}
      </div>
    </>
  )
}
```

Note the only change to the desktop row versus today: `px-3 py-3 sm:px-4` becomes `px-4 py-3` (it only exists from `sm` up now, where `sm:px-4` already applied) — pixel-identical at `sm`+.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/components/FixtureCard.test.tsx`
Expected: PASS (6 tests). Then `npm test` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/FixtureCard.tsx src/components/FixtureCard.test.tsx
git commit -m "feat: stacked mobile fixture rows linking to game pages"
```

---

### Task 9: Touch ergonomics pass

44px effective targets, mobile type bump, pressed states, tap-highlight/touch-action polish. All CSS/class changes; each desktop value is restored at `sm:`/`md:`. (The FixtureCard mobile pick button was already sized in Task 8; the bottom nav and sheet were born ≥44px.)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/TimezoneSelect.tsx:14`
- Modify: `src/components/GameRow.tsx:28,44,48`
- Modify: `src/components/CalendarView.tsx:168,182,218`
- Modify: `src/app/[league]/page.tsx:82`

**Interfaces:**
- Consumes: existing `.btn`/`.btn-primary`/`.btn-muted`/`.board-row` component classes.
- Produces: below `md`, all `.btn*` render as `inline-flex` with `min-height: 44px`; `.board-row` and `.btn*` have `:active` pressed feedback. Verified by Task 11's tap-target sweep.

- [ ] **Step 1: Global touch polish + button sizing in globals.css**

In `src/app/globals.css`, inside `@layer components`, add after the `.board-row:hover` rule:

```css
  .board-row:active {
    background-color: var(--color-board-hi);
  }
```

add after the `.btn:hover` rule:

```css
  .btn:active {
    border-color: color-mix(in srgb, var(--color-chalk) 45%, transparent);
    background-color: var(--color-board-hi);
  }
```

add after the `.btn-primary:hover` rule:

```css
  .btn-primary:active {
    background-color: #ffffff;
  }
```

add after the `.btn-muted:hover` rule:

```css
  .btn-muted:active {
    color: var(--color-chalk);
  }
```

Then append this block immediately after the closing brace of `@layer components` (before the `.lv-splash` rules):

```css
/* Touch polish. */
html {
  -webkit-tap-highlight-color: transparent;
}
a,
button,
select,
summary,
[role='button'] {
  touch-action: manipulation;
}

/* ≥44px effective targets while the mobile chrome is showing (< md). */
@media (width < 48rem) {
  .btn,
  .btn-primary,
  .btn-muted {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
  }
}

/* Type bump for interactive/reading text below sm (11px → 12px). Pure
   labels (.eyebrow) intentionally stay at 9px. */
@media (width < 40rem) {
  .btn,
  .btn-primary,
  .btn-muted {
    font-size: 12px;
  }
}
```

- [ ] **Step 2: TimezoneSelect grows to 44px on mobile**

In `src/components/TimezoneSelect.tsx` change the select className (line 14) from:

```tsx
      className="max-w-40 rounded-[3px] border border-rule bg-board px-2 py-1.5 text-[11px] text-dim transition-colors hover:text-chalk"
```

to:

```tsx
      className="min-h-11 max-w-40 rounded-[3px] border border-rule bg-board px-2 py-1.5 text-xs text-dim transition-colors hover:text-chalk md:min-h-0 md:text-[11px]"
```

- [ ] **Step 3: GameRow type bump below sm**

In `src/components/GameRow.tsx`:

Line 28, change:

```tsx
        <span className="num w-14 shrink-0 text-[11px] leading-none text-dim">
```

to:

```tsx
        <span className="num w-14 shrink-0 text-xs leading-none text-dim sm:text-[11px]">
```

Lines 44 and 48, change both name spans from:

```tsx
            <span className="truncate text-xs font-medium">{fixture.home.name}</span>
```

to:

```tsx
            <span className="truncate text-[13px] font-medium sm:text-xs">{fixture.home.name}</span>
```

(and the same for `fixture.away.name`).

- [ ] **Step 4: Calendar view-switcher tabs and filter chips**

In `src/components/CalendarView.tsx`:

The view-switcher Link className (line 168) — change:

```tsx
              className={`-mb-px border-b-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
```

to:

```tsx
              className={`-mb-px inline-flex min-h-11 items-center border-b-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors md:min-h-0 ${
```

The league chip class (line 182) — change:

```tsx
          const chipClassName = `num rounded-[2px] border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
```

to:

```tsx
          const chipClassName = `num rounded-[2px] border px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors md:px-2 md:py-1 md:text-[9px] ${
```

The pinned-team chip (line 218) — change:

```tsx
            className={`num rounded-[2px] border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
```

to:

```tsx
            className={`num rounded-[2px] border px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors md:px-2 md:py-1 md:text-[9px] ${
```

- [ ] **Step 5: League page tabs**

In `src/app/[league]/page.tsx` (line 82) change:

```tsx
            className={`-mb-px border-b-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
```

to:

```tsx
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors md:min-h-0 ${
```

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: PASS — no test asserts these class strings; physical sizes get verified by Task 11's tap-target sweep.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/components/TimezoneSelect.tsx src/components/GameRow.tsx src/components/CalendarView.tsx "src/app/[league]/page.tsx"
git commit -m "feat: touch ergonomics — 44px targets, mobile type bump, pressed states"
```

---

### Task 10: Responsive tables

Standings below `sm` show Pos/Team/P/GD/Pts (W, D, L, GF, GA hidden) and drop the forced 560px width; squad table never wraps the age column.

**Files:**
- Modify: `src/components/StandingsTable.tsx`
- Modify: `src/components/SquadTable.tsx:37-39`
- Test: `src/components/StandingsTable.test.tsx` (extend the existing file)
- Test: `src/components/SquadTable.test.tsx` (new)

**Interfaces:**
- Consumes: `StandingsGroup`, `Player` from `@/lib/types`.
- Produces: no API changes. Hidden columns carry `hidden sm:table-cell`; table className is `w-full text-sm sm:min-w-[560px]`.

- [ ] **Step 1: Write the failing tests**

Append to the `describe('StandingsTable', ...)` block in `src/components/StandingsTable.test.tsx`:

```tsx
  it('hides W/D/L and GF/GA below sm, keeping Pos, team, P, GD, Pts', () => {
    render(<StandingsTable group={group} leagueSlug="premier-league" />)
    for (const h of ['W', 'D', 'L', 'GF', 'GA']) {
      expect(screen.getByText(h).className).toContain('hidden sm:table-cell')
    }
    for (const h of ['Pos', 'P', 'GD', 'Pts']) {
      expect(screen.getByText(h).className).not.toContain('hidden')
    }
  })

  it('only forces the 560px table width from sm up', () => {
    const { container } = render(<StandingsTable group={group} leagueSlug="premier-league" />)
    const table = container.querySelector('table')
    expect(table?.className).toContain('sm:min-w-[560px]')
    expect(table?.className).not.toContain(' min-w-[560px]')
  })
```

Create `src/components/SquadTable.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Player } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { SquadTable } from './SquadTable'

const players: Player[] = [
  { id: 'p1', name: 'Jordan Pickford', position: 'Goalkeeper', jersey: '1', age: 31, nationality: 'England' },
]

describe('SquadTable', () => {
  it('groups players under their position heading', () => {
    render(<SquadTable players={players} />)
    expect(screen.getByText('Goalkeepers')).toBeDefined()
    expect(screen.getByText('Jordan Pickford')).toBeDefined()
  })

  it('never wraps the age column', () => {
    render(<SquadTable players={players} />)
    expect(screen.getByText('31 yrs').className).toContain('whitespace-nowrap')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/components/StandingsTable.test.tsx src/components/SquadTable.test.tsx`
Expected: the two new StandingsTable tests FAIL (`hidden sm:table-cell` missing; unconditional `min-w-[560px]` present); SquadTable's age test FAILS (`whitespace-nowrap` missing).

- [ ] **Step 3: Make StandingsTable responsive**

In `src/components/StandingsTable.tsx`, change the constant on line 5 from:

```tsx
const STAT = 'px-2 py-2.5 text-center text-[13px] tabular-nums text-dim'
```

to:

```tsx
const STAT = 'px-2 py-2.5 text-center text-[13px] tabular-nums text-dim'
// W/D/L and GF/GA don't fit a 390px screen; the table stays scannable with
// Pos, team, P, GD, Pts.
const STAT_SM = `hidden sm:table-cell ${STAT}`
```

Change the table element from:

```tsx
          <table className="w-full min-w-[560px] text-sm">
```

to:

```tsx
          <table className="w-full text-sm sm:min-w-[560px]">
```

Change the five hidden header cells from:

```tsx
                <th className="eyebrow px-2 py-2.5 text-center font-normal">W</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">D</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">L</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">GF</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">GA</th>
```

to:

```tsx
                <th className="eyebrow hidden sm:table-cell px-2 py-2.5 text-center font-normal">W</th>
                <th className="eyebrow hidden sm:table-cell px-2 py-2.5 text-center font-normal">D</th>
                <th className="eyebrow hidden sm:table-cell px-2 py-2.5 text-center font-normal">L</th>
                <th className="eyebrow hidden sm:table-cell px-2 py-2.5 text-center font-normal">GF</th>
                <th className="eyebrow hidden sm:table-cell px-2 py-2.5 text-center font-normal">GA</th>
```

and the matching body cells from:

```tsx
                  <td className={STAT}>{r.wins}</td>
                  <td className={STAT}>{r.draws}</td>
                  <td className={STAT}>{r.losses}</td>
                  <td className={STAT}>{r.goalsFor}</td>
                  <td className={STAT}>{r.goalsAgainst}</td>
```

to:

```tsx
                  <td className={STAT_SM}>{r.wins}</td>
                  <td className={STAT_SM}>{r.draws}</td>
                  <td className={STAT_SM}>{r.losses}</td>
                  <td className={STAT_SM}>{r.goalsFor}</td>
                  <td className={STAT_SM}>{r.goalsAgainst}</td>
```

(`played` and `goalDiff` keep plain `STAT`.)

- [ ] **Step 4: Fix SquadTable wrapping**

In `src/components/SquadTable.tsx` change the row cells (lines 37–40 area) from:

```tsx
                    <td className="num w-12 px-3 py-2.5 text-right text-[11px] text-dim">{p.jersey ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium">{p.name}</td>
                    <td className="px-3 py-2.5 text-[13px] tabular-nums text-dim">{p.age ? `${p.age} yrs` : ''}</td>
                    <td className="px-3 py-2.5">
```

to:

```tsx
                    <td className="num w-10 px-2 py-2.5 text-right text-[11px] text-dim sm:w-12 sm:px-3">{p.jersey ?? '—'}</td>
                    <td className="px-2 py-2.5 font-medium sm:px-3">{p.name}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[13px] tabular-nums text-dim sm:px-3">{p.age ? `${p.age} yrs` : ''}</td>
                    <td className="px-2 py-2.5 sm:px-3">
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- src/components/StandingsTable.test.tsx src/components/SquadTable.test.tsx`
Expected: PASS. Then `npm test` — all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/StandingsTable.tsx src/components/StandingsTable.test.tsx src/components/SquadTable.tsx src/components/SquadTable.test.tsx
git commit -m "feat: responsive standings columns and no-wrap squad ages"
```

---

### Task 11: Final verification — suite, build, Playwright mobile re-audit

**Files:**
- Create: `scripts/mobile-audit.mjs`
- Modify: `.gitignore` (add `audit-out/`)

**Interfaces:**
- Consumes: every route; `nav[aria-label="Primary"]` (Task 5); sessionStorage key `lv-splash` (Task 7); `/manifest.webmanifest` (Task 3).
- Produces: pass/fail audit + screenshots in `audit-out/` (gitignored).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every existing file plus the new ones (manifest, LeagueSheet, BottomNav, SplashIntro, FixtureCard, StandingsTable, SquadTable additions), zero failures.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exit 0; the route list includes `/manifest.webmanifest` and `/icon.png`; no type errors.

- [ ] **Step 3: Write the audit script**

Create `scripts/mobile-audit.mjs`:

```js
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
```

- [ ] **Step 4: Gitignore the screenshot output**

Append to `.gitignore`:

```
# playwright mobile-audit screenshots
audit-out/
```

- [ ] **Step 5: Run the audit against a dev server**

```bash
cd /home/igodl/code/soccer && npm run dev -- --port 3123 &
sleep 8
LD_LIBRARY_PATH=/tmp/claude-1000/-home-igodl-code-soccer/9213bd29-14d5-46a9-92b8-38fb0f6a3281/scratchpad/libs/usr/lib/x86_64-linux-gnu node scripts/mobile-audit.mjs
kill %1
```

Expected: one `audited <route> (overflow 0px, 0 clipped rows)` line per route (8 fixed + team + game when in season), 4 tabs all ≥44px, PWA smoke clean, final line `Mobile audit passed. Screenshots in audit-out/`, exit 0.

If anything fails: fix the offending component (the failure names the route and row), re-run `npm test`, and re-run the audit before proceeding.

- [ ] **Step 6: Eyeball the screenshots**

Open `audit-out/home.png` and `audit-out/premier-league.png` with the Read tool: bottom nav visible with four labelled tabs, slim single-row header with the logo mark, stacked fixture rows with full team names.

- [ ] **Step 7: Commit**

```bash
git add scripts/mobile-audit.mjs .gitignore
git commit -m "chore: playwright mobile re-audit script"
```

---

## Self-Review Checklist (already applied)

- **Spec coverage:** manifest (T3), icons/splash generation (T2), layout metadata (T3), cinematic splash (T7), logo throughout (T2 favicon, T6 header/footer; home hero intentionally left type-only — spec marks it optional and desktop stays unchanged), BottomNav (T5), LeagueSheet (T4), slim header (T6), tray/day-panel stacking (T6), FixtureCard bug + mobile layout + game link (T1, T8), touch ergonomics (T9, T8 pick button), tables (T10), vitest + Playwright re-audit + PWA smoke (per-task tests, T11).
- **Type consistency:** `LeagueSheet({ open, hint?, onClose })` is identical in T4 (definition), T5 (consumer), and tests. `useMyTeam()` returns `{ league, slug, name } | null` matching the persisted `lv-myteam` shape used in `CalendarView`. Bottom-nav height `3.5rem` matches every `calc()` offset in T6. sessionStorage key `lv-splash` matches T7 and T11.
