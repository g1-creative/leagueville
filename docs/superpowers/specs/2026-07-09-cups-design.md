# Leagueville — Cups Design Spec

**Date:** 2026-07-09
**Status:** Approved pending user review

## What it is

Cup competitions become first-class alongside the five leagues: a browsable `/cups`
section covering eleven domestic and continental cups, and — the reason the feature
exists — cup fixtures merged into team pages and team calendar exports.

Today, subscribing to Arsenal's calendar returns 38 Premier League games. Arsenal play
roughly 55. The missing games are the FA Cup, EFL Cup, and Champions League nights that
subscribers most want to be told about. A `/cups` browse page alone would not fix that,
which is why the team-page merge is in scope rather than deferred.

## Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Placement | Top-level `/cups` browse section **and** cup fixtures merged into team pages + team `.ics` |
| Scope | Europe + domestic cups for existing leagues + South American continental |
| Cup page contents | Fixtures, Results, Table (when the competition has one), Teams. No bracket in v1. |
| Data model | Widen `LeagueSlug` → `CompetitionSlug`; one flat union with a `kind` discriminator |
| International football | Out of scope. National teams break the `Team` model — separate spec. |
| Two-legged ties | Rendered as two independent fixtures. Tie aggregation deferred to the bracket spec. |

## Competitions

Eleven cups, all verified live against ESPN on 2026-07-09.

| Competition | ESPN slug | Region | Season type | Group/league phase |
|---|---|---|---|---|
| Champions League | `uefa.champions` | europe | cross-year | Yes (`League Phase`) |
| Europa League | `uefa.europa` | europe | cross-year | Yes |
| Conference League | `uefa.europa.conf` | europe | cross-year | Yes |
| FA Cup | `eng.fa` | england | cross-year | No |
| EFL Cup | `eng.league_cup` | england | cross-year | No |
| Copa del Rey | `esp.copa_del_rey` | spain | cross-year | No |
| Coupe de France | `fra.coupe_de_france` | france | cross-year | No |
| US Open Cup | `usa.open` | usa | calendar-year | No |
| Leagues Cup | `concacaf.leagues.cup` | usa | calendar-year | Yes |
| Copa Libertadores | `conmebol.libertadores` | south-america | calendar-year | Yes (8 groups) |
| Copa Sudamericana | `conmebol.sudamericana` | south-america | calendar-year | Yes |

**Copa do Brasil is not available.** ESPN does not expose it under any slug — six variants
and ESPN's own competition index were checked. Brazilian clubs therefore get Libertadores
and Sudamericana but no domestic cup. `bra.2` exists but is Série B, a league, not the cup;
wiring it up as "the Brazilian cup" would be wrong. If a source appears later, this is the
one gap to close.

**Leagues Cup runs July–August**, so its season window is calendar-year and it is empty for
most of the year. An empty cup page must render as a graceful off-season message, not an error.

## What ESPN gives us (verified)

Cup events come back through the same `/site/v2/sports/soccer/{slug}/scoreboard` endpoint
as leagues, with the same event shape `normalizeEvent` already parses. Two additions:

- **`event.season.slug`** is the round name: `league-phase`, `knockout-round-playoffs`,
  `round-of-16`, `quarterfinals`, `semifinals`, `final`. The FA Cup uses `first-round`
  through `final`; Libertadores uses `group-stage`, `first-stage`, `second-stage`,
  `third-stage`, then knockouts. This is the grouping key — no inference required.
- **`competitions[0].leg`** (`{value: 1, displayValue: "1st Leg"}`) and
  **`competitions[0].series`** (`{title, totalCompetitions, competitors}`) identify
  two-legged ties. Unused in v1; recorded because the bracket spec will need them.

Standings work **unchanged**. The existing `/v2/sports/soccer/{slug}/standings` endpoint
returns `children: []` for knockout-only cups (FA Cup) and populated groups for the rest
(UCL → one `League Phase` group; Libertadores → `Group A`–`Group H`). `getStandings` needs
no modification, and no `hasGroupPhase` flag is needed on the competition record — the Table
tab renders when there are rows and hides when there aren't. Reality is the flag.

Also noted for later: `competitions[0].broadcasts` carries `[{market, names}]`, e.g.
`["Paramount+"]`. This makes the "where do I watch" feature substantially cheaper than
previously assumed. Out of scope here.

## Data model

`LeagueSlug` currently does three jobs — ESPN path segment, URL slug, and the foreign key
on `Fixture.league`. It widens to `CompetitionSlug` (16 members: 5 leagues + 11 cups):

```ts
export type Region = 'england' | 'spain' | 'france' | 'brazil' | 'usa'
                   | 'europe' | 'south-america'

export interface Competition {
  slug: CompetitionSlug
  espn: string
  name: string
  shortName: string
  accent: string
  kind: 'league' | 'cup'
  region: Region
  seasonType: 'cross-year' | 'calendar-year'
  tsdbName?: string   // leagues only — TheSportsDB has no cup bios
}
```

`COMPETITIONS` replaces `LEAGUES` as the source array. `LEAGUES` remains an exported
derived view (`COMPETITIONS.filter(c => c.kind === 'league')`) so the home page and
`LeagueNav` keep their current five-item behavior with no change. `CUPS` is the mirror.

`Fixture.league` renames to `Fixture.competition`. The compiler surfaces every call site.

**League slugs keep their exact current strings.** Pick tokens are persisted in
localStorage as `${slug}:${id}`, so unchanged slugs mean existing hand-picked selections
keep resolving after deploy. This constraint must be stated in code near the slug
definitions, or a future rename will silently discard users' saved picks.

Alternatives rejected: a parallel `Cup` type (duplicates a type to express a difference
that lives in two fields; every consumer handling both grows a branch), and a full
competition graph with parents/phases/many-to-many team links (models relationships
nothing reads, and there is no database to hold them).

## Round grouping

`normalizeEvent` gains `round?: string`, read from `raw.season.slug`. Leagues leave it
undefined and render exactly as they do today.

```ts
export function prettifyRound(slug: string): string   // 'round-of-16' → 'Round of 16'
export function groupByRound(fixtures: Fixture[]): { round: string; fixtures: Fixture[] }[]
```

Rounds are ordered by **each round's earliest kickoff**, not by ESPN's `season.type` id.
The ids happen to sort correctly for the Champions League (descending, 13682 → 13677) but
that is a coincidence across twelve competitions, and kickoff order is what a reader
expects anyway. Fixtures with no `round` collapse into a single unnamed group.

`prettifyRound` title-cases hyphenated slugs with a small exceptions map for the ones that
do not survive naive title-casing (`round-of-16` → "Round of 16", not "Round Of 16").

## Pages

**`/cups`** — the eleven competitions grouped by region, rendered with the same card
treatment as the league grid on the home page. Added to `LeagueNav` as a sixth item.

**`/cups/[cup]`** — reuses the `/[league]` tab shell:

| Tab | Contents |
|---|---|
| Fixtures | Non-final fixtures, round-grouped, each round a `Section` |
| Results | Final fixtures, round-grouped, most recent round first |
| Table | `getStandings` output; **tab hidden entirely when it returns no rows** |
| Teams | Participating teams, derived from the fixture set |

Off-season and pre-draw cups render the existing empty-state message rather than 404ing.

**Team pages** — a team has no `region` field of its own; its region is that of the league
it belongs to (Arsenal → Premier League → `england`). A team's fixtures become the merge of:

1. its league,
2. cups whose `region` equals the team's region (the domestic cups),
3. the continental cups its region feeds into — `england`/`spain`/`france` → the three
   UEFA competitions; `brazil` → the two CONMEBOL competitions; `usa` → none beyond the
   domestic cups already covered by rule 2,

each filtered by the team's ESPN id. Membership in a continental cup is **discovered** by
whether the team appears in that competition's fixture set, never assumed from region — a
mid-table club plays no European football, and a team that qualifies mid-season should
simply start appearing. Worst case is six cached fetches (6h TTL), all already warm from
the cup pages.

## Calendar export

The team `.ics` route consumes merged fixtures and therefore picks up cup games for free.
This is the payoff for the whole feature.

- Cup fixture descriptions carry the competition name, so `⚽ Arsenal vs Bayern Munich`
  is legible in a calendar client without opening the event.
- New `/api/cal/cup/[cup]` mirrors the league route.
- **`/api/cal/league/[league]` keeps its current URL.** People have subscribed to it;
  renaming the path to `/api/cal/competition/...` would silently break live calendar
  subscriptions with no error anyone would ever see. It stays.

## Testing

| Unit | Test |
|---|---|
| `prettifyRound` | Slug → label, including the exceptions map |
| `groupByRound` | Ordering by earliest kickoff; unnamed group for league fixtures; stable within-round order |
| `normalizeEvent` | A cup fixture populates `round`; a league fixture leaves it undefined |
| Team merge | A fixture set spanning league + domestic cup + continental cup merges, dedupes, and sorts by kickoff |
| `getStandings` | Returns `[]` for a knockout cup (drives the hidden Table tab) |

Existing tests should pass untouched apart from the `league` → `competition` field rename.

## Out of scope

- Bracket / knockout tree view — needs tie aggregation, away-goals history, and a
  responsive layout for a 16-team tree. Own spec. `leg` and `series` are available for it.
- International football (World Cup, Euros, Copa América, Nations League) — national teams
  are not clubs; different squads, no league affiliation, biennial. Own spec.
- Broadcast / "where to watch" — data confirmed present, regionalization needs a country
  setting. Own spec.
- Copa do Brasil — no upstream source.
