# Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/calendar` route that shows every game across all five leagues as a month, week, or day calendar, where each game links to a new per-game page and carries a `+` that adds it to the viewer's real calendar.

**Architecture:** A server component fetches all five cached season fixture lists, slices them to the UTC span of the active view ±1 day, and hands them to a client component that buckets by the viewer's timezone. All view state (`view`, `d`, `leagues`, `myteam`) lives in the query string and is navigated with `<Link>`s. Date arithmetic lives in a pure, fully-tested `src/lib/calendar.ts`.

**Tech Stack:** Next.js 15 App Router (server + client components), React 19, Tailwind v4, Vitest + Testing Library, TypeScript.

**Spec:** `docs/superpowers/specs/2026-07-09-calendar-view-design.md`

## Global Constraints

- Day keys are `YYYY-MM-DD` strings everywhere. They sort and compare lexicographically; never compare `Date` objects for day equality.
- All date arithmetic in `src/lib/calendar.ts` uses UTC (`Date.UTC`, `getUTCFullYear`, etc.). Local time is never consulted.
- Weeks run **Sunday–Saturday**, in both the month grid and the week view.
- Timezone comes from `useTz()` (`src/components/TimezoneProvider.tsx`), which defaults to `'UTC'` before hydration. Fixtures are bucketed into days with the existing `dateKey(iso, tz)` from `src/lib/time.ts`.
- Server components fetch with `getSeasonFixtures(league).catch(() => [])`, matching `src/app/page.tsx`.
- Postponed fixtures never get a `+` button. `fixturesToCalEvents` already drops them.
- Finished fixtures **do** get a `+`.
- **Design system.** The app uses a custom Tailwind v4 theme defined in `src/app/globals.css`, not the stock palette. Colors: `pitch` (page), `board` (surface), `board-hi` (hover), `rule` (borders), `chalk` (foreground / the action color), `dim` (secondary text). There is no house accent — hue is reserved for league identity (`league.accent`). Component classes: `.board` (bordered surface), `.board-row` (row inside a board, with hover), `.display` (wide uppercase Archivo, headings only), `.num` (tabular Martian Mono — times, scores, dates, never prose), `.eyebrow` (9px uppercase dim label), `.btn`, `.btn-primary`, `.btn-muted`, `.score-live`, `.dot-live`. Never write `slate-*`, `emerald-*`, `amber-*`, or any stock Tailwind color. Study `src/components/FixtureCard.tsx` and `src/components/FixtureList.tsx` before writing markup.
- Tests: `npm test` runs `vitest run --passWithNoTests`. Test files sit next to their subject (`foo.ts` → `foo.test.ts`).
- Tests that render a component using `next/image` must mock it, exactly as `src/components/FixtureCard.test.tsx` does.
- Commit after every task.

---

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `src/lib/calendar.ts` | Pure date math: anchor parsing/shifting, grid keys, view spans, season bounds, day bucketing |
| `src/lib/calendar.test.ts` | Tests for the above |
| `src/app/api/cal/game/[league]/[id]/route.ts` | Single-event `.ics` |
| `src/app/api/cal/game/[league]/[id]/route.test.ts` | Tests for the above |
| `src/components/AddToCalendarMenu.tsx` | The `+` popover (Apple/Outlook + Google) |
| `src/components/AddToCalendarMenu.test.tsx` | Tests for the above |
| `src/components/GameRow.tsx` | One game as a row: dot, time, crests, names, `+` |
| `src/components/DayColumn.tsx` | Chronological stack of `GameRow`; used by week, day, and the day panel |
| `src/components/MonthGrid.tsx` | 7×6 grid, chips, `+N more`, mobile dot mode |
| `src/components/MonthGrid.test.tsx` | Tests for the above |
| `src/components/CalendarView.tsx` | Client shell: view switcher, filter chips, day-panel state |
| `src/components/CalendarView.test.tsx` | Tests for the above |
| `src/app/calendar/page.tsx` | Server component: parse params, fetch, slice, render |
| `src/app/[league]/game/[id]/page.tsx` | Game page |

**Modify:**

| File | Change |
|---|---|
| `src/lib/ics.ts` | Add `googleCalendarUrl(event: CalEvent): string` |
| `src/lib/ics.test.ts` | Tests for `googleCalendarUrl` |
| `src/components/LeagueNav.tsx` | Add the `Calendar` pill after a divider |
| `README.md` | Document the calendar view |

---

### Task 1: Pure calendar date math

**Files:**
- Create: `src/lib/calendar.ts`
- Test: `src/lib/calendar.test.ts`

**Interfaces:**
- Consumes: `LEAGUES` and `seasonRange` from `src/lib/leagues.ts`; `dateKey` from `src/lib/time.ts`; `Fixture` from `src/lib/types.ts`.
- Produces:
  - `type CalendarView = 'month' | 'week' | 'day'`
  - `parseView(v: string | undefined): CalendarView`
  - `parseAnchor(d: string | undefined, now?: Date): string`
  - `addDays(key: string, n: number): string`
  - `shiftAnchor(key: string, view: CalendarView, delta: number): string`
  - `monthGridKeys(key: string): string[]` (42 keys)
  - `weekKeys(key: string): string[]` (7 keys)
  - `viewSpan(key: string, view: CalendarView): { from: string; to: string }`
  - `seasonDayBounds(now?: Date): { from: string; to: string }`
  - `canShift(key: string, view: CalendarView, delta: number, bounds: { from: string; to: string }): boolean`
  - `bucketByDay(fixtures: Fixture[], tz: string): Map<string, Fixture[]>`
  - `monthOf(key: string): string` (`'2026-07'`)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/calendar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  addDays,
  bucketByDay,
  canShift,
  monthGridKeys,
  monthOf,
  parseAnchor,
  parseView,
  seasonDayBounds,
  shiftAnchor,
  viewSpan,
  weekKeys,
} from './calendar'
import type { Fixture } from './types'

describe('parseView', () => {
  it('accepts the three views', () => {
    expect(parseView('month')).toBe('month')
    expect(parseView('week')).toBe('week')
    expect(parseView('day')).toBe('day')
  })

  it('falls back to month for anything else', () => {
    expect(parseView(undefined)).toBe('month')
    expect(parseView('year')).toBe('month')
  })
})

describe('parseAnchor', () => {
  const now = new Date('2026-07-09T23:30:00Z')

  it('accepts a valid key', () => {
    expect(parseAnchor('2026-08-22', now)).toBe('2026-08-22')
  })

  it('falls back to today (UTC) for missing or malformed input', () => {
    expect(parseAnchor(undefined, now)).toBe('2026-07-09')
    expect(parseAnchor('nonsense', now)).toBe('2026-07-09')
    expect(parseAnchor('2026-13-01', now)).toBe('2026-07-09')
    expect(parseAnchor('2026-02-30', now)).toBe('2026-07-09')
  })
})

describe('addDays', () => {
  it('rolls over months and years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('shiftAnchor', () => {
  it('shifts by one day', () => {
    expect(shiftAnchor('2026-07-09', 'day', 1)).toBe('2026-07-10')
    expect(shiftAnchor('2026-07-09', 'day', -1)).toBe('2026-07-08')
  })

  it('shifts by seven days for week', () => {
    expect(shiftAnchor('2026-07-09', 'week', 1)).toBe('2026-07-16')
    expect(shiftAnchor('2026-07-09', 'week', -1)).toBe('2026-07-02')
  })

  it('shifts by one month, clamping the day', () => {
    expect(shiftAnchor('2026-07-09', 'month', 1)).toBe('2026-08-09')
    expect(shiftAnchor('2026-01-31', 'month', 1)).toBe('2026-02-28')
    expect(shiftAnchor('2026-03-31', 'month', -1)).toBe('2026-02-28')
    expect(shiftAnchor('2026-12-15', 'month', 1)).toBe('2027-01-15')
  })
})

describe('weekKeys', () => {
  it('returns Sunday through Saturday containing the anchor', () => {
    // 2026-07-09 is a Thursday.
    expect(weekKeys('2026-07-09')).toEqual([
      '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08',
      '2026-07-09', '2026-07-10', '2026-07-11',
    ])
  })

  it('returns the same week when the anchor is the Sunday', () => {
    expect(weekKeys('2026-07-05')[0]).toBe('2026-07-05')
  })
})

describe('monthGridKeys', () => {
  it('returns 42 consecutive days starting on a Sunday', () => {
    const keys = monthGridKeys('2026-07-09')
    expect(keys).toHaveLength(42)
    expect(keys[0]).toBe('2026-06-28') // Sunday before July 1 (a Wednesday)
    expect(keys[41]).toBe('2026-08-08')
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).toBe(addDays(keys[i - 1], 1))
    }
  })

  it('includes every day of the anchor month', () => {
    const keys = monthGridKeys('2026-02-14')
    expect(keys).toContain('2026-02-01')
    expect(keys).toContain('2026-02-28')
  })

  it('starts on the 1st when the 1st is a Sunday', () => {
    // 2026-11-01 is a Sunday.
    expect(monthGridKeys('2026-11-20')[0]).toBe('2026-11-01')
  })
})

describe('viewSpan', () => {
  it('pads the month grid by a day on each side', () => {
    expect(viewSpan('2026-07-09', 'month')).toEqual({ from: '2026-06-27', to: '2026-08-09' })
  })

  it('pads the week by a day on each side', () => {
    expect(viewSpan('2026-07-09', 'week')).toEqual({ from: '2026-07-04', to: '2026-07-12' })
  })

  it('pads the day by a day on each side', () => {
    expect(viewSpan('2026-07-09', 'day')).toEqual({ from: '2026-07-08', to: '2026-07-10' })
  })
})

describe('seasonDayBounds', () => {
  it('spans the union of every league season', () => {
    // In July 2026: cross-year leagues run 2026-08-01..2027-06-30,
    // calendar-year leagues run 2026-01-01..2026-12-31.
    expect(seasonDayBounds(new Date('2026-07-09T00:00:00Z'))).toEqual({
      from: '2026-01-01',
      to: '2027-06-30',
    })
  })
})

describe('canShift', () => {
  const bounds = { from: '2026-01-01', to: '2027-06-30' }

  it('allows a shift whose span overlaps the bounds', () => {
    expect(canShift('2026-07-09', 'month', 1, bounds)).toBe(true)
    expect(canShift('2027-06-15', 'month', -1, bounds)).toBe(true)
  })

  it('rejects a shift entirely outside the bounds', () => {
    expect(canShift('2027-06-15', 'month', 1, bounds)).toBe(false)
    expect(canShift('2026-01-15', 'month', -1, bounds)).toBe(false)
  })
})

describe('monthOf', () => {
  it('extracts the year-month', () => {
    expect(monthOf('2026-07-09')).toBe('2026-07')
  })
})

const fixture = (id: string, kickoff: string): Fixture => ({
  id,
  league: 'premier-league',
  kickoff,
  status: 'scheduled',
  statusDetail: '',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
})

describe('bucketByDay', () => {
  it('groups fixtures by the viewer-timezone day', () => {
    const map = bucketByDay([fixture('1', '2026-08-22T14:00:00.000Z')], 'UTC')
    expect([...map.keys()]).toEqual(['2026-08-22'])
  })

  it('moves a late kickoff to the next day in a forward timezone', () => {
    // 23:00 UTC is 09:00 the next day in Sydney (UTC+10).
    const map = bucketByDay([fixture('1', '2026-08-22T23:00:00.000Z')], 'Australia/Sydney')
    expect([...map.keys()]).toEqual(['2026-08-23'])
  })

  it('moves an early kickoff to the previous day in a backward timezone', () => {
    // 01:00 UTC is 18:00 the previous day in Los Angeles (UTC-7).
    const map = bucketByDay([fixture('1', '2026-08-22T01:00:00.000Z')], 'America/Los_Angeles')
    expect([...map.keys()]).toEqual(['2026-08-21'])
  })

  it('keeps fixtures within a day sorted by kickoff', () => {
    const map = bucketByDay(
      [fixture('late', '2026-08-22T16:00:00.000Z'), fixture('early', '2026-08-22T12:00:00.000Z')],
      'UTC',
    )
    expect(map.get('2026-08-22')!.map((f) => f.id)).toEqual(['early', 'late'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/calendar.test.ts`
Expected: FAIL — `Failed to resolve import "./calendar"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/calendar.ts`:

```ts
import { LEAGUES, seasonRange } from './leagues'
import { dateKey } from './time'
import type { Fixture } from './types'

export type CalendarView = 'month' | 'week' | 'day'

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function toUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** True only for a well-formed key naming a real calendar day. */
function isValidKey(key: string): boolean {
  return KEY_RE.test(key) && toKey(toUtc(key)) === key
}

export function parseView(v: string | undefined): CalendarView {
  return v === 'week' || v === 'day' ? v : 'month'
}

export function parseAnchor(d: string | undefined, now: Date = new Date()): string {
  return d !== undefined && isValidKey(d) ? d : toKey(now)
}

export function addDays(key: string, n: number): string {
  const d = toUtc(key)
  d.setUTCDate(d.getUTCDate() + n)
  return toKey(d)
}

export function monthOf(key: string): string {
  return key.slice(0, 7)
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
}

function addMonths(key: string, n: number): string {
  const d = toUtc(key)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + n
  const targetYear = y + Math.floor(m / 12)
  const targetMonth = ((m % 12) + 12) % 12
  const day = Math.min(d.getUTCDate(), daysInMonth(targetYear, targetMonth))
  return toKey(new Date(Date.UTC(targetYear, targetMonth, day)))
}

export function shiftAnchor(key: string, view: CalendarView, delta: number): string {
  if (view === 'month') return addMonths(key, delta)
  return addDays(key, delta * (view === 'week' ? 7 : 1))
}

/** The Sunday of the anchor's week, through the following Saturday. */
export function weekKeys(key: string): string[] {
  const start = addDays(key, -toUtc(key).getUTCDay())
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 42 consecutive days: six Sunday-start weeks covering the anchor's month. */
export function monthGridKeys(key: string): string[] {
  const first = `${monthOf(key)}-01`
  const start = addDays(first, -toUtc(first).getUTCDay())
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/**
 * The UTC day range a view needs, padded a day on each side. The padding
 * covers UTC-12..UTC+14: a fixture at a boundary shifts at most one day.
 */
export function viewSpan(key: string, view: CalendarView): { from: string; to: string } {
  if (view === 'day') return { from: addDays(key, -1), to: addDays(key, 1) }
  const keys = view === 'week' ? weekKeys(key) : monthGridKeys(key)
  return { from: addDays(keys[0], -1), to: addDays(keys[keys.length - 1], 1) }
}

function hyphenate(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
}

/** The union of every league's season: earliest start to latest end. */
export function seasonDayBounds(now: Date = new Date()): { from: string; to: string } {
  const ranges = LEAGUES.map((l) => seasonRange(l, now))
  return {
    from: ranges.map((r) => hyphenate(r.start)).sort()[0],
    to: ranges.map((r) => hyphenate(r.end)).sort().reverse()[0],
  }
}

/** Can we navigate there? Only if the destination view overlaps the season. */
export function canShift(
  key: string,
  view: CalendarView,
  delta: number,
  bounds: { from: string; to: string },
): boolean {
  const span = viewSpan(shiftAnchor(key, view, delta), view)
  return span.to >= bounds.from && span.from <= bounds.to
}

/** Group fixtures by their calendar day in `tz`, each day sorted by kickoff. */
export function bucketByDay(fixtures: Fixture[], tz: string): Map<string, Fixture[]> {
  const map = new Map<string, Fixture[]>()
  for (const f of fixtures) {
    const key = dateKey(f.kickoff, tz)
    const bucket = map.get(key)
    if (bucket) bucket.push(f)
    else map.set(key, [f])
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  }
  return map
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/calendar.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar.ts src/lib/calendar.test.ts
git commit -m "feat: pure date math for the calendar view"
```

---

### Task 2: `googleCalendarUrl`

**Files:**
- Modify: `src/lib/ics.ts` (add one exported function; `icsDate` is already defined there)
- Test: `src/lib/ics.test.ts` (append a `describe` block)

**Interfaces:**
- Consumes: `CalEvent` from `src/lib/ics.ts`.
- Produces: `googleCalendarUrl(e: CalEvent): string`.

Google's template link wants `dates=<start>/<end>` in the same compact UTC form `.ics` uses, so the existing private `icsDate` helper does the formatting.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/ics.test.ts`. Change the top-level import line to pull in the new function:

```ts
import { buildIcs, fixturesToCalEvents, googleCalendarUrl, type CalEvent } from './ics'
```

Then append:

```ts
describe('googleCalendarUrl', () => {
  const url = new URL(googleCalendarUrl(ev))

  it('points at the Google template renderer', () => {
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
  })

  it('carries the title, location and description', () => {
    expect(url.searchParams.get('text')).toBe('⚽ Everton vs Crystal Palace')
    expect(url.searchParams.get('location')).toBe('Goodison Park, Liverpool')
    expect(url.searchParams.get('details')).toBe('Premier League')
  })

  it('spans start to start-plus-duration in compact UTC', () => {
    expect(url.searchParams.get('dates')).toBe('20260822T140000Z/20260822T160000Z')
  })

  it('honours a custom duration', () => {
    const custom = new URL(googleCalendarUrl({ ...ev, durationMinutes: 90 }))
    expect(custom.searchParams.get('dates')).toBe('20260822T140000Z/20260822T153000Z')
  })

  it('omits location and details when absent', () => {
    const bare = new URL(googleCalendarUrl({ uid: 'u', start: ev.start, title: 'T' }))
    expect(bare.searchParams.has('location')).toBe(false)
    expect(bare.searchParams.has('details')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/ics.test.ts`
Expected: FAIL — `googleCalendarUrl is not a function` (or an import error).

- [ ] **Step 3: Write the implementation**

Append to `src/lib/ics.ts`, after `buildIcs`:

```ts
/** A Google Calendar "add event" deep link for a single event. */
export function googleCalendarUrl(e: CalEvent): string {
  const end = new Date(e.start.getTime() + (e.durationMinutes ?? 120) * 60_000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${icsDate(e.start)}/${icsDate(end)}`,
  })
  if (e.location) params.set('location', e.location)
  if (e.description) params.set('details', e.description)
  return `https://calendar.google.com/calendar/render?${params}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/ics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ics.ts src/lib/ics.test.ts
git commit -m "feat: googleCalendarUrl deep link for a single event"
```

---

### Task 3: Single-game `.ics` route

**Files:**
- Create: `src/app/api/cal/game/[league]/[id]/route.ts`
- Test: `src/app/api/cal/game/[league]/[id]/route.test.ts`

**Interfaces:**
- Consumes: `getLeague`, `getSeasonFixtures`, `buildIcs`, `fixturesToCalEvents`.
- Produces: `GET(req, { params })` at `/api/cal/game/[league]/[id].ics`.

The `[id]` segment arrives with the `.ics` suffix attached, exactly as `[league]` does in `src/app/api/cal/league/[league]/route.ts`. Strip it. Unlike the league route this one sets `Content-Disposition: attachment` so the OS hands the file to the calendar app.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/cal/game/[league]/[id]/route.test.ts`:

```tsx
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/data/fixtures', () => ({
  getSeasonFixtures: vi.fn(async () => [
    {
      id: '1', league: 'premier-league', kickoff: '2026-08-22T14:00:00.000Z',
      status: 'scheduled', statusDetail: '', venue: 'Anfield',
      home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
    },
    {
      id: '2', league: 'premier-league', kickoff: '2026-08-23T14:00:00.000Z',
      status: 'final', statusDetail: 'FT',
      home: { id: 'h', name: 'Arsenal', score: 2 }, away: { id: 'a', name: 'Chelsea', score: 1 },
    },
  ]),
}))

import { GET } from './route'

const call = (league: string, id: string) =>
  GET(new Request(`http://localhost/api/cal/game/${league}/${id}`), {
    params: Promise.resolve({ league, id }),
  })

describe('single-game calendar route', () => {
  it('serves an ics for one game, stripping the .ics suffix', async () => {
    const res = await call('premier-league', '1.ics')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    expect(res.headers.get('content-disposition')).toContain('attachment')
    const body = await res.text()
    expect(body).toContain('SUMMARY:⚽ Liverpool vs Everton')
    expect(body).toContain('UID:premier-league-1@leagueville')
    expect(body).not.toContain('Arsenal')
  })

  it('includes the final score for a finished game', async () => {
    const body = await (await call('premier-league', '2')).text()
    expect(body).toContain('FT 2–1')
  })

  it('404s an unknown league', async () => {
    expect((await call('nope', '1')).status).toBe(404)
  })

  it('404s an unknown game id', async () => {
    expect((await call('premier-league', '999')).status).toBe(404)
  })

  it('503s when fixture data is unavailable', async () => {
    const { getSeasonFixtures } = await import('@/lib/data/fixtures')
    vi.mocked(getSeasonFixtures).mockRejectedValueOnce(new Error('upstream down'))
    expect((await call('premier-league', '1')).status).toBe(503)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "src/app/api/cal/game"`
Expected: FAIL — `Failed to resolve import "./route"`.

- [ ] **Step 3: Write the implementation**

Create `src/app/api/cal/game/[league]/[id]/route.ts`:

```ts
import { getLeague } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { buildIcs, fixturesToCalEvents } from '@/lib/ics'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; id: string }> },
) {
  const { league: rawSlug, id: rawId } = await params
  const league = getLeague(rawSlug)
  if (!league) return new Response('Unknown league', { status: 404 })
  const id = rawId.replace(/\.ics$/, '')

  let fixture
  try {
    fixture = (await getSeasonFixtures(league)).find((f) => f.id === id)
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
  if (!fixture) return new Response('Unknown game', { status: 404 })

  const events = fixturesToCalEvents([fixture], league.name)
  if (events.length === 0) return new Response('Game has no scheduled kickoff', { status: 404 })

  const ics = buildIcs(`${fixture.home.name} vs ${fixture.away.name} — Leagueville`, events)
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
      'Content-Disposition': `attachment; filename="${league.slug}-${id}.ics"`,
    },
  })
}
```

Note the `events.length === 0` branch: `fixturesToCalEvents` drops postponed fixtures, so a postponed id yields no event.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "src/app/api/cal/game"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/cal/game"
git commit -m "feat: single-game ics route"
```

---

### Task 4: `AddToCalendarMenu`

**Files:**
- Create: `src/components/AddToCalendarMenu.tsx`
- Test: `src/components/AddToCalendarMenu.test.tsx`

**Interfaces:**
- Consumes: `googleCalendarUrl` and `fixturesToCalEvents` from `src/lib/ics.ts`; `getLeague` from `src/lib/leagues.ts`; `Fixture` from `src/lib/types.ts`.
- Produces: `<AddToCalendarMenu fixture={f} />`. Renders nothing when `fixture.status === 'postponed'`.

The Google link is built on the client from the same `CalEvent` the server would build, so the two paths can never disagree about the title or the times.

- [ ] **Step 1: Write the failing tests**

Create `src/components/AddToCalendarMenu.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Fixture } from '@/lib/types'
import { AddToCalendarMenu } from './AddToCalendarMenu'

const base: Fixture = {
  id: '77',
  league: 'premier-league',
  kickoff: '2026-08-22T14:00:00.000Z',
  status: 'scheduled',
  statusDetail: '',
  venue: 'Anfield',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
}

const open = () => fireEvent.click(screen.getByRole('button', { name: /add .* to calendar/i }))

describe('AddToCalendarMenu', () => {
  it('is closed until the + is clicked', () => {
    render(<AddToCalendarMenu fixture={base} />)
    expect(screen.queryByRole('menu')).toBeNull()
    open()
    expect(screen.getByRole('menu')).toBeDefined()
  })

  it('offers an ics download and a Google link', () => {
    render(<AddToCalendarMenu fixture={base} />)
    open()
    const ics = screen.getByRole('menuitem', { name: /apple/i })
    expect(ics.getAttribute('href')).toBe('/api/cal/game/premier-league/77.ics')

    const google = screen.getByRole('menuitem', { name: /google/i })
    const url = new URL(google.getAttribute('href')!)
    expect(url.searchParams.get('text')).toBe('⚽ Liverpool vs Everton')
    expect(url.searchParams.get('dates')).toBe('20260822T140000Z/20260822T160000Z')
    expect(url.searchParams.get('location')).toBe('Anfield')
  })

  it('closes on Escape', () => {
    render(<AddToCalendarMenu fixture={base} />)
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('closes on an outside click', () => {
    render(<AddToCalendarMenu fixture={base} />)
    open()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('renders nothing for a postponed game', () => {
    const { container } = render(<AddToCalendarMenu fixture={{ ...base, status: 'postponed' }} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders for a finished game', () => {
    render(<AddToCalendarMenu fixture={{ ...base, status: 'final' }} />)
    expect(screen.getByRole('button', { name: /add .* to calendar/i })).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/AddToCalendarMenu.test.tsx`
Expected: FAIL — `Failed to resolve import "./AddToCalendarMenu"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/AddToCalendarMenu.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { fixturesToCalEvents, googleCalendarUrl } from '@/lib/ics'
import { getLeague } from '@/lib/leagues'
import type { Fixture } from '@/lib/types'

export function AddToCalendarMenu({ fixture }: { fixture: Fixture }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const league = getLeague(fixture.league)
  const [event] = fixturesToCalEvents([fixture], league?.name ?? '')
  if (!event) return null // postponed games have no kickoff to add

  const label = `${fixture.home.name} vs ${fixture.away.name}`

  return (
    <div ref={root} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Add ${label} to calendar`}
        className={`num rounded-[2px] border px-2 py-1 text-[11px] font-bold leading-none transition-colors ${
          open ? 'border-chalk bg-chalk text-pitch' : 'border-rule text-dim hover:border-chalk/45 hover:text-chalk'
        }`}
      >
        +
      </button>
      {open && (
        <div
          role="menu"
          className="board absolute right-0 z-50 mt-1 w-52 bg-board shadow-xl"
        >
          <a
            role="menuitem"
            href={`/api/cal/game/${fixture.league}/${fixture.id}.ics`}
            download
            onClick={() => setOpen(false)}
            className="board-row block px-3 py-2.5 text-[11px] font-medium"
          >
            Apple / Outlook (.ics)
          </a>
          <a
            role="menuitem"
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="board-row block px-3 py-2.5 text-[11px] font-medium"
          >
            Google Calendar
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/AddToCalendarMenu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddToCalendarMenu.tsx src/components/AddToCalendarMenu.test.tsx
git commit -m "feat: add-to-calendar popover for a single game"
```

---

### Task 5: `GameRow` and `DayColumn`

**Files:**
- Create: `src/components/GameRow.tsx`
- Create: `src/components/DayColumn.tsx`
- Test: `src/components/DayColumn.test.tsx`

**Interfaces:**
- Consumes: `AddToCalendarMenu`, `TeamLogo`, `useTz`, `formatKickoff`, `getLeague`, `Fixture`.
- Produces:
  - `<GameRow fixture={f} />` — a linked row ending in the `+`.
  - `<DayColumn dayKey="2026-08-22" fixtures={[...]} heading?: string />` — a chronological stack, `—` when empty.

`GameRow` links to `/[league]/game/[id]`, built in Task 7. The link is an `<a>` wrapping everything except the `+`, so the `+` can be clicked without navigating.

- [ ] **Step 1: Write the failing test**

Create `src/components/DayColumn.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Fixture } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { DayColumn } from './DayColumn'

const fixture = (over: Partial<Fixture> = {}): Fixture => ({
  id: '1',
  league: 'premier-league',
  kickoff: '2026-08-22T14:00:00.000Z',
  status: 'scheduled',
  statusDetail: '',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
  ...over,
})

describe('DayColumn', () => {
  it('renders a dash when the day is empty', () => {
    render(<DayColumn dayKey="2026-08-22" fixtures={[]} />)
    expect(screen.getByText('—')).toBeDefined()
  })

  it('links each game to its game page', () => {
    render(<DayColumn dayKey="2026-08-22" fixtures={[fixture()]} />)
    const link = screen.getByRole('link', { name: /Liverpool/ })
    expect(link.getAttribute('href')).toBe('/premier-league/game/1')
  })

  it('shows the kickoff time for a scheduled game, in the default UTC timezone', () => {
    render(<DayColumn dayKey="2026-08-22" fixtures={[fixture()]} />)
    expect(screen.getByText('2:00 PM')).toBeDefined()
  })

  it('shows the score for a finished game', () => {
    render(
      <DayColumn
        dayKey="2026-08-22"
        fixtures={[fixture({ status: 'final', home: { id: 'h', name: 'Liverpool', score: 2 }, away: { id: 'a', name: 'Everton', score: 1 } })]}
      />,
    )
    expect(screen.getByText('2–1')).toBeDefined()
  })

  it('offers a + for scheduled and finished games but not postponed ones', () => {
    render(
      <DayColumn
        dayKey="2026-08-22"
        fixtures={[fixture(), fixture({ id: '2', status: 'final' }), fixture({ id: '3', status: 'postponed' })]}
      />,
    )
    expect(screen.getAllByRole('button', { name: /add .* to calendar/i })).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/DayColumn.test.tsx`
Expected: FAIL — `Failed to resolve import "./DayColumn"`.

- [ ] **Step 3: Write the implementations**

Create `src/components/GameRow.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { getLeague } from '@/lib/leagues'
import { formatKickoff } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { AddToCalendarMenu } from './AddToCalendarMenu'
import { TeamLogo } from './TeamLogo'
import { useTz } from './TimezoneProvider'

export function GameRow({ fixture }: { fixture: Fixture }) {
  const { tz } = useTz()
  const league = getLeague(fixture.league)
  const showScore = fixture.status === 'live' || fixture.status === 'final'

  const live = fixture.status === 'live'

  return (
    <div className="board-row flex items-center gap-2 px-2.5 py-2.5">
      <Link href={`/${fixture.league}/game/${fixture.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
        {league && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: league.accent }}
          />
        )}
        <span className="num w-14 shrink-0 text-[11px] leading-none text-dim">
          {fixture.status === 'postponed' ? (
            <span className="line-through decoration-1">PPD</span>
          ) : showScore ? (
            <span className="font-bold text-chalk">
              <span className={live ? 'score-live' : undefined}>
                {fixture.home.score ?? '-'}–{fixture.away.score ?? '-'}
              </span>
            </span>
          ) : (
            formatKickoff(fixture.kickoff, tz)
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <TeamLogo src={fixture.home.logo} alt={fixture.home.name} size={16} />
            <span className="truncate text-xs font-medium">{fixture.home.name}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <TeamLogo src={fixture.away.logo} alt={fixture.away.name} size={16} />
            <span className="truncate text-xs font-medium">{fixture.away.name}</span>
          </span>
        </span>
      </Link>
      <AddToCalendarMenu fixture={fixture} />
    </div>
  )
}
```

Create `src/components/DayColumn.tsx`:

```tsx
'use client'

import type { Fixture } from '@/lib/types'
import { GameRow } from './GameRow'

export function DayColumn({
  dayKey,
  fixtures,
  heading,
}: {
  dayKey: string
  fixtures: Fixture[]
  heading?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-day={dayKey}>
      {heading && <h3 className="eyebrow">{heading}</h3>}
      {fixtures.length === 0 ? (
        <p className="py-6 text-center text-sm text-rule">—</p>
      ) : (
        <div className="board">
          {fixtures.map((f) => (
            <GameRow key={`${f.league}:${f.id}`} fixture={f} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/DayColumn.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameRow.tsx src/components/DayColumn.tsx src/components/DayColumn.test.tsx
git commit -m "feat: game row and day column for the calendar"
```

---

### Task 6: `MonthGrid`

**Files:**
- Create: `src/components/MonthGrid.tsx`
- Test: `src/components/MonthGrid.test.tsx`

**Interfaces:**
- Consumes: `monthGridKeys`, `monthOf`, `bucketByDay` from `src/lib/calendar.ts`; `formatKickoff` from `src/lib/time.ts`; `useTz`; `getLeague`, `LEAGUES`; `Fixture`.
- Produces: `<MonthGrid anchor="2026-08-22" fixtures={[...]} today="2026-07-09" onSelectDay={(key) => …} />`.

At `sm:` and up each cell shows up to three chips plus `+N more`; below `sm:` it collapses to league dots and a count. Both markups render; Tailwind's `hidden`/`sm:hidden` picks one. That means the test sees both — assert on the chip text, which only exists in the desktop markup, and on `data-testid="day-dots"` for the mobile one.

The whole cell is a button so any click opens the day panel.

- [ ] **Step 1: Write the failing test**

Create `src/components/MonthGrid.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Fixture } from '@/lib/types'
import { MonthGrid } from './MonthGrid'

const fx = (id: string, kickoff: string, home = 'Liverpool', away = 'Everton'): Fixture => ({
  id,
  league: 'premier-league',
  kickoff,
  status: 'scheduled',
  statusDetail: '',
  home: { id: `h${id}`, name: home },
  away: { id: `a${id}`, name: away },
})

const cell = (day: string) => screen.getByRole('button', { name: new RegExp(`^${day}\\b`) })

describe('MonthGrid', () => {
  it('renders 42 day cells', () => {
    render(<MonthGrid anchor="2026-07-09" fixtures={[]} today="2026-07-09" onSelectDay={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(42)
  })

  it('places a fixture in its viewer-timezone day cell', () => {
    render(
      <MonthGrid anchor="2026-07-09" fixtures={[fx('1', '2026-07-15T14:00:00.000Z')]} today="2026-07-09" onSelectDay={() => {}} />,
    )
    expect(within(cell('15')).getByText(/Liverpool/)).toBeDefined()
  })

  it('caps chips at three and counts the remainder', () => {
    const fixtures = ['10', '11', '12', '13', '14'].map((h, i) =>
      fx(String(i), `2026-07-15T${h}:00:00.000Z`, `Home${i}`, `Away${i}`),
    )
    render(<MonthGrid anchor="2026-07-09" fixtures={fixtures} today="2026-07-09" onSelectDay={() => {}} />)
    const target = cell('15')
    expect(within(target).getByText('Home0')).toBeDefined()
    expect(within(target).getByText('Home2')).toBeDefined()
    expect(within(target).queryByText('Home3')).toBeNull()
    expect(within(target).getByText('+2 more')).toBeDefined()
  })

  it('shows a dot row and a game count for the mobile layout', () => {
    render(
      <MonthGrid anchor="2026-07-09" fixtures={[fx('1', '2026-07-15T14:00:00.000Z')]} today="2026-07-09" onSelectDay={() => {}} />,
    )
    const dots = within(cell('15')).getByTestId('day-dots')
    expect(dots.textContent).toContain('1')
  })

  it('reports the clicked day', () => {
    const onSelectDay = vi.fn()
    render(<MonthGrid anchor="2026-07-09" fixtures={[]} today="2026-07-09" onSelectDay={onSelectDay} />)
    fireEvent.click(cell('15'))
    expect(onSelectDay).toHaveBeenCalledWith('2026-07-15')
  })

  it('marks adjacent-month days and today', () => {
    render(<MonthGrid anchor="2026-07-09" fixtures={[]} today="2026-07-09" onSelectDay={() => {}} />)
    expect(cell('9').getAttribute('data-today')).toBe('true')
    expect(cell('9').getAttribute('data-outside')).toBe('false')
    // The grid starts Sunday 2026-06-28, an adjacent-month day. Day numbers
    // 28-30 appear twice in this grid, so index rather than match by name.
    const cells = screen.getAllByRole('button')
    expect(cells[0].getAttribute('data-outside')).toBe('true')
    expect(cells[41].getAttribute('data-outside')).toBe('true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/MonthGrid.test.tsx`
Expected: FAIL — `Failed to resolve import "./MonthGrid"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/MonthGrid.tsx`:

```tsx
'use client'

import { bucketByDay, monthGridKeys, monthOf } from '@/lib/calendar'
import { getLeague } from '@/lib/leagues'
import { formatKickoff } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { useTz } from './TimezoneProvider'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS = 3

function abbrev(name: string): string {
  return name.slice(0, 3).toUpperCase()
}

export function MonthGrid({
  anchor,
  fixtures,
  today,
  onSelectDay,
}: {
  anchor: string
  fixtures: Fixture[]
  today: string
  onSelectDay: (dayKey: string) => void
}) {
  const { tz } = useTz()
  const byDay = bucketByDay(fixtures, tz)
  const keys = monthGridKeys(anchor)
  const month = monthOf(anchor)

  return (
    <div className="board">
      <div className="grid grid-cols-7 border-b border-rule">
        {WEEKDAYS.map((d) => (
          <div key={d} className="eyebrow py-2 text-center">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-rule">
        {keys.map((key) => {
          const games = byDay.get(key) ?? []
          const outside = monthOf(key) !== month
          const isToday = key === today
          const leagues = [...new Set(games.map((g) => g.league))]
          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              data-today={isToday}
              data-outside={outside}
              aria-label={`${Number(key.slice(8))} ${
                games.length === 1 ? '1 game' : `${games.length} games`
              }`}
              className={`min-h-16 bg-board p-1.5 text-left align-top transition-colors hover:bg-board-hi sm:min-h-28 ${
                outside ? 'opacity-35' : ''
              }`}
            >
              <div
                className={`num text-[11px] leading-none ${
                  isToday
                    ? 'inline-block rounded-[2px] bg-chalk px-1.5 py-1 font-bold text-pitch'
                    : 'px-0.5 py-1 font-medium text-dim'
                }`}
              >
                {Number(key.slice(8))}
              </div>

              {/* Mobile: dots + count */}
              {games.length > 0 && (
                <div data-testid="day-dots" className="mt-1.5 flex flex-wrap items-center gap-0.5 sm:hidden">
                  {leagues.map((slug) => (
                    <span
                      key={slug}
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: getLeague(slug)?.accent }}
                    />
                  ))}
                  <span className="num ml-0.5 text-[10px] text-dim">{games.length}</span>
                </div>
              )}

              {/* Desktop: up to three chips */}
              <div className="mt-1 hidden flex-col gap-1 sm:flex">
                {games.slice(0, MAX_CHIPS).map((g) => (
                  <span key={`${g.league}:${g.id}`} className="flex items-center gap-1 truncate text-[10px]">
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getLeague(g.league)?.accent }}
                    />
                    <span className="num truncate font-medium text-chalk">{abbrev(g.home.name)}</span>
                    <span className="text-dim">–</span>
                    <span className="num truncate font-medium text-chalk">{abbrev(g.away.name)}</span>
                    <span className="num ml-auto shrink-0 text-dim">
                      {g.status === 'postponed' ? 'PPD' : formatKickoff(g.kickoff, tz)}
                    </span>
                    <span className="sr-only">{g.home.name}</span>
                    <span className="sr-only">{g.away.name}</span>
                  </span>
                ))}
                {games.length > MAX_CHIPS && (
                  <span className="eyebrow">{`+${games.length - MAX_CHIPS} more`}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

The `sr-only` full team names inside each chip are what the `within(cell).getByText(/Liverpool/)` assertion finds — the visible chip shows `LIV–EVE`. That is also what a screen reader needs, since `LIV` is not a word.

Note the test asserts `getByText('Home0')` exactly, which is why each `sr-only` name is its own element rather than one span holding both names.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/MonthGrid.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MonthGrid.tsx src/components/MonthGrid.test.tsx
git commit -m "feat: month grid with capped chips and mobile dot mode"
```

---

### Task 7: `CalendarView` shell — filters, view switcher, day panel

**Files:**
- Create: `src/components/CalendarView.tsx`
- Test: `src/components/CalendarView.test.tsx`

**Interfaces:**
- Consumes: `MonthGrid`, `DayColumn`, `CalendarView as CalendarViewName` type / `weekKeys` / `bucketByDay` / `shiftAnchor` / `canShift` / `seasonDayBounds`; `LEAGUES`, `slugify`, `useTz`.
- Produces: `<CalendarViewShell view anchor leagues today fixtures />` — but name the component `CalendarView` and export it from `CalendarView.tsx`; import the *type* `CalendarView` from `@/lib/calendar` with an alias to avoid the collision:

```ts
import type { CalendarView as ViewName } from '@/lib/calendar'
```

Props:

```ts
{
  view: ViewName
  anchor: string          // YYYY-MM-DD
  today: string           // YYYY-MM-DD, UTC, from the server
  leagues: string[]       // league slugs selected; all five when unfiltered
  fixtures: Fixture[]     // already sliced to viewSpan(anchor, view) ± 1 day
}
```

The pinned team lives in `localStorage` under `lv-myteam` and is read on mount, exactly as `MyTeamLink` does. `?myteam=1` with nothing pinned shows everything.

Filter chips, view switcher and prev/next are `<Link>`s built by a local `href()` helper so every combination is shareable.

- [ ] **Step 1: Write the failing test**

Create `src/components/CalendarView.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Fixture } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { CalendarView } from './CalendarView'

const ALL = ['premier-league', 'la-liga', 'ligue-1', 'brasileirao', 'mls']

const epl: Fixture = {
  id: '1', league: 'premier-league', kickoff: '2026-07-15T14:00:00.000Z',
  status: 'scheduled', statusDetail: '',
  home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
}
const mls: Fixture = {
  id: '2', league: 'mls', kickoff: '2026-07-15T23:00:00.000Z',
  status: 'scheduled', statusDetail: '',
  home: { id: 'h2', name: 'LA Galaxy' }, away: { id: 'a2', name: 'Inter Miami' },
}

const props = { view: 'day' as const, anchor: '2026-07-15', today: '2026-07-09', fixtures: [epl, mls] }

beforeEach(() => window.localStorage.clear())

describe('CalendarView', () => {
  it('shows every league when all chips are on', () => {
    render(<CalendarView {...props} leagues={ALL} />)
    expect(screen.getByText('Liverpool')).toBeDefined()
    expect(screen.getByText('LA Galaxy')).toBeDefined()
  })

  it('filters to the selected leagues', () => {
    render(<CalendarView {...props} leagues={['mls']} />)
    expect(screen.queryByText('Liverpool')).toBeNull()
    expect(screen.getByText('LA Galaxy')).toBeDefined()
  })

  it('narrows to the pinned team when myteam is on', () => {
    window.localStorage.setItem(
      'lv-myteam',
      JSON.stringify({ league: 'premier-league', slug: 'liverpool', name: 'Liverpool' }),
    )
    render(<CalendarView {...props} leagues={ALL} myteam />)
    expect(screen.getByText('Liverpool')).toBeDefined()
    expect(screen.queryByText('LA Galaxy')).toBeNull()
  })

  it('shows everything when myteam is on but nothing is pinned', () => {
    render(<CalendarView {...props} leagues={ALL} myteam />)
    expect(screen.getByText('Liverpool')).toBeDefined()
    expect(screen.getByText('LA Galaxy')).toBeDefined()
  })

  it('links the view switcher, preserving the anchor', () => {
    render(<CalendarView {...props} leagues={ALL} />)
    expect(screen.getByRole('link', { name: 'Week' }).getAttribute('href')).toContain('view=week')
    expect(screen.getByRole('link', { name: 'Week' }).getAttribute('href')).toContain('d=2026-07-15')
  })

  it('opens a day panel when a month cell is clicked', () => {
    render(<CalendarView {...props} view="month" anchor="2026-07-15" leagues={ALL} />)
    fireEvent.click(screen.getByRole('button', { name: /^15\b/ }))
    const panel = screen.getByRole('dialog')
    expect(panel.textContent).toContain('Liverpool')
  })

  it('closes the day panel on Escape', () => {
    render(<CalendarView {...props} view="month" anchor="2026-07-15" leagues={ALL} />)
    fireEvent.click(screen.getByRole('button', { name: /^15\b/ }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/CalendarView.test.tsx`
Expected: FAIL — `Failed to resolve import "./CalendarView"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/CalendarView.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  bucketByDay,
  canShift,
  seasonDayBounds,
  shiftAnchor,
  weekKeys,
  type CalendarView as ViewName,
} from '@/lib/calendar'
import { LEAGUES } from '@/lib/leagues'
import { slugify } from '@/lib/slugify'
import { dateHeading } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { DayColumn } from './DayColumn'
import { MonthGrid } from './MonthGrid'
import { useTz } from './TimezoneProvider'

const VIEWS: { key: ViewName; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
]

interface PinnedTeam {
  league: string
  slug: string
  name: string
}

function readPinned(): PinnedTeam | null {
  try {
    return JSON.parse(window.localStorage.getItem('lv-myteam') ?? 'null')
  } catch {
    return null
  }
}

function involves(f: Fixture, team: PinnedTeam): boolean {
  return (
    f.league === team.league &&
    (slugify(f.home.name) === team.slug || slugify(f.away.name) === team.slug)
  )
}

export function CalendarView({
  view,
  anchor,
  today,
  leagues,
  myteam = false,
  fixtures,
}: {
  view: ViewName
  anchor: string
  today: string
  leagues: string[]
  myteam?: boolean
  fixtures: Fixture[]
}) {
  const { tz } = useTz()
  const [pinned, setPinned] = useState<PinnedTeam | null>(null)
  const [openDay, setOpenDay] = useState<string | null>(null)

  useEffect(() => setPinned(readPinned()), [])

  useEffect(() => {
    if (!openDay) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDay(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openDay])

  // `myteam` wins over the league chips. With nothing pinned it is ignored.
  const teamFilter = myteam ? pinned : null
  const visible = useMemo(
    () =>
      teamFilter
        ? fixtures.filter((f) => involves(f, teamFilter))
        : fixtures.filter((f) => leagues.includes(f.league)),
    [fixtures, leagues, teamFilter],
  )

  const href = (over: Partial<{ view: ViewName; d: string; leagues: string[]; myteam: boolean }>) => {
    const next = { view, d: anchor, leagues, myteam, ...over }
    const p = new URLSearchParams()
    if (next.view !== 'month') p.set('view', next.view)
    p.set('d', next.d)
    if (next.leagues.length !== LEAGUES.length) p.set('leagues', next.leagues.join(','))
    if (next.myteam) p.set('myteam', '1')
    return `/calendar?${p}`
  }

  const toggleLeague = (slug: string) =>
    leagues.includes(slug)
      ? leagues.filter((s) => s !== slug)
      : LEAGUES.filter((l) => leagues.includes(l.slug) || l.slug === slug).map((l) => l.slug)

  const bounds = seasonDayBounds()
  const byDay = bucketByDay(visible, tz)
  const prev = shiftAnchor(anchor, view, -1)
  const next = shiftAnchor(anchor, view, 1)
  const canPrev = canShift(anchor, view, -1, bounds)
  const canNext = canShift(anchor, view, 1, bounds)

  const heading =
    view === 'month'
      ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
          new Date(`${anchor}T00:00:00Z`),
        )
      : dateHeading(`${anchor}T12:00:00Z`, 'UTC')

  const arrow = (target: string, enabled: boolean, label: string, glyph: string) =>
    enabled ? (
      <Link href={href({ d: target })} aria-label={label} className="btn-muted text-base leading-none">
        {glyph}
      </Link>
    ) : (
      <span aria-label={label} aria-disabled className="btn-muted text-base leading-none opacity-30">
        {glyph}
      </span>
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {arrow(prev, canPrev, 'Previous', '‹')}
        <h1 className="display min-w-52 text-[22px] leading-none">{heading}</h1>
        {arrow(next, canNext, 'Next', '›')}
        <div className="ml-auto flex gap-5 border-b border-rule">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={href({ view: v.key })}
              aria-current={v.key === view ? 'page' : undefined}
              className={`-mb-px border-b-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                v.key === view ? 'border-chalk text-chalk' : 'border-transparent text-dim hover:text-chalk'
              }`}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {LEAGUES.map((l) => {
          const on = leagues.includes(l.slug)
          return (
            <Link
              key={l.slug}
              href={href({ leagues: toggleLeague(l.slug), myteam: false })}
              aria-pressed={on && !teamFilter}
              className={`num rounded-[2px] border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                teamFilter ? 'pointer-events-none opacity-30' : ''
              } ${on ? '' : 'border-rule text-dim hover:text-chalk'}`}
              style={on && !teamFilter ? { borderColor: l.accent, backgroundColor: `${l.accent}26`, color: l.accent } : undefined}
            >
              {l.shortName}
            </Link>
          )
        })}
        {pinned && (
          <Link
            href={href({ myteam: !myteam })}
            aria-pressed={myteam}
            className={`num rounded-[2px] border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
              myteam ? 'border-chalk bg-chalk text-pitch' : 'border-rule text-dim hover:text-chalk'
            }`}
          >
            ★ {pinned.name}
          </Link>
        )}
      </div>

      {view === 'month' && (
        <MonthGrid anchor={anchor} fixtures={visible} today={today} onSelectDay={setOpenDay} />
      )}

      {view === 'week' && (
        <>
          <div className="hidden grid-cols-7 gap-2 sm:grid">
            {weekKeys(anchor).map((key) => (
              <DayColumn
                key={key}
                dayKey={key}
                fixtures={byDay.get(key) ?? []}
                heading={dateHeading(`${key}T12:00:00Z`, 'UTC').replace(/,.*/, '')}
              />
            ))}
          </div>
          <div className="sm:hidden">
            <div className="mb-3 flex gap-1 overflow-x-auto">
              {weekKeys(anchor).map((key) => (
                <Link
                  key={key}
                  href={href({ d: key, view: 'day' })}
                  className={`num shrink-0 rounded-[2px] px-2.5 py-1.5 text-[11px] font-medium ${
                    key === anchor ? 'bg-chalk text-pitch' : 'text-dim'
                  }`}
                >
                  {Number(key.slice(8))}
                </Link>
              ))}
            </div>
            <DayColumn dayKey={anchor} fixtures={byDay.get(anchor) ?? []} />
          </div>
        </>
      )}

      {view === 'day' && <DayColumn dayKey={anchor} fixtures={byDay.get(anchor) ?? []} />}

      {openDay && (
        <div
          role="dialog"
          aria-label={dateHeading(`${openDay}T12:00:00Z`, 'UTC')}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto border-t border-rule bg-pitch/95 p-4 backdrop-blur sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 sm:rounded-[3px] sm:border"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-[13px] leading-none">{dateHeading(`${openDay}T12:00:00Z`, 'UTC')}</h2>
            <button onClick={() => setOpenDay(null)} className="btn-muted">
              Close
            </button>
          </div>
          <DayColumn dayKey={openDay} fixtures={byDay.get(openDay) ?? []} />
        </div>
      )}
    </div>
  )
}
```

Two details worth noting. The day-panel heading formats with `timeZone: 'UTC'` against a noon timestamp, so the key never slips a day during formatting — the *bucketing* already happened in the viewer's zone. And `toggleLeague` rebuilds the list in `LEAGUES` order, so the `?leagues=` param is stable rather than click-ordered.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/CalendarView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CalendarView.tsx src/components/CalendarView.test.tsx
git commit -m "feat: calendar shell with view switcher, filters and day panel"
```

---

### Task 8: `/calendar` page

**Files:**
- Create: `src/app/calendar/page.tsx`

**Interfaces:**
- Consumes: `parseView`, `parseAnchor`, `viewSpan` from `src/lib/calendar.ts`; `getSeasonFixtures`; `LEAGUES`; `CalendarView`.
- Produces: the `/calendar` route.

The slice compares `f.kickoff.slice(0, 10)` — the UTC day of the kickoff — against the span, which is why `viewSpan` pads by a day: the client re-buckets in the viewer's zone and a boundary fixture can move one day either way.

- [ ] **Step 1: Write the page**

Create `src/app/calendar/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { CalendarView } from '@/components/CalendarView'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { parseAnchor, parseView, viewSpan } from '@/lib/calendar'
import { LEAGUES } from '@/lib/leagues'

export const metadata: Metadata = {
  title: 'Calendar — Leagueville',
  description: 'Every Premier League, La Liga, Ligue 1, Brasileirão and MLS game on one calendar.',
}

const ALL_SLUGS = LEAGUES.map((l) => l.slug)

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string; leagues?: string; myteam?: string }>
}) {
  const sp = await searchParams
  const now = new Date()
  const view = parseView(sp.view)
  const anchor = parseAnchor(sp.d, now)
  const today = now.toISOString().slice(0, 10)

  const requested = (sp.leagues ?? '').split(',').filter((s) => ALL_SLUGS.includes(s as never))
  const leagues = requested.length > 0 ? requested : ALL_SLUGS

  const seasons = await Promise.all(LEAGUES.map((l) => getSeasonFixtures(l).catch(() => [])))
  const { from, to } = viewSpan(anchor, view)
  const fixtures = seasons
    .flat()
    .filter((f) => {
      const day = f.kickoff.slice(0, 10)
      return day >= from && day <= to
    })
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  return (
    <CalendarView
      view={view}
      anchor={anchor}
      today={today}
      leagues={leagues}
      myteam={sp.myteam === '1'}
      fixtures={fixtures}
    />
  )
}
```

- [ ] **Step 2: Verify it builds and renders**

Run: `npm run build`
Expected: build succeeds, and the route list includes `/calendar`.

Then run `npm run dev` and open `http://localhost:3000/calendar`. Confirm:
- The month grid renders with the current month's heading.
- Clicking a day with games opens the day panel; Escape closes it.
- `?view=week` shows seven columns; `?view=day` shows one.
- Toggling a league chip changes the URL and the games shown.
- `?d=2026-13-99` falls back to today rather than erroring.

- [ ] **Step 3: Commit**

```bash
git add src/app/calendar/page.tsx
git commit -m "feat: /calendar route"
```

---

### Task 9: Game page

**Files:**
- Create: `src/app/[league]/game/[id]/page.tsx`

**Interfaces:**
- Consumes: `getLeague`, `getSeasonFixtures`, `CalendarButtons`, `TeamLogo`, `formatKickoff`/`dateHeading` (client-side via a small wrapper — see below), `slugify`.
- Produces: the `/[league]/game/[id]` route that `GameRow` links to.

The static `game` segment sits beside the dynamic `[team]` segment. Next resolves static before dynamic, and no team slug is `game`, so `/premier-league/game/401` and `/premier-league/liverpool` coexist.

Kickoff must render in the viewer's timezone, which is client-only. `GameRow` already solves this; here we reuse the existing `FixtureList`, which is a client component that groups by day and renders a `FixtureCard` — that gives us the crests, score, status and kickoff for free, in the right zone.

- [ ] **Step 1: Write the page**

Create `src/app/[league]/game/[id]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarButtons } from '@/components/CalendarButtons'
import { FixtureList } from '@/components/FixtureList'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { getLeague } from '@/lib/leagues'
import { slugify } from '@/lib/slugify'

export default async function GamePage({
  params,
}: {
  params: Promise<{ league: string; id: string }>
}) {
  const { league: leagueSlug, id } = await params
  const league = getLeague(leagueSlug)
  if (!league) notFound()

  const fixture = (await getSeasonFixtures(league).catch(() => [])).find((f) => f.id === id)
  if (!fixture) notFound()

  const teamLink = (name: string) => `/${league.slug}/${slugify(name)}`

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/calendar" className="btn-muted inline-block pl-0">
        ‹ Calendar
      </Link>

      <div className="space-y-4">
        <span
          className="num inline-block rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${league.accent}26`, color: league.accent }}
        >
          {league.name}
        </span>
        <FixtureList fixtures={[fixture]} />
        {fixture.venue && <p className="eyebrow">{fixture.venue}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={teamLink(fixture.home.name)} className="btn">
          {fixture.home.name}
        </Link>
        <Link href={teamLink(fixture.away.name)} className="btn">
          {fixture.away.name}
        </Link>
      </div>

      {fixture.status !== 'postponed' && (
        <CalendarButtons
          path={`/api/cal/game/${league.slug}/${fixture.id}.ics`}
          label="This game"
        />
      )}
      <CalendarButtons path={`/api/cal/league/${league.slug}.ics`} label="Whole league" />
    </div>
  )
}
```

- [ ] **Step 2: Verify it renders**

Run `npm run dev`. From `/calendar`, click any game chip in the day panel and confirm the page shows both teams, the kickoff in your timezone, the venue, both team links, and the calendar buttons. Then check a bad id (`/premier-league/game/000`) 404s.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[league]/game"
git commit -m "feat: per-game page"
```

---

### Task 10: Nav pill, docs, and a full check

**Files:**
- Modify: `src/components/LeagueNav.tsx`
- Modify: `README.md`

- [ ] **Step 1: Add the Calendar pill**

`LeagueNav` renders underline tabs, not pills. Read the current file first. After the `LEAGUES.map(...)` block and still inside the `<nav>`, add a rule and a matching tab whose underline is `chalk` (the calendar belongs to no league, and chalk is the app's action color):

```tsx
      <span aria-hidden className="my-1 w-px shrink-0 self-stretch bg-rule" />
      <Link
        href="/calendar"
        aria-current={pathname === '/calendar' ? 'page' : undefined}
        className={`whitespace-nowrap border-b-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
          pathname === '/calendar' ? 'border-chalk text-chalk' : 'border-transparent text-dim hover:text-chalk'
        }`}
      >
        Calendar
      </Link>
```

- [ ] **Step 2: Document it**

In `README.md`, under **Features**, add a bullet after the live-scores one:

```markdown
- **Calendar view** (`/calendar`) — every league's games in a month, week or
  day layout, in your timezone. Filter by league or by your pinned team;
  click a game for its own page, or hit `+` to drop it straight into Apple
  Calendar, Outlook or Google Calendar
```

- [ ] **Step 3: Run everything**

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass, no lint errors, build succeeds with `/calendar` and `/[league]/game/[id]` in the route list.

- [ ] **Step 4: Commit**

```bash
git add src/components/LeagueNav.tsx README.md
git commit -m "feat: calendar nav pill and docs"
```

---

## Self-Review Notes

Spec coverage checked section by section:

| Spec section | Task |
|---|---|
| URL shape (`view`, `d`, `leagues`, `myteam`), invalid-value fallback | 1 (`parseView`/`parseAnchor`), 8 (page parsing) |
| Data fetch, `.catch(() => [])`, span slice | 8 |
| Season bounds / arrow clamping | 1 (`seasonDayBounds`, `canShift`), 7 (arrows) |
| Timezone bucketing | 1 (`bucketByDay`), 6, 7 |
| Month view: 7×6, dimmed adjacent, today ring, 3 chips + `+N more`, mobile dots | 6 |
| Day panel | 7 |
| Week view: 7 columns, `—` for empty, mobile degrade with date strip | 7 |
| Day view | 7 |
| Filters, my-team wins, unpinned fallback | 7 |
| `+` popover, Escape / outside click / route change | 4 |
| Finished games get `+`; postponed do not | 3, 4, 5 |
| Single-event `.ics` route | 3 |
| Google deep link | 2 |
| Game page | 9 |
| Nav pill | 10 |
| Tests enumerated in the spec | 1, 2, 3, 4, 5, 6, 7 |

Type consistency: `CalendarView` is both a type in `lib/calendar.ts` and a component in `components/CalendarView.tsx`; Task 7 aliases the type to `ViewName` at import. `bucketByDay` returns `Map<string, Fixture[]>` and is consumed as such in Tasks 6 and 7. `googleCalendarUrl` takes a `CalEvent`, which is what `fixturesToCalEvents` returns, and Task 4 destructures `[event]` from it.
