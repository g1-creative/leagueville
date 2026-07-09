# Leagueville — Design Spec

**Date:** 2026-07-08
**Status:** Approved pending user review

## What it is

A public website for browsing soccer fixtures, results, standings, teams, and squads
across five leagues — Premier League, La Liga, Ligue 1, Brasileirão, and MLS — with
first-class calendar export: subscribe to a league or team, or hand-pick matches, and
get the games in Apple Calendar or Google Calendar.

## Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Data source | ESPN unofficial API (verified live: fixtures, standings, rosters, logos for all 5 leagues) + TheSportsDB free tier for club bio text and artwork only |
| Hosting | Vercel free tier |
| Persistence | No database — Next.js data cache is the store; ESPN is the source of truth |
| Calendar granularity | League-level, team-level, and hand-picked matches |
| Live scores | Light: Today view refreshes ~60s for in-progress games; no per-match event feeds (v2) |
| Timezone | Auto-detect from browser, manual override selector, persisted in localStorage |
| Name | Leagueville |

## Leagues

| League | ESPN slug | Teams (verified) |
|---|---|---|
| Premier League | `eng.1` | 20 |
| La Liga | `esp.1` | 20 |
| Ligue 1 | `fra.1` | 18 |
| Brasileirão | `bra.1` | 20 |
| MLS | `usa.1` | 30 |

## Architecture

Single Next.js 15 (App Router) + TypeScript + Tailwind CSS project deployed on Vercel.

- Server components render from a cached data layer; visitors never hit ESPN directly.
- Next.js fetch cache with per-endpoint `revalidate` intervals is the only "store."
- Stale-while-revalidate: if ESPN errors, last cached copy is served with a subtle
  "last updated X ago" indicator — never an error page for data hiccups.
- Total upstream traffic is a few dozen requests per revalidation window regardless of
  visitor count.

### Site structure

```
/                      Home: today & upcoming across all leagues, live scores
/[league]              League page with inner tabs:
   Fixtures            upcoming, grouped by matchday/date, calendar checkboxes
   Results             completed games, most recent first
   Table               standings: pos, W/D/L, GD, pts, logos
   Teams               logo grid → team pages
/[league]/[team]       Team page: logo, bio (TheSportsDB), stadium; fixtures &
                       results; squad (position, number, age, nationality flag);
                       season history; "Add to calendar" for this team
```

League/team slugs (`/premier-league/arsenal`) map to ESPN IDs via a small generated
lookup table checked into the repo.

### Data layer (`lib/data/`)

The only module that knows ESPN/TheSportsDB exist. Raw responses are normalized into
our own types (`Fixture`, `Team`, `StandingRow`, `Player`) so upstream shape changes
are fixed in one file.

| Function | Source | Revalidate |
|---|---|---|
| `getTeams(league)` | ESPN `/teams` | 24 h |
| `getSeasonFixtures(league)` | ESPN `/scoreboard?dates=<season range>` | 6 h |
| `getStandings(league)` | ESPN `/standings` | 1 h |
| `getScoreboard(league, today)` | ESPN `/scoreboard?dates=<today>` | 60 s |
| `getRoster(league, team)` | ESPN `/teams/{id}/roster` | 24 h |
| `getTeamSchedule(league, team)` | ESPN `/teams/{id}/schedule` | 6 h |
| `getTeamBio(team)` | TheSportsDB `lookupteam` | 7 d |

### Calendar system

Route handlers serving standards-compliant iCalendar:

- `/api/cal/league/[league].ics` — whole league season
- `/api/cal/team/[league]/[team].ics` — one club's games
- `/api/cal/custom?ids=…` — hand-picked games

Event format: title `Home vs Away ⚽`, UTC `DTSTART` (calendar apps localize),
venue as `LOCATION`, 2-hour duration, league + matchday in `DESCRIPTION`, stable
`UID` from ESPN event ID so re-fetches update rather than duplicate.

Offered two ways in the UI:
1. **Subscribe** (primary): `webcal://` link; Google also gets a one-click
   `calendar.google.com/render?cid=…` deep link. Subscriptions self-heal when
   broadcasters move kickoff times.
2. **One-time download**: same `.ics` as a file, labeled "won't update if times
   change."

Hand-picked flow: checkboxes on fixture cards feed a selection tray ("4 games
selected → Add to calendar"); selection persists in localStorage across tabs.
Custom picks are download-only (a subscribable custom feed would require a DB).

### Timezone handling

ESPN times are UTC. Kickoffs render in the visitor's timezone: auto-detected from the
browser, overridable via a timezone selector, persisted in localStorage, applied
everywhere times appear. Calendar exports always carry UTC timestamps.

### UX details

- Dark, broadcast-style aesthetic; big fixture cards with both club logos and kickoff
  time as the hero element; per-league accent colors.
- League switcher remembers last league; "my team" quick-pin via localStorage
  (no accounts).
- Off-season empty states: "Season starts <date>" with next season's fixtures —
  never a blank page (European leagues are dark June–August).
- Fully responsive; phone is the primary fixture-checking device.

## Known data gaps (accepted)

- No player headshot photos (nationality flags only).
- Club prose history comes from TheSportsDB free tier; if missing for a club, the
  team page simply omits the bio section.
- ESPN API is unofficial and could change; the normalizer layer and cache-serving
  keep the blast radius to one module.

## Testing

- **Vitest unit tests** for the silent-failure surfaces: ESPN→domain normalizers
  (fixture parsing, timezone math) and the `.ics` generator (spec-compliant output —
  malformed files fail silently in Google Calendar).
- Smoke test for page rendering; no coverage-chasing on presentational components.

## Out of scope (v2 candidates)

- Per-match live event feeds (goals, cards, subs)
- User accounts / server-persisted preferences
- Subscribable feeds for hand-picked selections (needs a DB)
- More leagues
