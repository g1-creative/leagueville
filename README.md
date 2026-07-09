# ⚽ Leagueville

Fixtures, results, standings and squads for the **Premier League, La Liga,
Ligue 1, Brasileirão and MLS** — with one-click calendar export.

## Features

- Full season fixtures & results per league, kickoff times in *your* timezone
  (auto-detected, overridable in the header)
- Live scores for in-progress games (auto-refreshing Today view)
- **Calendar view** (`/calendar`) — every league's games in a month, week or
  day layout, in your timezone. Filter by league or by your pinned team;
  click a game for its own page, or hit `+` to drop it straight into Apple
  Calendar, Outlook or Google Calendar
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
