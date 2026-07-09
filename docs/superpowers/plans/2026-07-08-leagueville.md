# Leagueville Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Leagueville — a soccer fixtures/results/standings/teams site for 5 leagues with calendar export (subscribe or download .ics at league/team/hand-picked granularity).

**Architecture:** Single Next.js 15 App Router app. Server components read from a typed data layer (`src/lib/data/`) that fetches ESPN's unofficial API (+ TheSportsDB for club bios) through Next's fetch cache with per-endpoint revalidation — no database. Calendar feeds are route handlers serving RFC 5545 iCalendar. Timezone rendering, match picking, and "my team" pinning are client-side with localStorage.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), Tailwind CSS v4, Vitest + Testing Library (jsdom), npm. Deploy target: Vercel (but local-only for now).

## Global Constraints

- Repo root: `/mnt/c/Users/igodl/code/soccer` (git repo already initialized, branch `main`). All paths below relative to root.
- Site name is exactly **Leagueville**.
- Node ≥ 20, npm (no yarn/pnpm). Next.js 15 via `create-next-app@15`, `--src-dir` layout, import alias `@/*` → `src/*`.
- No database. All persistence is Next fetch cache (server) and localStorage (client).
- Only `src/lib/data/*` may know upstream URLs. ESPN base: `https://site.api.espn.com/apis`. TheSportsDB base: `https://www.thesportsdb.com/api/v1/json/3`.
- League registry (exact values, used everywhere):

  | slug | espn | name | shortName | accent | seasonType | tsdbName |
  |---|---|---|---|---|---|---|
  | `premier-league` | `eng.1` | Premier League | EPL | `#8b5cf6` | cross-year | English Premier League |
  | `la-liga` | `esp.1` | La Liga | La Liga | `#fb7185` | cross-year | Spanish La Liga |
  | `ligue-1` | `fra.1` | Ligue 1 | Ligue 1 | `#f59e0b` | cross-year | French Ligue 1 |
  | `brasileirao` | `bra.1` | Brasileirão | Brasileirão | `#22c55e` | calendar-year | Brazilian Serie A |
  | `mls` | `usa.1` | MLS | MLS | `#3b82f6` | calendar-year | American Major League Soccer |

- Revalidation intervals (seconds): teams 86400, season fixtures 21600, standings 3600 (past seasons 604800), scoreboard window 60, roster 86400, bios 604800.
- All kickoff times stored as ISO 8601 UTC strings; rendered client-side in the user's timezone.
- iCalendar: CRLF line endings, lines folded at 74 chars, `UID` = `<leagueSlug>-<eventId>@leagueville`, 120-minute event duration, text escaping per RFC 5545 (`\` `;` `,` newlines).
- localStorage keys: `lv-tz` (timezone), `lv-picks` (string[] of `<leagueSlug>:<eventId>`), `lv-myteam` (`{league,slug,name}` or null).
- Every data-layer page call is wrapped in `.catch()` with a safe fallback — a failed upstream call must never crash a page.
- Tests: Vitest, colocated as `*.test.ts(x)` next to source. `npm test` = `vitest run --passWithNoTests`.
- Commit after every task with the message given in the task.

---

### Task 1: Scaffold Next.js app + Vitest

**Files:**
- Create: entire Next.js scaffold (via `create-next-app@15`), `vitest.config.ts`
- Modify: `next.config.ts`, `package.json` (scripts)

**Interfaces:**
- Consumes: empty repo with `docs/` and `.git`
- Produces: running Next 15 app, `npm test` / `npm run build` / `npm run lint` all green, `@/*` alias working in app and tests, remote image hosts allowed for `a.espncdn.com`, `r2.thesportsdb.com`, `www.thesportsdb.com`.

- [ ] **Step 1: Verify node and move docs aside** (create-next-app refuses non-whitelisted files; `docs/` must be out of the way, `.git` is fine)

```bash
node -v   # expect v20+
cd /mnt/c/Users/igodl/code/soccer
mv docs ../leagueville-docs-tmp
```

- [ ] **Step 2: Scaffold** (if prompted for anything not covered by flags, accept the default)

```bash
npx create-next-app@15 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack
mv ../leagueville-docs-tmp docs
```

- [ ] **Step 3: Set package name and test scripts**

In `package.json` set `"name": "leagueville"` and add to `"scripts"`:

```json
"test": "vitest run --passWithNoTests",
"test:watch": "vitest"
```

- [ ] **Step 4: Install test tooling**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

- [ ] **Step 6: Replace `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: 'r2.thesportsdb.com' },
      { protocol: 'https', hostname: 'www.thesportsdb.com' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 7: Verify**

```bash
npm test        # expect: passWithNoTests, exit 0
npm run lint    # expect: no errors
npm run build   # expect: compiled successfully
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with Vitest"
```

---

### Task 2: League registry

**Files:**
- Create: `src/lib/leagues.ts`
- Test: `src/lib/leagues.test.ts`

**Interfaces:**
- Produces:
  - `type LeagueSlug = 'premier-league' | 'la-liga' | 'ligue-1' | 'brasileirao' | 'mls'`
  - `interface League { slug: LeagueSlug; espn: string; name: string; shortName: string; accent: string; seasonType: 'cross-year' | 'calendar-year'; tsdbName: string }`
  - `const LEAGUES: League[]` (order: EPL, La Liga, Ligue 1, Brasileirão, MLS)
  - `getLeague(slug: string): League | undefined`
  - `seasonStartYear(league: League, now: Date): number`
  - `seasonRange(league: League, now: Date): { start: string; end: string }` — `YYYYMMDD` strings for ESPN's `dates=` param

- [ ] **Step 1: Write the failing test** — `src/lib/leagues.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { LEAGUES, getLeague, seasonRange, seasonStartYear } from './leagues'

describe('league registry', () => {
  it('has the 5 leagues in display order', () => {
    expect(LEAGUES.map((l) => l.slug)).toEqual([
      'premier-league', 'la-liga', 'ligue-1', 'brasileirao', 'mls',
    ])
    expect(getLeague('premier-league')?.espn).toBe('eng.1')
    expect(getLeague('mls')?.espn).toBe('usa.1')
    expect(getLeague('nope')).toBeUndefined()
  })
})

describe('seasonRange', () => {
  const epl = getLeague('premier-league')!
  const mls = getLeague('mls')!

  it('cross-year league in July belongs to the upcoming season', () => {
    expect(seasonRange(epl, new Date('2026-07-08T12:00:00Z'))).toEqual({
      start: '20260801', end: '20270630',
    })
    expect(seasonStartYear(epl, new Date('2026-07-08T12:00:00Z'))).toBe(2026)
  })

  it('cross-year league in March belongs to the running season', () => {
    expect(seasonRange(epl, new Date('2026-03-01T12:00:00Z'))).toEqual({
      start: '20250801', end: '20260630',
    })
  })

  it('calendar-year league spans the current year', () => {
    expect(seasonRange(mls, new Date('2026-07-08T12:00:00Z'))).toEqual({
      start: '20260101', end: '20261231',
    })
    expect(seasonStartYear(mls, new Date('2026-07-08T12:00:00Z'))).toBe(2026)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leagues.test.ts`
Expected: FAIL — cannot resolve `./leagues`

- [ ] **Step 3: Write `src/lib/leagues.ts`**

```ts
export type LeagueSlug = 'premier-league' | 'la-liga' | 'ligue-1' | 'brasileirao' | 'mls'

export interface League {
  slug: LeagueSlug
  espn: string
  name: string
  shortName: string
  accent: string
  seasonType: 'cross-year' | 'calendar-year'
  tsdbName: string
}

export const LEAGUES: League[] = [
  { slug: 'premier-league', espn: 'eng.1', name: 'Premier League', shortName: 'EPL', accent: '#8b5cf6', seasonType: 'cross-year', tsdbName: 'English Premier League' },
  { slug: 'la-liga', espn: 'esp.1', name: 'La Liga', shortName: 'La Liga', accent: '#fb7185', seasonType: 'cross-year', tsdbName: 'Spanish La Liga' },
  { slug: 'ligue-1', espn: 'fra.1', name: 'Ligue 1', shortName: 'Ligue 1', accent: '#f59e0b', seasonType: 'cross-year', tsdbName: 'French Ligue 1' },
  { slug: 'brasileirao', espn: 'bra.1', name: 'Brasileirão', shortName: 'Brasileirão', accent: '#22c55e', seasonType: 'calendar-year', tsdbName: 'Brazilian Serie A' },
  { slug: 'mls', espn: 'usa.1', name: 'MLS', shortName: 'MLS', accent: '#3b82f6', seasonType: 'calendar-year', tsdbName: 'American Major League Soccer' },
]

export function getLeague(slug: string): League | undefined {
  return LEAGUES.find((l) => l.slug === slug)
}

export function seasonStartYear(league: League, now: Date): number {
  const y = now.getUTCFullYear()
  if (league.seasonType === 'calendar-year') return y
  return now.getUTCMonth() + 1 >= 7 ? y : y - 1
}

export function seasonRange(league: League, now: Date): { start: string; end: string } {
  if (league.seasonType === 'calendar-year') {
    const y = now.getUTCFullYear()
    return { start: `${y}0101`, end: `${y}1231` }
  }
  const sy = seasonStartYear(league, now)
  return { start: `${sy}0801`, end: `${sy + 1}0630` }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leagues.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/leagues.ts src/lib/leagues.test.ts
git commit -m "feat: league registry with season windows"
```

---

### Task 3: Slugify + domain types

**Files:**
- Create: `src/lib/slugify.ts`, `src/lib/types.ts`
- Test: `src/lib/slugify.test.ts`

**Interfaces:**
- Produces:
  - `slugify(name: string): string` — lowercase, diacritics stripped, non-alphanumerics collapsed to `-`
  - Domain types used by every later task:

```ts
// src/lib/types.ts — create exactly this file in Step 3
import type { LeagueSlug } from './leagues'

export interface FixtureSide {
  id: string
  name: string
  abbrev?: string
  logo?: string
  score?: number
  winner?: boolean
}

export interface Fixture {
  id: string
  league: LeagueSlug
  kickoff: string // ISO 8601 UTC
  status: 'scheduled' | 'live' | 'final' | 'postponed'
  statusDetail: string
  venue?: string
  home: FixtureSide
  away: FixtureSide
}

export interface Team {
  id: string
  slug: string
  name: string
  shortName: string
  abbrev?: string
  logo?: string
  location?: string
}

export interface StandingRow {
  rank: number
  teamId: string
  teamName: string
  teamSlug: string
  logo?: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface StandingsGroup {
  name: string
  rows: StandingRow[]
}

export interface Player {
  id: string
  name: string
  position?: string
  jersey?: string
  age?: number
  nationality?: string
  flag?: string
}

export interface TeamBio {
  description?: string
  banner?: string
  stadium?: string
  founded?: number
}

export interface SeasonFinish {
  season: number
  rank: number
  points: number
  group?: string
}
```

- [ ] **Step 1: Write the failing test** — `src/lib/slugify.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Manchester United')).toBe('manchester-united')
  })
  it('strips diacritics', () => {
    expect(slugify('Atlético Madrid')).toBe('atletico-madrid')
    expect(slugify('São Paulo')).toBe('sao-paulo')
  })
  it('collapses punctuation runs and trims hyphens', () => {
    expect(slugify('St. Louis CITY SC')).toBe('st-louis-city-sc')
    expect(slugify('  Paris Saint-Germain ')).toBe('paris-saint-germain')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/slugify.test.ts`
Expected: FAIL — cannot resolve `./slugify`

- [ ] **Step 3: Write `src/lib/slugify.ts` and `src/lib/types.ts`** (types file content shown in Interfaces above)

```ts
// src/lib/slugify.ts
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/slugify.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/slugify.ts src/lib/slugify.test.ts src/lib/types.ts
git commit -m "feat: slugify helper and domain types"
```

---

### Task 4: ESPN fetch helper + fixtures

**Files:**
- Create: `src/lib/data/espn.ts`, `src/lib/data/fixtures.ts`
- Test: `src/lib/data/fixtures.test.ts`

**Interfaces:**
- Consumes: `League`, `seasonRange` from `@/lib/leagues`; `Fixture`, `FixtureSide`, `LeagueSlug` from `@/lib/types`
- Produces:
  - `espnJson<T>(path: string, revalidate: number): Promise<T>` (in `espn.ts`)
  - `normalizeEvent(raw: RawEvent, league: LeagueSlug): Fixture | null` — pure, exported for tests
  - `getSeasonFixtures(league: League): Promise<Fixture[]>` — full season, sorted by kickoff, revalidate 21600
  - `getScoreboardWindow(league: League): Promise<Fixture[]>` — yesterday→tomorrow window, revalidate 60

- [ ] **Step 1: Write the failing test** — `src/lib/data/fixtures.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { normalizeEvent } from './fixtures'

const finalEvent = {
  id: '2267073',
  date: '2025-08-15T19:00Z',
  competitions: [{
    venue: { fullName: 'Anfield' },
    status: { type: { state: 'post', completed: true, description: 'Full Time', detail: 'FT', shortDetail: 'FT' } },
    competitors: [
      { homeAway: 'home', winner: true, score: '4', team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV', logo: 'https://a.espncdn.com/liv.png' } },
      { homeAway: 'away', winner: false, score: '2', team: { id: '349', displayName: 'AFC Bournemouth', abbreviation: 'BOU', logo: 'https://a.espncdn.com/bou.png' } },
    ],
  }],
}

const scheduledEvent = {
  id: '760001',
  date: '2026-08-22T14:00Z',
  competitions: [{
    status: { type: { state: 'pre', completed: false, description: 'Scheduled', detail: 'Sat, August 22nd at 2:00 PM UTC', shortDetail: '8/22 - 2:00 PM UTC' } },
    competitors: [
      { homeAway: 'home', team: { id: '368', displayName: 'Everton' } },
      { homeAway: 'away', team: { id: '384', displayName: 'Crystal Palace' } },
    ],
  }],
}

// shape returned by the /teams/{id}/schedule endpoint: object scores, logos array
const scheduleShapeEvent = {
  id: '761440',
  date: '2026-05-02T23:30Z',
  competitions: [{
    status: { type: { state: 'post', completed: true, description: 'Full Time', detail: 'FT', shortDetail: 'FT' } },
    competitors: [
      { homeAway: 'home', winner: true, score: { value: 2, displayValue: '2' }, team: { id: '18267', displayName: 'FC Cincinnati', logos: [{ href: 'https://a.espncdn.com/cin.png' }] } },
      { homeAway: 'away', winner: false, score: { value: 0, displayValue: '0' }, team: { id: '18418', displayName: 'Atlanta United FC', logos: [{ href: 'https://a.espncdn.com/atl.png' }] } },
    ],
  }],
}

const postponedEvent = {
  ...scheduledEvent,
  id: '760002',
  competitions: [{
    ...scheduledEvent.competitions[0],
    status: { type: { state: 'pre', completed: false, description: 'Postponed', detail: 'Postponed', shortDetail: 'PPD' } },
  }],
}

describe('normalizeEvent', () => {
  it('normalizes a finished game', () => {
    const f = normalizeEvent(finalEvent, 'premier-league')!
    expect(f.id).toBe('2267073')
    expect(f.league).toBe('premier-league')
    expect(f.kickoff).toBe('2025-08-15T19:00:00.000Z')
    expect(f.status).toBe('final')
    expect(f.statusDetail).toBe('FT')
    expect(f.venue).toBe('Anfield')
    expect(f.home).toMatchObject({ id: '364', name: 'Liverpool', abbrev: 'LIV', score: 4, winner: true, logo: 'https://a.espncdn.com/liv.png' })
    expect(f.away.score).toBe(2)
  })

  it('normalizes a scheduled game with no scores', () => {
    const f = normalizeEvent(scheduledEvent, 'premier-league')!
    expect(f.status).toBe('scheduled')
    expect(f.home.score).toBeUndefined()
    expect(f.venue).toBeUndefined()
  })

  it('handles schedule-endpoint shape (object score, logos array)', () => {
    const f = normalizeEvent(scheduleShapeEvent, 'mls')!
    expect(f.home.score).toBe(2)
    expect(f.away.score).toBe(0)
    expect(f.home.logo).toBe('https://a.espncdn.com/cin.png')
  })

  it('flags postponed games', () => {
    expect(normalizeEvent(postponedEvent, 'premier-league')!.status).toBe('postponed')
  })

  it('returns null for malformed events', () => {
    expect(normalizeEvent({ id: 'x', date: '2026-01-01T00:00Z', competitions: [] }, 'mls')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/fixtures.test.ts`
Expected: FAIL — cannot resolve `./fixtures`

- [ ] **Step 3: Write `src/lib/data/espn.ts`**

```ts
const BASE = 'https://site.api.espn.com/apis'

export async function espnJson<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } })
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${path}`)
  return res.json() as Promise<T>
}
```

- [ ] **Step 4: Write `src/lib/data/fixtures.ts`**

```ts
import { espnJson } from './espn'
import { seasonRange, type League, type LeagueSlug } from '../leagues'
import type { Fixture, FixtureSide } from '../types'

interface RawCompetitor {
  homeAway: 'home' | 'away'
  winner?: boolean
  score?: string | { displayValue?: string }
  team: {
    id: string
    displayName: string
    abbreviation?: string
    logo?: string
    logos?: { href: string }[]
  }
}

export interface RawEvent {
  id: string
  date: string
  competitions: {
    venue?: { fullName?: string }
    status: {
      type: { state: 'pre' | 'in' | 'post'; completed: boolean; description: string; detail: string; shortDetail: string }
    }
    competitors: RawCompetitor[]
  }[]
}

function side(c: RawCompetitor): FixtureSide {
  const rawScore = typeof c.score === 'object' ? c.score?.displayValue : c.score
  const parsed = rawScore === undefined || rawScore === '' ? undefined : Number(rawScore)
  return {
    id: c.team.id,
    name: c.team.displayName,
    abbrev: c.team.abbreviation,
    logo: c.team.logo ?? c.team.logos?.[0]?.href,
    score: parsed !== undefined && Number.isNaN(parsed) ? undefined : parsed,
    winner: c.winner,
  }
}

export function normalizeEvent(raw: RawEvent, league: LeagueSlug): Fixture | null {
  const comp = raw.competitions?.[0]
  if (!comp) return null
  const home = comp.competitors?.find((c) => c.homeAway === 'home')
  const away = comp.competitors?.find((c) => c.homeAway === 'away')
  if (!home || !away) return null
  const st = comp.status.type
  const status: Fixture['status'] =
    st.description === 'Postponed' ? 'postponed'
    : st.state === 'pre' ? 'scheduled'
    : st.state === 'in' ? 'live'
    : 'final'
  return {
    id: raw.id,
    league,
    kickoff: new Date(raw.date).toISOString(),
    status,
    statusDetail: st.shortDetail ?? st.detail ?? st.description,
    venue: comp.venue?.fullName,
    home: side(home),
    away: side(away),
  }
}

function normalizeAll(events: RawEvent[] | undefined, league: League): Fixture[] {
  return (events ?? [])
    .map((e) => normalizeEvent(e, league.slug))
    .filter((f): f is Fixture => f !== null)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

export async function getSeasonFixtures(league: League): Promise<Fixture[]> {
  const { start, end } = seasonRange(league, new Date())
  const data = await espnJson<{ events?: RawEvent[] }>(
    `/site/v2/sports/soccer/${league.espn}/scoreboard?dates=${start}-${end}&limit=1000`,
    21600,
  )
  return normalizeAll(data.events, league)
}

export async function getScoreboardWindow(league: League): Promise<Fixture[]> {
  const day = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
  const now = Date.now()
  const from = day(new Date(now - 24 * 3600_000))
  const to = day(new Date(now + 24 * 3600_000))
  const data = await espnJson<{ events?: RawEvent[] }>(
    `/site/v2/sports/soccer/${league.espn}/scoreboard?dates=${from}-${to}&limit=200`,
    60,
  )
  return normalizeAll(data.events, league)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/data/fixtures.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/data
git commit -m "feat: ESPN fetch helper and fixture normalization"
```

---

### Task 5: Teams

**Files:**
- Create: `src/lib/data/teams.ts`
- Test: `src/lib/data/teams.test.ts`

**Interfaces:**
- Consumes: `espnJson`, `slugify`, `League`, `Team`
- Produces:
  - `normalizeTeam(raw: RawTeam): Team` — pure, exported for tests
  - `getTeams(league: League): Promise<Team[]>` — sorted by name, revalidate 86400
  - `findTeam(league: League, slug: string): Promise<Team | undefined>`

- [ ] **Step 1: Write the failing test** — `src/lib/data/teams.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { normalizeTeam } from './teams'

describe('normalizeTeam', () => {
  it('normalizes an ESPN team with slug and logo', () => {
    const t = normalizeTeam({
      id: '1068',
      displayName: 'Atlético Madrid',
      shortDisplayName: 'Atlético',
      abbreviation: 'ATM',
      location: 'Madrid',
      logos: [{ href: 'https://a.espncdn.com/atm.png' }],
    })
    expect(t).toEqual({
      id: '1068',
      slug: 'atletico-madrid',
      name: 'Atlético Madrid',
      shortName: 'Atlético',
      abbrev: 'ATM',
      logo: 'https://a.espncdn.com/atm.png',
      location: 'Madrid',
    })
  })

  it('tolerates missing optional fields', () => {
    const t = normalizeTeam({ id: '9', displayName: 'Some Club' })
    expect(t.slug).toBe('some-club')
    expect(t.shortName).toBe('Some Club')
    expect(t.logo).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/teams.test.ts`
Expected: FAIL — cannot resolve `./teams`

- [ ] **Step 3: Write `src/lib/data/teams.ts`**

```ts
import { espnJson } from './espn'
import { slugify } from '../slugify'
import type { League } from '../leagues'
import type { Team } from '../types'

export interface RawTeam {
  id: string
  displayName: string
  shortDisplayName?: string
  abbreviation?: string
  location?: string
  logos?: { href: string }[]
}

export function normalizeTeam(raw: RawTeam): Team {
  return {
    id: raw.id,
    slug: slugify(raw.displayName),
    name: raw.displayName,
    shortName: raw.shortDisplayName ?? raw.displayName,
    abbrev: raw.abbreviation,
    logo: raw.logos?.[0]?.href,
    location: raw.location,
  }
}

export async function getTeams(league: League): Promise<Team[]> {
  const data = await espnJson<{ sports: { leagues: { teams: { team: RawTeam }[] }[] }[] }>(
    `/site/v2/sports/soccer/${league.espn}/teams`,
    86400,
  )
  return (data.sports?.[0]?.leagues?.[0]?.teams ?? [])
    .map((t) => normalizeTeam(t.team))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function findTeam(league: League, slug: string): Promise<Team | undefined> {
  return (await getTeams(league)).find((t) => t.slug === slug)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/data/teams.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/teams.ts src/lib/data/teams.test.ts
git commit -m "feat: team fetching and normalization"
```

---

### Task 6: Standings + season history

**Files:**
- Create: `src/lib/data/standings.ts`
- Test: `src/lib/data/standings.test.ts`

**Interfaces:**
- Consumes: `espnJson`, `slugify`, `seasonStartYear`, `League`, `StandingRow`, `StandingsGroup`, `SeasonFinish`
- Produces:
  - `normalizeEntry(e: RawEntry): StandingRow` — pure, exported for tests
  - `getStandings(league: League, season?: number): Promise<StandingsGroup[]>` — one group per conference (MLS has 2, others 1); revalidate 3600 current / 604800 past
  - `getSeasonHistory(league: League, teamId: string, count?: number): Promise<SeasonFinish[]>` — last `count` (default 5) completed seasons, missing seasons skipped silently

- [ ] **Step 1: Write the failing test** — `src/lib/data/standings.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { normalizeEntry } from './standings'

describe('normalizeEntry', () => {
  it('maps ESPN stats array to a standings row', () => {
    const row = normalizeEntry({
      team: { id: '359', displayName: 'Arsenal', logos: [{ href: 'https://a.espncdn.com/ars.png' }] },
      stats: [
        { name: 'rank', value: 2 },
        { name: 'gamesPlayed', value: 38 },
        { name: 'wins', value: 26 },
        { name: 'ties', value: 7 },
        { name: 'losses', value: 5 },
        { name: 'pointsFor', value: 84 },
        { name: 'pointsAgainst', value: 32 },
        { name: 'pointDifferential', value: 52 },
        { name: 'points', value: 85 },
      ],
    })
    expect(row).toEqual({
      rank: 2,
      teamId: '359',
      teamName: 'Arsenal',
      teamSlug: 'arsenal',
      logo: 'https://a.espncdn.com/ars.png',
      played: 38,
      wins: 26,
      draws: 7,
      losses: 5,
      goalsFor: 84,
      goalsAgainst: 32,
      goalDiff: 52,
      points: 85,
    })
  })

  it('defaults missing stats to 0', () => {
    const row = normalizeEntry({ team: { id: '1', displayName: 'X FC' }, stats: [] })
    expect(row.points).toBe(0)
    expect(row.rank).toBe(0)
    expect(row.logo).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/standings.test.ts`
Expected: FAIL — cannot resolve `./standings`

- [ ] **Step 3: Write `src/lib/data/standings.ts`**

```ts
import { espnJson } from './espn'
import { slugify } from '../slugify'
import { seasonStartYear, type League } from '../leagues'
import type { SeasonFinish, StandingRow, StandingsGroup } from '../types'

interface RawStat { name: string; value?: number }

export interface RawEntry {
  team: { id: string; displayName: string; logos?: { href: string }[] }
  stats: RawStat[]
}

interface RawStandings {
  children?: { name?: string; standings?: { entries?: RawEntry[] } }[]
}

function stat(stats: RawStat[], name: string): number {
  return stats.find((s) => s.name === name)?.value ?? 0
}

export function normalizeEntry(e: RawEntry): StandingRow {
  return {
    rank: stat(e.stats, 'rank'),
    teamId: e.team.id,
    teamName: e.team.displayName,
    teamSlug: slugify(e.team.displayName),
    logo: e.team.logos?.[0]?.href,
    played: stat(e.stats, 'gamesPlayed'),
    wins: stat(e.stats, 'wins'),
    draws: stat(e.stats, 'ties'),
    losses: stat(e.stats, 'losses'),
    goalsFor: stat(e.stats, 'pointsFor'),
    goalsAgainst: stat(e.stats, 'pointsAgainst'),
    goalDiff: stat(e.stats, 'pointDifferential'),
    points: stat(e.stats, 'points'),
  }
}

export async function getStandings(league: League, season?: number): Promise<StandingsGroup[]> {
  const query = season ? `?season=${season}` : ''
  const data = await espnJson<RawStandings>(
    `/v2/sports/soccer/${league.espn}/standings${query}`,
    season ? 604800 : 3600,
  )
  return (data.children ?? [])
    .map((c) => ({
      name: c.name ?? league.name,
      rows: (c.standings?.entries ?? []).map(normalizeEntry).sort((a, b) => a.rank - b.rank),
    }))
    .filter((g) => g.rows.length > 0)
}

export async function getSeasonHistory(league: League, teamId: string, count = 5): Promise<SeasonFinish[]> {
  const current = seasonStartYear(league, new Date())
  const seasons = Array.from({ length: count }, (_, i) => current - 1 - i)
  const results = await Promise.all(
    seasons.map(async (season): Promise<SeasonFinish | null> => {
      try {
        const groups = await getStandings(league, season)
        for (const g of groups) {
          const row = g.rows.find((r) => r.teamId === teamId)
          if (row) {
            return { season, rank: row.rank, points: row.points, group: groups.length > 1 ? g.name : undefined }
          }
        }
      } catch {
        // season not published upstream — skip it
      }
      return null
    }),
  )
  return results.filter((r): r is SeasonFinish => r !== null)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/data/standings.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/standings.ts src/lib/data/standings.test.ts
git commit -m "feat: standings and season history"
```

---

### Task 7: Rosters

**Files:**
- Create: `src/lib/data/roster.ts`
- Test: `src/lib/data/roster.test.ts`

**Interfaces:**
- Consumes: `espnJson`, `League`, `Player`
- Produces:
  - `normalizePlayer(raw: RawAthlete): Player` — pure, exported for tests
  - `sortPlayers(players: Player[]): Player[]` — GK → DEF → MID → FWD → other, then jersey number; pure, exported for tests
  - `getRoster(league: League, teamId: string): Promise<Player[]>` — revalidate 86400, sorted

- [ ] **Step 1: Write the failing test** — `src/lib/data/roster.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { normalizePlayer, sortPlayers } from './roster'

describe('normalizePlayer', () => {
  it('maps an ESPN athlete', () => {
    const p = normalizePlayer({
      id: '150225',
      displayName: 'Bukayo Saka',
      jersey: '7',
      age: 24,
      citizenship: 'England',
      flag: { href: 'https://a.espncdn.com/eng.png' },
      position: { displayName: 'Forward' },
    })
    expect(p).toEqual({
      id: '150225',
      name: 'Bukayo Saka',
      position: 'Forward',
      jersey: '7',
      age: 24,
      nationality: 'England',
      flag: 'https://a.espncdn.com/eng.png',
    })
  })

  it('tolerates missing fields', () => {
    const p = normalizePlayer({ id: '1', displayName: 'Trialist' })
    expect(p.position).toBeUndefined()
    expect(p.jersey).toBeUndefined()
  })
})

describe('sortPlayers', () => {
  it('orders GK, DEF, MID, FWD then jersey number', () => {
    const names = sortPlayers([
      { id: '1', name: 'Fwd9', position: 'Forward', jersey: '9' },
      { id: '2', name: 'GK1', position: 'Goalkeeper', jersey: '1' },
      { id: '3', name: 'Mid8', position: 'Midfielder', jersey: '8' },
      { id: '4', name: 'Def2', position: 'Defender', jersey: '2' },
      { id: '5', name: 'Fwd7', position: 'Forward', jersey: '7' },
      { id: '6', name: 'NoPos' },
    ]).map((p) => p.name)
    expect(names).toEqual(['GK1', 'Def2', 'Mid8', 'Fwd7', 'Fwd9', 'NoPos'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/roster.test.ts`
Expected: FAIL — cannot resolve `./roster`

- [ ] **Step 3: Write `src/lib/data/roster.ts`**

```ts
import { espnJson } from './espn'
import type { League } from '../leagues'
import type { Player } from '../types'

export interface RawAthlete {
  id: string
  displayName: string
  jersey?: string
  age?: number
  citizenship?: string
  flag?: { href: string }
  position?: { displayName?: string; name?: string }
}

export function normalizePlayer(raw: RawAthlete): Player {
  return {
    id: raw.id,
    name: raw.displayName,
    position: raw.position?.displayName ?? raw.position?.name,
    jersey: raw.jersey,
    age: raw.age,
    nationality: raw.citizenship,
    flag: raw.flag?.href,
  }
}

const POSITION_ORDER: Record<string, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Forward: 3,
}

export function sortPlayers(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) =>
      (POSITION_ORDER[a.position ?? ''] ?? 9) - (POSITION_ORDER[b.position ?? ''] ?? 9) ||
      Number(a.jersey ?? 999) - Number(b.jersey ?? 999),
  )
}

export async function getRoster(league: League, teamId: string): Promise<Player[]> {
  const data = await espnJson<{ athletes?: RawAthlete[] }>(
    `/site/v2/sports/soccer/${league.espn}/teams/${teamId}/roster`,
    86400,
  )
  return sortPlayers((data.athletes ?? []).map(normalizePlayer))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/data/roster.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/roster.ts src/lib/data/roster.test.ts
git commit -m "feat: squad roster fetching with position ordering"
```

---

### Task 8: Team bios (TheSportsDB)

**Files:**
- Create: `src/lib/data/bio.ts`
- Test: `src/lib/data/bio.test.ts`

**Interfaces:**
- Consumes: `League`, `TeamBio`
- Produces:
  - `normalizeBios(raw: { teams?: RawTsdbTeam[] | null }): Map<string, TeamBio>` — keyed by **ESPN team id** (TheSportsDB exposes `idESPN`); pure, exported for tests
  - `getTeamBio(league: League, espnTeamId: string): Promise<TeamBio | undefined>` — never throws; returns `undefined` on any failure; revalidate 604800

- [ ] **Step 1: Write the failing test** — `src/lib/data/bio.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { normalizeBios } from './bio'

describe('normalizeBios', () => {
  it('keys bios by ESPN id and cleans nulls', () => {
    const map = normalizeBios({
      teams: [
        {
          idESPN: '359',
          strDescriptionEN: 'Arsenal Football Club is...',
          strBanner: 'https://r2.thesportsdb.com/ars-banner.jpg',
          strStadium: 'Emirates Stadium',
          intFormedYear: '1886',
        },
        { idESPN: null, strDescriptionEN: 'No espn id — skipped' },
        { idESPN: '368', strDescriptionEN: null, strBanner: null, strStadium: 'Goodison Park', intFormedYear: null },
      ],
    })
    expect(map.get('359')).toEqual({
      description: 'Arsenal Football Club is...',
      banner: 'https://r2.thesportsdb.com/ars-banner.jpg',
      stadium: 'Emirates Stadium',
      founded: 1886,
    })
    expect(map.get('368')).toEqual({ description: undefined, banner: undefined, stadium: 'Goodison Park', founded: undefined })
    expect(map.size).toBe(2)
  })

  it('handles a null teams payload', () => {
    expect(normalizeBios({ teams: null }).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/bio.test.ts`
Expected: FAIL — cannot resolve `./bio`

- [ ] **Step 3: Write `src/lib/data/bio.ts`**

```ts
import type { League } from '../leagues'
import type { TeamBio } from '../types'

const TSDB = 'https://www.thesportsdb.com/api/v1/json/3'

export interface RawTsdbTeam {
  idESPN?: string | null
  strDescriptionEN?: string | null
  strBanner?: string | null
  strStadium?: string | null
  intFormedYear?: string | null
}

export function normalizeBios(raw: { teams?: RawTsdbTeam[] | null }): Map<string, TeamBio> {
  const map = new Map<string, TeamBio>()
  for (const t of raw.teams ?? []) {
    if (!t.idESPN) continue
    map.set(t.idESPN, {
      description: t.strDescriptionEN ?? undefined,
      banner: t.strBanner ?? undefined,
      stadium: t.strStadium ?? undefined,
      founded: t.intFormedYear ? Number(t.intFormedYear) : undefined,
    })
  }
  return map
}

export async function getTeamBio(league: League, espnTeamId: string): Promise<TeamBio | undefined> {
  try {
    const res = await fetch(
      `${TSDB}/search_all_teams.php?l=${encodeURIComponent(league.tsdbName)}`,
      { next: { revalidate: 604800 } },
    )
    if (!res.ok) return undefined
    const data = (await res.json()) as { teams?: RawTsdbTeam[] | null }
    return normalizeBios(data).get(espnTeamId)
  } catch {
    return undefined
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/data/bio.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/bio.ts src/lib/data/bio.test.ts
git commit -m "feat: club bios from TheSportsDB keyed by ESPN id"
```

---

### Task 9: iCalendar builder

**Files:**
- Create: `src/lib/ics.ts`
- Test: `src/lib/ics.test.ts`

**Interfaces:**
- Consumes: `Fixture` from `@/lib/types`
- Produces:
  - `interface CalEvent { uid: string; start: Date; durationMinutes?: number; title: string; location?: string; description?: string }`
  - `buildIcs(calName: string, events: CalEvent[], dtstamp?: Date): string` — full VCALENDAR, CRLF, folded
  - `fixturesToCalEvents(fixtures: Fixture[], leagueName: string): CalEvent[]` — skips postponed games; UID `<league>-<id>@leagueville`; title `⚽ Home vs Away`; finished games get the score appended to the description

- [ ] **Step 1: Write the failing test** — `src/lib/ics.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { buildIcs, fixturesToCalEvents, type CalEvent } from './ics'
import type { Fixture } from './types'

const dtstamp = new Date('2026-07-08T00:00:00Z')

const ev: CalEvent = {
  uid: 'premier-league-760001@leagueville',
  start: new Date('2026-08-22T14:00:00Z'),
  title: '⚽ Everton vs Crystal Palace',
  location: 'Goodison Park, Liverpool',
  description: 'Premier League',
}

describe('buildIcs', () => {
  const ics = buildIcs('Premier League — Leagueville', [ev], dtstamp)

  it('produces a well-formed VCALENDAR', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('UID:premier-league-760001@leagueville')
    expect(ics).toContain('DTSTAMP:20260708T000000Z')
    expect(ics).toContain('DTSTART:20260822T140000Z')
    expect(ics).toContain('DURATION:PT120M')
  })

  it('uses CRLF exclusively', () => {
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('escapes commas in text fields', () => {
    expect(ics).toContain('LOCATION:Goodison Park\\, Liverpool')
  })

  it('folds lines longer than 74 chars with a leading space', () => {
    const long = buildIcs('X', [{ ...ev, title: '⚽ ' + 'Very Long Team Name United '.repeat(5) + ' vs Opponent' }], dtstamp)
    const lines = long.split('\r\n')
    expect(lines.some((l) => l.startsWith(' '))).toBe(true)
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(75)
  })
})

describe('fixturesToCalEvents', () => {
  const base: Fixture = {
    id: '1', league: 'premier-league', kickoff: '2026-08-22T14:00:00.000Z',
    status: 'scheduled', statusDetail: '', venue: 'Anfield',
    home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
  }

  it('maps fixtures and skips postponed', () => {
    const events = fixturesToCalEvents(
      [base, { ...base, id: '2', status: 'postponed' }],
      'Premier League',
    )
    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('premier-league-1@leagueville')
    expect(events[0].title).toBe('⚽ Liverpool vs Everton')
    expect(events[0].location).toBe('Anfield')
    expect(events[0].start.toISOString()).toBe('2026-08-22T14:00:00.000Z')
  })

  it('appends the final score for finished games', () => {
    const events = fixturesToCalEvents(
      [{ ...base, status: 'final', home: { id: 'h', name: 'Liverpool', score: 2 }, away: { id: 'a', name: 'Everton', score: 1 } }],
      'Premier League',
    )
    expect(events[0].description).toBe('Premier League — FT 2–1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ics.test.ts`
Expected: FAIL — cannot resolve `./ics`

- [ ] **Step 3: Write `src/lib/ics.ts`**

```ts
import type { Fixture } from './types'

export interface CalEvent {
  uid: string
  start: Date
  durationMinutes?: number
  title: string
  location?: string
  description?: string
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// RFC 5545 folding. We fold by character count rather than octets; multi-byte
// characters may push a line slightly past 75 octets, which parsers accept.
function foldLine(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function buildIcs(calName: string, events: CalEvent[], dtstamp: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leagueville//Fixtures//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calName)}`,
    'X-PUBLISHED-TTL:PT6H',
  ]
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(dtstamp)}`,
      `DTSTART:${icsDate(e.start)}`,
      `DURATION:PT${e.durationMinutes ?? 120}M`,
      `SUMMARY:${escapeText(e.title)}`,
    )
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

export function fixturesToCalEvents(fixtures: Fixture[], leagueName: string): CalEvent[] {
  return fixtures
    .filter((f) => f.status !== 'postponed')
    .map((f) => ({
      uid: `${f.league}-${f.id}@leagueville`,
      start: new Date(f.kickoff),
      title: `⚽ ${f.home.name} vs ${f.away.name}`,
      location: f.venue,
      description:
        leagueName +
        (f.status === 'final' && f.home.score !== undefined && f.away.score !== undefined
          ? ` — FT ${f.home.score}–${f.away.score}`
          : ''),
    }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ics.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ics.ts src/lib/ics.test.ts
git commit -m "feat: RFC 5545 iCalendar builder"
```

---

### Task 10: Calendar route handlers

**Files:**
- Create: `src/app/api/cal/league/[league]/route.ts`, `src/app/api/cal/team/[league]/[team]/route.ts`, `src/app/api/cal/custom/route.ts`
- Test: `src/app/api/cal/league/[league]/route.test.ts`

**Interfaces:**
- Consumes: `getLeague`, `getSeasonFixtures`, `findTeam`, `buildIcs`, `fixturesToCalEvents`
- Produces: three GET endpoints returning `text/calendar; charset=utf-8`. URL params may carry an optional `.ics` suffix which is stripped. Custom endpoint takes `?ids=<league>:<id>,<league>:<id>,…` (max 200).

- [ ] **Step 1: Write the failing test** — `src/app/api/cal/league/[league]/route.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/data/fixtures', () => ({
  getSeasonFixtures: vi.fn(async () => [
    {
      id: '1', league: 'premier-league', kickoff: '2026-08-22T14:00:00.000Z',
      status: 'scheduled', statusDetail: '', venue: 'Anfield',
      home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
    },
  ]),
}))

import { GET } from './route'

describe('league calendar route', () => {
  it('serves an ics for a known league, stripping the .ics suffix', async () => {
    const res = await GET(new Request('http://localhost/api/cal/league/premier-league.ics'), {
      params: Promise.resolve({ league: 'premier-league.ics' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    const body = await res.text()
    expect(body).toContain('SUMMARY:⚽ Liverpool vs Everton')
    expect(body).toContain('X-WR-CALNAME:Premier League — Leagueville')
  })

  it('404s an unknown league', async () => {
    const res = await GET(new Request('http://localhost/api/cal/league/nope'), {
      params: Promise.resolve({ league: 'nope' }),
    })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/api/cal/league/[league]/route.test.ts"`
Expected: FAIL — cannot resolve `./route`

- [ ] **Step 3: Write `src/app/api/cal/league/[league]/route.ts`**

```ts
import { getLeague } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { buildIcs, fixturesToCalEvents } from '@/lib/ics'

const ICS_HEADERS = {
  'Content-Type': 'text/calendar; charset=utf-8',
  'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
}

export async function GET(_req: Request, { params }: { params: Promise<{ league: string }> }) {
  const { league: rawSlug } = await params
  const league = getLeague(rawSlug.replace(/\.ics$/, ''))
  if (!league) return new Response('Unknown league', { status: 404 })
  try {
    const fixtures = await getSeasonFixtures(league)
    const ics = buildIcs(`${league.name} — Leagueville`, fixturesToCalEvents(fixtures, league.name))
    return new Response(ics, {
      headers: { ...ICS_HEADERS, 'Content-Disposition': `inline; filename="${league.slug}.ics"` },
    })
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
}
```

- [ ] **Step 4: Write `src/app/api/cal/team/[league]/[team]/route.ts`**

```ts
import { getLeague } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { findTeam } from '@/lib/data/teams'
import { buildIcs, fixturesToCalEvents } from '@/lib/ics'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; team: string }> },
) {
  const { league: rawLeague, team: rawTeam } = await params
  const league = getLeague(rawLeague)
  if (!league) return new Response('Unknown league', { status: 404 })
  try {
    const team = await findTeam(league, rawTeam.replace(/\.ics$/, ''))
    if (!team) return new Response('Unknown team', { status: 404 })
    const fixtures = (await getSeasonFixtures(league)).filter(
      (f) => f.home.id === team.id || f.away.id === team.id,
    )
    const ics = buildIcs(`${team.name} — Leagueville`, fixturesToCalEvents(fixtures, league.name))
    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
        'Content-Disposition': `inline; filename="${team.slug}.ics"`,
      },
    })
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
}
```

- [ ] **Step 5: Write `src/app/api/cal/custom/route.ts`**

```ts
import { getLeague } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { buildIcs, fixturesToCalEvents, type CalEvent } from '@/lib/ics'

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200)
  if (ids.length === 0) return new Response('No games selected', { status: 400 })

  const byLeague = new Map<string, Set<string>>()
  for (const token of ids) {
    const [slug, id] = token.split(':')
    if (!slug || !id) continue
    if (!byLeague.has(slug)) byLeague.set(slug, new Set())
    byLeague.get(slug)!.add(id)
  }

  const events: CalEvent[] = []
  try {
    for (const [slug, wanted] of byLeague) {
      const league = getLeague(slug)
      if (!league) continue
      const fixtures = (await getSeasonFixtures(league)).filter((f) => wanted.has(f.id))
      events.push(...fixturesToCalEvents(fixtures, league.name))
    }
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
  if (events.length === 0) return new Response('No matching games found', { status: 404 })

  events.sort((a, b) => a.start.getTime() - b.start.getTime())
  const ics = buildIcs('My picks — Leagueville', events)
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leagueville-picks.ics"',
    },
  })
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run "src/app/api/cal/league/[league]/route.test.ts"`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/api
git commit -m "feat: league/team/custom calendar feed routes"
```

---

### Task 11: Time helpers + timezone provider

**Files:**
- Create: `src/lib/time.ts`, `src/components/TimezoneProvider.tsx`, `src/components/TimezoneSelect.tsx`
- Test: `src/lib/time.test.ts`

**Interfaces:**
- Consumes: nothing project-internal (pure Intl)
- Produces:
  - `formatKickoff(iso: string, tz: string): string` — e.g. `10:00 AM` (narrow no-break spaces normalized to regular spaces)
  - `dateKey(iso: string, tz: string): string` — `YYYY-MM-DD` in the given tz, for grouping
  - `dateHeading(iso: string, tz: string): string` — e.g. `Saturday, August 22`
  - `TimezoneProvider` (client) — context `{ tz, setTz }`; initial `UTC`, then browser tz or `lv-tz` from localStorage after mount; `setTz` persists
  - `useTz(): { tz: string; setTz: (tz: string) => void }`
  - `TimezoneSelect` (client) — `<select>` over `Intl.supportedValuesOf('timeZone')`

- [ ] **Step 1: Write the failing test** — `src/lib/time.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { formatKickoff, dateKey, dateHeading } from './time'

describe('time helpers', () => {
  it('formats kickoff in the given timezone', () => {
    expect(formatKickoff('2026-08-22T14:00:00Z', 'America/New_York')).toBe('10:00 AM')
    expect(formatKickoff('2026-08-22T14:00:00Z', 'UTC')).toBe('2:00 PM')
  })

  it('groups by local date', () => {
    expect(dateKey('2026-08-22T23:30:00Z', 'America/New_York')).toBe('2026-08-22')
    expect(dateKey('2026-08-22T23:30:00Z', 'Asia/Tokyo')).toBe('2026-08-23')
  })

  it('renders a readable heading', () => {
    expect(dateHeading('2026-08-22T14:00:00Z', 'UTC')).toBe('Saturday, August 22')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/time.test.ts`
Expected: FAIL — cannot resolve `./time`

- [ ] **Step 3: Write `src/lib/time.ts`**

```ts
// Newer ICU inserts U+202F (narrow no-break space) before AM/PM; normalize it.
const nnbsp = / /g

export function formatKickoff(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  })
    .format(new Date(iso))
    .replace(nnbsp, ' ')
}

export function dateKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

export function dateHeading(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/time.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `src/components/TimezoneProvider.tsx`**

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const TzContext = createContext<{ tz: string; setTz: (tz: string) => void }>({
  tz: 'UTC',
  setTz: () => {},
})

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [tz, setTzState] = useState('UTC')

  useEffect(() => {
    const saved = window.localStorage.getItem('lv-tz')
    setTzState(saved || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  }, [])

  const setTz = (next: string) => {
    window.localStorage.setItem('lv-tz', next)
    setTzState(next)
  }

  return <TzContext.Provider value={{ tz, setTz }}>{children}</TzContext.Provider>
}

export function useTz() {
  return useContext(TzContext)
}
```

- [ ] **Step 6: Write `src/components/TimezoneSelect.tsx`**

```tsx
'use client'

import { useTz } from './TimezoneProvider'

export function TimezoneSelect() {
  const { tz, setTz } = useTz()
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [tz]
  return (
    <select
      value={tz}
      onChange={(e) => setTz(e.target.value)}
      aria-label="Timezone"
      className="max-w-40 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-300"
    >
      {!zones.includes(tz) && <option value={tz}>{tz}</option>}
      {zones.map((z) => (
        <option key={z} value={z}>
          {z}
        </option>
      ))}
    </select>
  )
}
```

- [ ] **Step 7: Verify types and commit**

```bash
npx tsc --noEmit   # expect: clean
git add src/lib/time.ts src/lib/time.test.ts src/components/TimezoneProvider.tsx src/components/TimezoneSelect.tsx
git commit -m "feat: timezone helpers, provider, and selector"
```

---

### Task 12: Picks store + selection tray + calendar buttons

**Files:**
- Create: `src/components/picks.ts`, `src/components/SelectionTray.tsx`, `src/components/CalendarButtons.tsx`
- Test: `src/components/picks.test.ts`

**Interfaces:**
- Consumes: localStorage key `lv-picks`
- Produces:
  - `usePicks(): { picks: string[]; toggle: (token: string) => void; clear: () => void }` — token format `<leagueSlug>:<eventId>`; backed by `useSyncExternalStore` so every subscribed component updates on change
  - `togglePick(token: string)`, `clearPicks()` — module-level, exported for tests
  - `SelectionTray` (client) — fixed bottom bar, hidden when nothing picked; links to `/api/cal/custom?ids=…`
  - `CalendarButtons({ path, label })` (client) — Subscribe (webcal), Google Calendar, Download links for a feed path like `/api/cal/league/premier-league.ics`

- [ ] **Step 1: Write the failing test** — `src/components/picks.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('picks store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  it('toggles a pick on and off, persisting to localStorage', async () => {
    const { togglePick } = await import('./picks')
    togglePick('premier-league:1')
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual(['premier-league:1'])
    togglePick('mls:9')
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual(['premier-league:1', 'mls:9'])
    togglePick('premier-league:1')
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual(['mls:9'])
  })

  it('clears all picks', async () => {
    const { togglePick, clearPicks } = await import('./picks')
    togglePick('mls:9')
    clearPicks()
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual([])
  })

  it('survives corrupt storage', async () => {
    window.localStorage.setItem('lv-picks', '{not json')
    const { togglePick } = await import('./picks')
    togglePick('mls:9')
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual(['mls:9'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/picks.test.ts`
Expected: FAIL — cannot resolve `./picks`

- [ ] **Step 3: Write `src/components/picks.ts`**

```ts
'use client'

import { useSyncExternalStore } from 'react'

const KEY = 'lv-picks'
const EMPTY: string[] = []

let cache: string[] | null = null
const listeners = new Set<() => void>()

function load(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(next: string[]) {
  cache = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — picks stay in memory
  }
  listeners.forEach((l) => l())
}

export function togglePick(token: string) {
  const current = cache ?? load()
  write(current.includes(token) ? current.filter((t) => t !== token) : [...current, token])
}

export function clearPicks() {
  write([])
}

export function usePicks() {
  const picks = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => {
      if (cache === null) cache = load()
      return cache
    },
    () => EMPTY,
  )
  return { picks, toggle: togglePick, clear: clearPicks }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/picks.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `src/components/SelectionTray.tsx`**

```tsx
'use client'

import { usePicks } from './picks'

export function SelectionTray() {
  const { picks, clear } = usePicks()
  if (picks.length === 0) return null
  const href = `/api/cal/custom?ids=${encodeURIComponent(picks.join(','))}`
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <span className="text-sm font-medium">
          {picks.length} game{picks.length === 1 ? '' : 's'} selected
        </span>
        <a
          href={href}
          download
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Download .ics
        </a>
        <button onClick={clear} className="text-sm text-slate-400 hover:text-slate-200">
          Clear
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `src/components/CalendarButtons.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'

export function CalendarButtons({ path, label }: { path: string; label: string }) {
  const [origin, setOrigin] = useState('')
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  const webcal = `${origin}${path}`.replace(/^https?:/, 'webcal:')
  const gcal = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-400">{label}:</span>
      <a href={webcal} className="btn">
        📅 Subscribe (Apple / Outlook)
      </a>
      <a href={gcal} target="_blank" rel="noreferrer" className="btn">
        Google Calendar
      </a>
      <a href={path} download className="btn-muted" title="One-time import — won't update if kickoff times change">
        Download .ics
      </a>
    </div>
  )
}
```

- [ ] **Step 7: Verify types and commit**

```bash
npx tsc --noEmit   # expect: clean
git add src/components/picks.ts src/components/picks.test.ts src/components/SelectionTray.tsx src/components/CalendarButtons.tsx
git commit -m "feat: match picks store, selection tray, calendar buttons"
```

---

### Task 13: Fixture UI components

**Files:**
- Create: `src/components/TeamLogo.tsx`, `src/components/FixtureCard.tsx`, `src/components/FixtureList.tsx`, `src/components/AutoRefresh.tsx`, `src/components/Section.tsx`
- Test: `src/components/FixtureCard.test.tsx`

**Interfaces:**
- Consumes: `useTz`, `usePicks`, `formatKickoff`/`dateKey`/`dateHeading`, `getLeague`, `Fixture`
- Produces:
  - `TeamLogo({ src, alt, size? })` — `next/image` with gray-circle fallback; works in server and client components
  - `FixtureCard({ fixture, pickable?, showLeague? })` (client) — logos, names, kickoff time or score, live highlight, postponed badge, pick toggle (scheduled games only), optional league chip
  - `FixtureList({ fixtures, pickable?, showLeague?, emptyMessage? })` (client) — groups by local date with headings
  - `AutoRefresh({ seconds })` (client) — `router.refresh()` on an interval, renders nothing
  - `Section({ title, children })` — plain server-safe section wrapper

- [ ] **Step 1: Write the failing test** — `src/components/FixtureCard.test.tsx`

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
  league: 'premier-league',
  kickoff: '2026-08-22T14:00:00.000Z',
  status: 'scheduled',
  statusDetail: '',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
}

describe('FixtureCard', () => {
  it('shows team names and kickoff time for a scheduled game', () => {
    render(<FixtureCard fixture={base} />)
    expect(screen.getByText('Liverpool')).toBeDefined()
    expect(screen.getByText('Everton')).toBeDefined()
    expect(screen.getByText('2:00 PM')).toBeDefined() // default tz is UTC
  })

  it('shows the score for a finished game', () => {
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
    expect(screen.getByText('2–1')).toBeDefined()
    expect(screen.getByText('FT')).toBeDefined()
  })

  it('shows a pick toggle only when pickable and scheduled', () => {
    render(<FixtureCard fixture={base} pickable />)
    expect(screen.getByRole('button', { name: /cal/i })).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/FixtureCard.test.tsx`
Expected: FAIL — cannot resolve `./FixtureCard`

- [ ] **Step 3: Write `src/components/TeamLogo.tsx`**

```tsx
import Image from 'next/image'

export function TeamLogo({ src, alt, size = 32 }: { src?: string; alt: string; size?: number }) {
  if (!src) {
    return <div style={{ width: size, height: size }} className="shrink-0 rounded-full bg-slate-800" />
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}
```

- [ ] **Step 4: Write `src/components/FixtureCard.tsx`**

```tsx
'use client'

import { getLeague } from '@/lib/leagues'
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
  const token = `${fixture.league}:${fixture.id}`
  const picked = picks.includes(token)
  const league = getLeague(fixture.league)
  const showScore = fixture.status === 'live' || fixture.status === 'final'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      {showLeague && league && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: `${league.accent}33`, color: league.accent }}
        >
          {league.shortName}
        </span>
      )}
      <div className="flex flex-1 items-center justify-end gap-2 text-right">
        <span className="truncate text-sm font-medium">{fixture.home.name}</span>
        <TeamLogo src={fixture.home.logo} alt={fixture.home.name} />
      </div>
      <div className="w-24 shrink-0 text-center">
        {showScore ? (
          <>
            <div className={`text-lg font-bold ${fixture.status === 'live' ? 'text-emerald-400' : ''}`}>
              {fixture.home.score ?? '-'}–{fixture.away.score ?? '-'}
            </div>
            <div className="text-xs text-slate-400">
              {fixture.status === 'live' ? `LIVE · ${fixture.statusDetail}` : fixture.statusDetail}
            </div>
          </>
        ) : fixture.status === 'postponed' ? (
          <div className="text-xs font-semibold uppercase text-amber-400">Postponed</div>
        ) : (
          <div className="text-lg font-semibold">{formatKickoff(fixture.kickoff, tz)}</div>
        )}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <TeamLogo src={fixture.away.logo} alt={fixture.away.name} />
        <span className="truncate text-sm font-medium">{fixture.away.name}</span>
      </div>
      {pickable && fixture.status === 'scheduled' && (
        <button
          onClick={() => toggle(token)}
          aria-pressed={picked}
          className={`shrink-0 rounded-md border px-2 py-1 text-xs ${
            picked
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
              : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          {picked ? '✓ Added' : '+ Cal'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/FixtureList.tsx`**

```tsx
'use client'

import { dateHeading, dateKey } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { FixtureCard } from './FixtureCard'
import { useTz } from './TimezoneProvider'

export function FixtureList({
  fixtures,
  pickable = false,
  showLeague = false,
  emptyMessage = 'No games to show.',
}: {
  fixtures: Fixture[]
  pickable?: boolean
  showLeague?: boolean
  emptyMessage?: string
}) {
  const { tz } = useTz()
  if (fixtures.length === 0) {
    return <p className="py-12 text-center text-slate-400">{emptyMessage}</p>
  }
  const groups: { key: string; heading: string; items: Fixture[] }[] = []
  for (const f of fixtures) {
    const key = dateKey(f.kickoff, tz)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(f)
    else groups.push({ key, heading: dateHeading(f.kickoff, tz), items: [f] })
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{g.heading}</h3>
          <div className="space-y-2">
            {g.items.map((f) => (
              <FixtureCard key={`${f.league}:${f.id}`} fixture={f} pickable={pickable} showLeague={showLeague} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Write `src/components/AutoRefresh.tsx` and `src/components/Section.tsx`**

```tsx
// src/components/AutoRefresh.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter()
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(timer)
  }, [router, seconds])
  return null
}
```

```tsx
// src/components/Section.tsx
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      {children}
    </section>
  )
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/components/FixtureCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
git add src/components
git commit -m "feat: fixture card/list, team logo, auto-refresh components"
```

---

### Task 14: App shell + home page

**Files:**
- Create: `src/components/LeagueNav.tsx`, `src/components/MyTeam.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (replace scaffold content)
- Delete: any scaffold demo assets no longer referenced (e.g. `src/app/favicon.ico` stays; `public/*.svg` demo files may be removed)

**Interfaces:**
- Consumes: `TimezoneProvider`, `TimezoneSelect`, `SelectionTray`, `FixtureList`, `AutoRefresh`, `Section`, `getScoreboardWindow`, `getSeasonFixtures`, `LEAGUES`
- Produces:
  - `LeagueNav` (client) — header nav, accent-highlighted active league
  - `MyTeamLink` (client) — ★ link to pinned team (reads `lv-myteam`, listens for `lv-myteam` window event); `PinTeamButton({ league, slug, name })` (client) — used by Task 16
  - Home page at `/` — Live now / Up next (24h) / Just finished sections from the scoreboard window; off-season fallback shows each league's next scheduled game; league cards grid

- [ ] **Step 1: Add button styles to `src/app/globals.css`** (append after the existing Tailwind import; keep whatever the scaffold generated above)

```css
@layer components {
  .btn {
    @apply rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700;
  }
  .btn-muted {
    @apply rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200;
  }
}
```

- [ ] **Step 2: Write `src/components/LeagueNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LEAGUES } from '@/lib/leagues'

export function LeagueNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LEAGUES.map((l) => {
        const active = pathname === `/${l.slug}` || pathname.startsWith(`/${l.slug}/`)
        return (
          <Link
            key={l.slug}
            href={`/${l.slug}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={active ? { backgroundColor: `${l.accent}33`, boxShadow: `inset 0 -2px 0 ${l.accent}` } : undefined}
          >
            {l.shortName}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: Write `src/components/MyTeam.tsx`**

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

export function MyTeamLink() {
  const [team, setTeam] = useState<MyTeam | null>(null)
  useEffect(() => {
    setTeam(read())
    const onChange = () => setTeam(read())
    window.addEventListener('lv-myteam', onChange)
    return () => window.removeEventListener('lv-myteam', onChange)
  }, [])
  if (!team) return null
  return (
    <Link href={`/${team.league}/${team.slug}`} className="whitespace-nowrap text-xs font-medium text-amber-300">
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
    <button onClick={togglePin} className="btn-muted">
      {pinned ? '★ My team' : '☆ Pin as my team'}
    </button>
  )
}
```

- [ ] **Step 4: Replace `src/app/layout.tsx`** (keep the scaffold's Geist font imports/variables)

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { LeagueNav } from '@/components/LeagueNav'
import { MyTeamLink } from '@/components/MyTeam'
import { SelectionTray } from '@/components/SelectionTray'
import { TimezoneProvider } from '@/components/TimezoneProvider'
import { TimezoneSelect } from '@/components/TimezoneSelect'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Leagueville — Soccer fixtures & calendars',
  description:
    'Fixtures, results, standings and squads for the Premier League, La Liga, Ligue 1, Brasileirão and MLS — with one-click calendar subscriptions.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-100 antialiased`}>
        <TimezoneProvider>
          <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
              <Link href="/" className="text-lg font-black tracking-tight">
                ⚽ Leagueville
              </Link>
              <LeagueNav />
              <div className="ml-auto flex items-center gap-3">
                <MyTeamLink />
                <TimezoneSelect />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6 pb-24">{children}</main>
          <SelectionTray />
          <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
            Data from ESPN and TheSportsDB. Not affiliated with any league or club.
          </footer>
        </TimezoneProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Replace `src/app/page.tsx`**

```tsx
import Link from 'next/link'
import { AutoRefresh } from '@/components/AutoRefresh'
import { FixtureList } from '@/components/FixtureList'
import { Section } from '@/components/Section'
import { getScoreboardWindow, getSeasonFixtures } from '@/lib/data/fixtures'
import { LEAGUES } from '@/lib/leagues'
import type { Fixture } from '@/lib/types'

export default async function Home() {
  const windows = await Promise.all(LEAGUES.map((l) => getScoreboardWindow(l).catch(() => [])))
  const all = windows.flat().sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  const now = Date.now()

  const live = all.filter((f) => f.status === 'live')
  const upcoming = all.filter((f) => f.status === 'scheduled')
  const recent = all.filter((f) => f.status === 'final' && new Date(f.kickoff).getTime() > now - 12 * 3600_000)

  let nextUp: Fixture[] = []
  if (live.length + upcoming.length + recent.length === 0) {
    const seasons = await Promise.all(LEAGUES.map((l) => getSeasonFixtures(l).catch(() => [])))
    nextUp = seasons
      .map((fx) => fx.find((f) => f.status === 'scheduled'))
      .filter((f): f is Fixture => f !== undefined)
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  }

  return (
    <div className="space-y-10">
      {live.length > 0 && (
        <>
          <AutoRefresh seconds={60} />
          <Section title="Live now">
            <FixtureList fixtures={live} showLeague />
          </Section>
        </>
      )}
      {upcoming.length > 0 && (
        <Section title="Up next">
          <FixtureList fixtures={upcoming} pickable showLeague />
        </Section>
      )}
      {recent.length > 0 && (
        <Section title="Just finished">
          <FixtureList fixtures={recent} showLeague />
        </Section>
      )}
      {nextUp.length > 0 && (
        <Section title="Next up in each league">
          <FixtureList fixtures={nextUp} pickable showLeague />
        </Section>
      )}
      <Section title="Leagues">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEAGUES.map((l) => (
            <Link
              key={l.slug}
              href={`/${l.slug}`}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600"
              style={{ borderTop: `3px solid ${l.accent}` }}
            >
              <div className="font-bold">{l.name}</div>
              <div className="text-xs text-slate-400">Fixtures · Results · Table · Teams</div>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}
```

- [ ] **Step 6: Verify in the browser**

```bash
npm run dev
```

Open http://localhost:3000 — expect the dark shell with header nav, at least one fixtures section (or the off-season "Next up in each league"), and the leagues grid. Times shown match your timezone; changing the timezone dropdown re-renders times.

- [ ] **Step 7: Lint, typecheck, commit**

```bash
npm run lint && npx tsc --noEmit
git add -A
git commit -m "feat: app shell and home page with live window"
```

---

### Task 15: League page (tabs: fixtures, results, table, teams)

**Files:**
- Create: `src/app/[league]/page.tsx`, `src/components/StandingsTable.tsx`, `src/components/TeamGrid.tsx`

**Interfaces:**
- Consumes: `getLeague`, `getSeasonFixtures`, `getStandings`, `getTeams`, `FixtureList`, `CalendarButtons`, `TeamLogo`
- Produces:
  - `/[league]?tab=fixtures|results|table|teams` (default `fixtures`)
  - `StandingsTable({ group, leagueSlug, showName })` — server-safe table, rows link to team pages
  - `TeamGrid({ teams, leagueSlug })` — server-safe logo grid linking to team pages

- [ ] **Step 1: Write `src/components/StandingsTable.tsx`**

```tsx
import Link from 'next/link'
import type { StandingsGroup } from '@/lib/types'
import { TeamLogo } from './TeamLogo'

export function StandingsTable({
  group,
  leagueSlug,
  showName = false,
}: {
  group: StandingsGroup
  leagueSlug: string
  showName?: boolean
}) {
  return (
    <div>
      {showName && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{group.name}</h3>}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-2 py-2 text-center">P</th>
              <th className="px-2 py-2 text-center">W</th>
              <th className="px-2 py-2 text-center">D</th>
              <th className="px-2 py-2 text-center">L</th>
              <th className="px-2 py-2 text-center">GF</th>
              <th className="px-2 py-2 text-center">GA</th>
              <th className="px-2 py-2 text-center">GD</th>
              <th className="px-2 py-2 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((r) => (
              <tr key={r.teamId} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60">
                <td className="px-3 py-2 text-slate-400">{r.rank}</td>
                <td className="px-3 py-2">
                  <Link href={`/${leagueSlug}/${r.teamSlug}`} className="flex items-center gap-2 hover:underline">
                    <TeamLogo src={r.logo} alt={r.teamName} size={20} />
                    <span className="font-medium">{r.teamName}</span>
                  </Link>
                </td>
                <td className="px-2 py-2 text-center text-slate-300">{r.played}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.wins}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.draws}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.losses}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.goalsFor}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.goalsAgainst}</td>
                <td className="px-2 py-2 text-center text-slate-300">
                  {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                </td>
                <td className="px-2 py-2 text-center font-bold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/TeamGrid.tsx`**

```tsx
import Link from 'next/link'
import type { Team } from '@/lib/types'
import { TeamLogo } from './TeamLogo'

export function TeamGrid({ teams, leagueSlug }: { teams: Team[]; leagueSlug: string }) {
  if (teams.length === 0) return <p className="py-12 text-center text-slate-400">Teams unavailable right now.</p>
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {teams.map((t) => (
        <Link
          key={t.id}
          href={`/${leagueSlug}/${t.slug}`}
          className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600"
        >
          <TeamLogo src={t.logo} alt={t.name} size={48} />
          <span className="text-center text-sm font-medium">{t.name}</span>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/app/[league]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarButtons } from '@/components/CalendarButtons'
import { FixtureList } from '@/components/FixtureList'
import { StandingsTable } from '@/components/StandingsTable'
import { TeamGrid } from '@/components/TeamGrid'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { getStandings } from '@/lib/data/standings'
import { getTeams } from '@/lib/data/teams'
import { getLeague } from '@/lib/leagues'

const TABS = [
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'results', label: 'Results' },
  { key: 'table', label: 'Table' },
  { key: 'teams', label: 'Teams' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { league: slug } = await params
  const league = getLeague(slug)
  if (!league) notFound()
  const sp = await searchParams
  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : 'fixtures'

  let content: React.ReactNode
  if (tab === 'fixtures') {
    const fixtures = (await getSeasonFixtures(league).catch(() => [])).filter((f) => f.status !== 'final')
    content = (
      <FixtureList
        fixtures={fixtures}
        pickable
        emptyMessage="Off-season — fixtures for the new season will appear here once published."
      />
    )
  } else if (tab === 'results') {
    const results = (await getSeasonFixtures(league).catch(() => []))
      .filter((f) => f.status === 'final')
      .reverse()
    content = <FixtureList fixtures={results} emptyMessage="No results yet this season." />
  } else if (tab === 'table') {
    const groups = await getStandings(league).catch(() => [])
    content =
      groups.length > 0 ? (
        <div className="space-y-8">
          {groups.map((g) => (
            <StandingsTable key={g.name} group={g} leagueSlug={league.slug} showName={groups.length > 1} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-slate-400">Standings unavailable right now.</p>
      )
  } else {
    const teams = await getTeams(league).catch(() => [])
    content = <TeamGrid teams={teams} leagueSlug={league.slug} />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-black" style={{ borderLeft: `4px solid ${league.accent}`, paddingLeft: 12 }}>
          {league.name}
        </h1>
        <CalendarButtons path={`/api/cal/league/${league.slug}.ics`} label="League calendar" />
      </div>
      <div className="flex gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/${league.slug}?tab=${t.key}`}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={tab === t.key ? { boxShadow: `inset 0 2px 0 ${league.accent}` } : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {content}
    </div>
  )
}
```

- [ ] **Step 4: Verify in the browser**

```bash
npm run dev
```

Check http://localhost:3000/premier-league (all four tabs), http://localhost:3000/mls?tab=table (expect Eastern + Western Conference tables), and http://localhost:3000/brasileirao?tab=teams (expect 20 logos). Check a bad slug 404s: http://localhost:3000/serie-a

- [ ] **Step 5: Lint, typecheck, commit**

```bash
npm run lint && npx tsc --noEmit
git add -A
git commit -m "feat: league page with fixtures/results/table/teams tabs"
```

---

### Task 16: Team page (header, bio, fixtures, squad, history)

**Files:**
- Create: `src/lib/format.ts`, `src/components/SquadTable.tsx`, `src/app/[league]/[team]/page.tsx`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: `getLeague`, `findTeam`, `getSeasonFixtures`, `getRoster`, `getTeamBio`, `getSeasonHistory`, `getStandings`, `FixtureList`, `CalendarButtons`, `PinTeamButton`, `Section`, `TeamLogo`, `League`
- Produces:
  - `ordinal(n: number): string` — `1st`, `2nd`, `3rd`, `11th`, `21st`
  - `seasonLabel(league: League, startYear: number): string` — cross-year `2024–25`, calendar-year `2024`
  - `SquadTable({ players })` — position-grouped squad table with nationality flags
  - `/[league]/[team]` page

- [ ] **Step 1: Write the failing test** — `src/lib/format.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { ordinal, seasonLabel } from './format'
import { getLeague } from './leagues'

describe('ordinal', () => {
  it('handles standard suffixes', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
  })
  it('handles the teens', () => {
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
  })
  it('handles twenty-plus', () => {
    expect(ordinal(21)).toBe('21st')
    expect(ordinal(22)).toBe('22nd')
    expect(ordinal(101)).toBe('101st')
  })
})

describe('seasonLabel', () => {
  it('formats cross-year seasons', () => {
    expect(seasonLabel(getLeague('premier-league')!, 2024)).toBe('2024–25')
    expect(seasonLabel(getLeague('la-liga')!, 1999)).toBe('1999–00')
  })
  it('formats calendar-year seasons', () => {
    expect(seasonLabel(getLeague('mls')!, 2024)).toBe('2024')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — cannot resolve `./format`

- [ ] **Step 3: Write `src/lib/format.ts`**

```ts
import type { League } from './leagues'

export function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`
}

export function seasonLabel(league: League, startYear: number): string {
  if (league.seasonType === 'calendar-year') return String(startYear)
  return `${startYear}–${String((startYear + 1) % 100).padStart(2, '0')}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Write `src/components/SquadTable.tsx`**

```tsx
import Image from 'next/image'
import type { Player } from '@/lib/types'

const POSITION_SECTIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Other'] as const

function positionKey(p: Player): (typeof POSITION_SECTIONS)[number] {
  return (POSITION_SECTIONS as readonly string[]).includes(p.position ?? '')
    ? (p.position as (typeof POSITION_SECTIONS)[number])
    : 'Other'
}

export function SquadTable({ players }: { players: Player[] }) {
  if (players.length === 0) return <p className="py-12 text-center text-slate-400">Squad unavailable right now.</p>
  const sections = POSITION_SECTIONS.map((pos) => ({
    pos,
    members: players.filter((p) => positionKey(p) === pos),
  })).filter((s) => s.members.length > 0)

  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <div key={s.pos}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{s.pos}s</h3>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <tbody>
                {s.members.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 last:border-0">
                    <td className="w-10 px-3 py-2 text-right font-mono text-slate-500">{p.jersey ?? '—'}</td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-slate-400">{p.age ? `${p.age} yrs` : ''}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2 text-slate-300">
                        {p.flag && (
                          <Image src={p.flag} alt={p.nationality ?? ''} width={16} height={12} className="h-3 w-4 object-cover" />
                        )}
                        {p.nationality ?? ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Write `src/app/[league]/[team]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { CalendarButtons } from '@/components/CalendarButtons'
import { FixtureList } from '@/components/FixtureList'
import { PinTeamButton } from '@/components/MyTeam'
import { Section } from '@/components/Section'
import { SquadTable } from '@/components/SquadTable'
import { TeamLogo } from '@/components/TeamLogo'
import { getTeamBio } from '@/lib/data/bio'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { getRoster } from '@/lib/data/roster'
import { getSeasonHistory, getStandings } from '@/lib/data/standings'
import { findTeam } from '@/lib/data/teams'
import { ordinal, seasonLabel } from '@/lib/format'
import { getLeague } from '@/lib/leagues'

export default async function TeamPage({
  params,
}: {
  params: Promise<{ league: string; team: string }>
}) {
  const { league: leagueSlug, team: teamSlug } = await params
  const league = getLeague(leagueSlug)
  if (!league) notFound()
  const team = await findTeam(league, teamSlug).catch(() => undefined)
  if (!team) notFound()

  const [fixtures, roster, bio, history, standings] = await Promise.all([
    getSeasonFixtures(league).catch(() => []),
    getRoster(league, team.id).catch(() => []),
    getTeamBio(league, team.id),
    getSeasonHistory(league, team.id).catch(() => []),
    getStandings(league).catch(() => []),
  ])

  const mine = fixtures.filter((f) => f.home.id === team.id || f.away.id === team.id)
  const upcoming = mine.filter((f) => f.status !== 'final')
  const results = mine.filter((f) => f.status === 'final').reverse()

  let position: string | undefined
  for (const g of standings) {
    const row = g.rows.find((r) => r.teamId === team.id)
    if (row) {
      position = `${ordinal(row.rank)}${standings.length > 1 ? ` in ${g.name}` : ''} · ${row.points} pts`
      break
    }
  }

  const bioParagraphs = bio?.description?.split(/\r?\n\r?\n/).filter(Boolean) ?? []

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <TeamLogo src={team.logo} alt={team.name} size={72} />
          <div>
            <h1 className="text-3xl font-black">{team.name}</h1>
            <p className="text-sm text-slate-400">
              {[bio?.stadium, bio?.founded ? `Founded ${bio.founded}` : undefined, position]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="ml-auto">
            <PinTeamButton league={league.slug} slug={team.slug} name={team.shortName} />
          </div>
        </div>
        <CalendarButtons path={`/api/cal/team/${league.slug}/${team.slug}.ics`} label={`${team.shortName} calendar`} />
        {bioParagraphs.length > 0 && (
          <div className="max-w-3xl text-sm leading-relaxed text-slate-300">
            <p>{bioParagraphs[0]}</p>
            {bioParagraphs.length > 1 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-200">Read more</summary>
                <div className="mt-2 space-y-2">
                  {bioParagraphs.slice(1).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      <Section title="Upcoming">
        <FixtureList fixtures={upcoming} pickable emptyMessage="No upcoming games scheduled." />
      </Section>

      <Section title="Results">
        <FixtureList fixtures={results} emptyMessage="No results yet this season." />
      </Section>

      <Section title="Squad">
        <SquadTable players={roster} />
      </Section>

      {history.length > 0 && (
        <Section title="Season history">
          <ul className="divide-y divide-slate-800/50 overflow-hidden rounded-xl border border-slate-800 text-sm">
            {history.map((h) => (
              <li key={h.season} className="flex items-center gap-4 px-4 py-2.5">
                <span className="w-20 font-mono text-slate-400">{seasonLabel(league, h.season)}</span>
                <span className="font-semibold">{ordinal(h.rank)}</span>
                {h.group && <span className="text-slate-400">{h.group}</span>}
                <span className="ml-auto text-slate-300">{h.points} pts</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Verify in the browser**

```bash
npm run dev
```

Check http://localhost:3000/premier-league/arsenal — expect logo header, bio with "Read more", calendar buttons, upcoming/results, position-grouped squad with flags, and season history rows. Check an MLS team (http://localhost:3000/mls/atlanta-united-fc) shows conference in position line and history. Pin a team → ★ appears in header; navigate elsewhere and confirm the ★ link persists. Bad team slug 404s.

- [ ] **Step 8: Lint, typecheck, commit**

```bash
npm run lint && npx tsc --noEmit
git add -A
git commit -m "feat: team page with bio, squad, history, and team calendar"
```

---

### Task 17: Final verification + README

**Files:**
- Create: `README.md` (replace scaffold README)

**Interfaces:**
- Consumes: everything
- Produces: verified, documented v1

- [ ] **Step 1: Full test, lint, build**

```bash
npm test          # expect: all suites pass
npm run lint      # expect: clean
npm run build     # expect: compiled successfully, all routes listed
```

- [ ] **Step 2: End-to-end calendar check**

```bash
npm run dev &
sleep 5
curl -s "http://localhost:3000/api/cal/league/premier-league.ics" | head -20
# expect: BEGIN:VCALENDAR, X-WR-CALNAME:Premier League — Leagueville, VEVENTs with DTSTART
curl -s "http://localhost:3000/api/cal/custom" -o /dev/null -w "%{http_code}\n"
# expect: 400
```

Also import the downloaded `.ics` into a calendar app (or an online iCalendar validator) once, manually, to confirm it parses.

- [ ] **Step 3: Write `README.md`**

```markdown
# ⚽ Leagueville

Fixtures, results, standings and squads for the **Premier League, La Liga,
Ligue 1, Brasileirão and MLS** — with one-click calendar export.

## Features

- Full season fixtures & results per league, kickoff times in *your* timezone
  (auto-detected, overridable in the header)
- Live scores for in-progress games (auto-refreshing Today view)
- League tables (incl. MLS conferences) and team pages: club bio, squad,
  season history
- **Calendar export** at three levels:
  - Subscribe to a whole league (`webcal://` — self-updates when kickoff
    times change)
  - Subscribe to one team
  - Hand-pick games with the checkboxes and download a custom `.ics`
- Pin a "my team" shortcut in the header

## Running

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # unit tests (Vitest)
npm run build  # production build
```

## Notes

- Data comes from ESPN's public (unofficial) API, plus TheSportsDB for club
  bios. Everything is fetched server-side through Next.js's data cache —
  there is no database and visitors never hit the upstream APIs directly.
- Google Calendar's "subscribe" button requires a publicly reachable URL, so
  it only works once deployed (Vercel). Webcal subscribe and `.ics` download
  work locally.
- Kickoff times for games months away are provisional until broadcasters
  finalize them — subscribed calendars update automatically.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README for Leagueville v1"
```

---

## Plan Self-Review Notes

- **Spec coverage:** data layer (Tasks 4–8) ✅; calendar system incl. subscribe/download/custom picks (Tasks 9, 10, 12) ✅; timezone auto-detect + manual override (Task 11) ✅; site structure home/league/team with tabs (Tasks 14–16) ✅; light live scores via 60s scoreboard revalidate + AutoRefresh (Tasks 4, 13, 14) ✅; my-team pin (Tasks 14, 16) ✅; off-season empty states (Tasks 14, 15) ✅; testing strategy (normalizers, ics, time, picks, card smoke) ✅.
- **Spec deviations (intentional, minor):** team slug→ID mapping is resolved at runtime from the cached teams list instead of a generated lookup file (simpler, no drift); ICS description carries league name + final score rather than matchday (ESPN's soccer scoreboard doesn't reliably expose rounds).
- **Type consistency:** `Fixture`/`Team`/`StandingRow`/`Player`/`TeamBio`/`SeasonFinish` defined once in Task 3 and imported everywhere; function names cross-checked across tasks (`getSeasonFixtures`, `getScoreboardWindow`, `findTeam`, `getStandings`, `getSeasonHistory`, `getRoster`, `getTeamBio`, `buildIcs`, `fixturesToCalEvents`, `usePicks`, `useTz`).

