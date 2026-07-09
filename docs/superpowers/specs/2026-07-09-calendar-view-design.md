# Calendar view — design

A `/calendar` route showing every game across all five leagues in a month,
week, or day layout. Each game links to a new per-game page, and every game
carries a `+` that adds it to the viewer's real calendar.

## Goals

- Browse the whole season visually rather than as the flat lists the
  Fixtures tab already provides.
- One or two taps from seeing a game to having it in Apple Calendar,
  Outlook, or Google Calendar — without the picks tray.
- Every view is a shareable, server-rendered URL.

## Non-goals

- Drag-selecting a date range to bulk-add games. The picks tray already
  covers batching.
- A time-axis week grid. Kickoffs cluster in a narrow band and simultaneous
  kickoffs are common, so overlap layout buys nothing.
- Any new upstream data. Everything renders from the `Fixture` objects
  `getSeasonFixtures` already returns.

## URL shape

All state lives in the query string of `/calendar`:

| Param | Values | Default |
|---|---|---|
| `view` | `month` \| `week` \| `day` | `month` |
| `d` | `YYYY-MM-DD` anchor date | today (UTC) |
| `leagues` | comma-separated league slugs | all |
| `myteam` | `1` | absent |

A single anchor date drives all three views: month is the anchor's month,
week is the anchor's Sunday–Saturday, day is the anchor. Prev/next arrows
shift the anchor by one month, week, or day according to `view`, so
switching views keeps the viewer on the same date. Arrows are `<Link>`s and
clamp to the season bounds (below).

Invalid `d` or `view` values fall back to the defaults rather than 404ing.

## Data

`/calendar/page.tsx` is a server component. It fetches all five leagues in
parallel with `getSeasonFixtures(league).catch(() => [])`, matching the
existing pattern in `app/page.tsx`. Those calls are `unstable_cache`'d for
six hours, so a month render costs no upstream requests in the common case.

It then slices the fixtures to the UTC span of the active view **± 1 day**
and passes that array to the client. The margin covers the full UTC−12 to
UTC+14 range: a fixture at a view boundary can shift at most one calendar
day in either direction.

**Season bounds.** The prev/next arrows clamp to the union of the five
`seasonRange(league, new Date())` results — the Premier League, La Liga and
Ligue 1 are cross-year (Aug–Jun) while MLS and Brasileirão are calendar-year
(Jan–Dec), so the union spans the earliest start to the latest end. Months
inside the union with no games render an empty grid with a "No games this
month" note; the arrows disable at the edges.

## Timezone

Which calendar day a game falls on depends on the viewer's timezone, and
that is only known client-side via `TimezoneProvider`. So the grid is a
client component: it buckets the server-supplied fixtures with the existing
`dateKey(iso, tz)` and discards any key outside the visible span. This is
the same split `FixtureList` already uses, and it means the server never
needs to know the viewer's zone.

## Views

### Month

A 7×6 grid — six week rows so every month fits without a reflow, with
adjacent-month days dimmed. Today's cell gets a ring. Weeks run
Sunday–Saturday in both the month grid and the week view, consistent with
the `en-US` locale the app already formats dates in.

At `sm:` and up, each cell shows up to **three** game chips (a league-accent
dot, `ARS–CHE`, kickoff time) and, when there are more, a `+N more` link.
Below `sm:`, a cell collapses to the date, one accent dot per league with
games that day, and a game count — three chips do not fit a 375px-wide
column.

Clicking anywhere in a day cell (not just `+N more`) opens the **day
panel**: a list of every game that day, each row showing the league dot,
kickoff, both crests and names, and a `+`. The row body links to the game
page.

### Week

Seven day-columns, each a chronological stack of the same game-row component
the day panel uses. Empty days show a dim `—`. No time axis and no overlap
math; games are simply ordered.

Below `sm:`, `view=week` renders the day column full-width with a
seven-chip date strip above it for tapping between days. The segmented
control still reads "Week", so the control and the URL never disagree.

### Day

The single day column at full width, with the date as a heading.

## Filters

A row of five toggleable league chips, accent-colored, all on by default,
plus a `★ My team` chip. Filtering happens client-side over the fixtures
already in the payload — no refetch. Chip state is written to the URL so a
filtered view is shareable and survives refresh.

**My team wins.** When `myteam=1`, the league chips gray out and the
predicate is:

```
f.league === myTeam.league &&
  (slugify(f.home.name) === myTeam.slug || slugify(f.away.name) === myTeam.slug)
```

This works with no extra fetch because `Team.slug` is `slugify(displayName)`
and a `FixtureSide.name` is that same `displayName`.

The pinned team lives in `localStorage` under `lv-myteam`, so the chip
appears only after hydration, exactly as `MyTeamLink` does today. If
`myteam=1` arrives with nothing pinned, the filter is ignored and all games
show — never an empty grid.

## Add to calendar

The `+` button opens a small popover with two choices:

- **Apple / Outlook (.ics)** → `/api/cal/game/[league]/[id].ics`, served
  `Content-Disposition: attachment` so the OS hands it to the calendar app.
- **Google Calendar** → a `calendar.google.com/calendar/render?action=TEMPLATE`
  deep link built from the same event.

The popover closes on Escape, on outside click, and on route change.

Finished games get a `+` too; `fixturesToCalEvents` already appends
`— FT 2–1` to the description, so the route needs no status branch.
Postponed games get no `+`, since they have no reliable kickoff —
`fixturesToCalEvents` already drops them.

## Game page

New route `/[league]/game/[id]`. No conflict with `/[league]/[team]`, which
matches a single segment. It looks the fixture up in that league's season
list and calls `notFound()` if absent.

Contents: both crests and names, kickoff in the viewer's timezone, venue,
the score and status detail when live or final, links to both team pages,
and the existing `CalendarButtons` row.

## Navigation

`Calendar` becomes a sixth pill in `LeagueNav`, after a thin divider, active
when `pathname === '/calendar'`.

Filter chips, view switcher, and month arrows are all `<Link>`s. The
calendar therefore works without JavaScript except for the day panel and the
`+` popover.

## New modules

| Module | Purpose |
|---|---|
| `src/lib/calendar.ts` | `parseAnchor`, `shiftAnchor(anchor, view, delta)`, `monthGridKeys(y, m)` → 42 `YYYY-MM-DD` keys, `weekKeys(anchor)`, `seasonDayBounds()`, `viewSpan(anchor, view)` → UTC `{from, to}` |
| `src/lib/ics.ts` (addition) | `googleCalendarUrl(event: CalEvent): string` — same `CalEvent` shape `buildIcs` consumes |
| `src/app/calendar/page.tsx` | Server component: parse params, fetch, slice, render |
| `src/app/[league]/game/[id]/page.tsx` | Game page |
| `src/app/api/cal/game/[league]/[id]/route.ts` | Single-event `.ics` |
| `src/components/CalendarView.tsx` | Client shell: view switcher, filter chips, day-panel state |
| `src/components/MonthGrid.tsx` | 7×6 grid, chips, `+N more`, mobile dot mode |
| `src/components/DayColumn.tsx` | Chronological game-row stack; used by week, day, and the day panel |
| `src/components/GameRow.tsx` | One game: dot, time, crests, names, `+` |
| `src/components/AddToCalendarMenu.tsx` | The `+` popover |

`src/lib/calendar.ts` is pure and date-arithmetic-only, which keeps the
tricky parts (month rollover, week boundaries, season clamping) testable
without rendering.

## Tests

- `calendar.test.ts` — grid keys across month rollover and leap years, week
  boundaries, anchor shifting per view, season clamping.
- `ics.test.ts` (additions) — `googleCalendarUrl` encoding and the
  `dates=start/end` format.
- `api/cal/game/[league]/[id]/route.test.ts` — hit, unknown league, unknown
  id, upstream failure. Mirrors the existing league route test.
- `MonthGrid.test.tsx` — buckets fixtures into the right cells for a
  non-UTC timezone, caps at three chips, renders `+N more` with the right
  count.
- `CalendarView.test.tsx` — league filter and my-team filter predicates;
  my-team with nothing pinned shows everything.

## Risks

- **Off-season emptiness.** Between late June and early August the
  cross-year leagues have published nothing and the calendar-year leagues
  are mid-season, so months look sparse. The empty-month copy should say
  "No games this month" rather than implying an error, mirroring the
  existing off-season message on the Fixtures tab.
- **Provisional kickoffs.** Games months out have placeholder times, so a
  one-time `.ics` add can go stale. The game page keeps the league/team
  subscribe buttons, which self-update; the `+` is for near-term games.
