export type Region =
  | 'england'
  | 'spain'
  | 'france'
  | 'brazil'
  | 'usa'
  | 'europe'
  | 'south-america'

export type LeagueSlug = 'premier-league' | 'la-liga' | 'ligue-1' | 'brasileirao' | 'mls'

export type CupSlug =
  | 'champions-league'
  | 'europa-league'
  | 'conference-league'
  | 'fa-cup'
  | 'efl-cup'
  | 'copa-del-rey'
  | 'coupe-de-france'
  | 'us-open-cup'
  | 'leagues-cup'
  | 'copa-libertadores'
  | 'copa-sudamericana'

export type CompetitionSlug = LeagueSlug | CupSlug

export interface Competition {
  slug: CompetitionSlug
  espn: string
  name: string
  shortName: string
  accent: string
  kind: 'league' | 'cup'
  region: Region
  seasonType: 'cross-year' | 'calendar-year'
  tsdbName?: string // leagues only — TheSportsDB has no cup bios
}

/**
 * Legacy alias. The data helpers were written when only leagues existed;
 * every one of them works unchanged on any competition.
 */
export type League = Competition

// Accents are drawn from each competition's own identity and levelled to a
// similar lightness so none shouts over the others on the dark board.
//
// ⚠️ DO NOT rename any slug below. Slugs are persisted in users' localStorage
// as calendar pick tokens (`${slug}:${fixtureId}`) and baked into live .ics
// subscription URLs. Renaming a slug silently discards saved picks and breaks
// calendar subscriptions with no error anyone would ever see.
export const COMPETITIONS: Competition[] = [
  // Leagues
  { slug: 'premier-league', espn: 'eng.1', name: 'Premier League', shortName: 'EPL', accent: '#a56bf0', kind: 'league', region: 'england', seasonType: 'cross-year', tsdbName: 'English Premier League' },
  { slug: 'la-liga', espn: 'esp.1', name: 'La Liga', shortName: 'La Liga', accent: '#ff5c4d', kind: 'league', region: 'spain', seasonType: 'cross-year', tsdbName: 'Spanish La Liga' },
  { slug: 'ligue-1', espn: 'fra.1', name: 'Ligue 1', shortName: 'Ligue 1', accent: '#f0b429', kind: 'league', region: 'france', seasonType: 'cross-year', tsdbName: 'French Ligue 1' },
  { slug: 'brasileirao', espn: 'bra.1', name: 'Brasileirão', shortName: 'Brasileirão', accent: '#2fd48c', kind: 'league', region: 'brazil', seasonType: 'calendar-year', tsdbName: 'Brazilian Serie A' },
  { slug: 'mls', espn: 'usa.1', name: 'MLS', shortName: 'MLS', accent: '#5b8def', kind: 'league', region: 'usa', seasonType: 'calendar-year', tsdbName: 'American Major League Soccer' },
  // Cups — ESPN slugs verified live 2026-07-09.
  // Copa do Brasil is NOT available upstream under any slug; do not add it.
  { slug: 'champions-league', espn: 'uefa.champions', name: 'Champions League', shortName: 'UCL', accent: '#818cf8', kind: 'cup', region: 'europe', seasonType: 'cross-year' },
  { slug: 'europa-league', espn: 'uefa.europa', name: 'Europa League', shortName: 'UEL', accent: '#fb923c', kind: 'cup', region: 'europe', seasonType: 'cross-year' },
  { slug: 'conference-league', espn: 'uefa.europa.conf', name: 'Conference League', shortName: 'UECL', accent: '#4ade80', kind: 'cup', region: 'europe', seasonType: 'cross-year' },
  { slug: 'fa-cup', espn: 'eng.fa', name: 'FA Cup', shortName: 'FA Cup', accent: '#f43f5e', kind: 'cup', region: 'england', seasonType: 'cross-year' },
  { slug: 'efl-cup', espn: 'eng.league_cup', name: 'EFL Cup', shortName: 'EFL Cup', accent: '#38bdf8', kind: 'cup', region: 'england', seasonType: 'cross-year' },
  { slug: 'copa-del-rey', espn: 'esp.copa_del_rey', name: 'Copa del Rey', shortName: 'Copa del Rey', accent: '#facc15', kind: 'cup', region: 'spain', seasonType: 'cross-year' },
  { slug: 'coupe-de-france', espn: 'fra.coupe_de_france', name: 'Coupe de France', shortName: 'Coupe de France', accent: '#60a5fa', kind: 'cup', region: 'france', seasonType: 'cross-year' },
  { slug: 'us-open-cup', espn: 'usa.open', name: 'US Open Cup', shortName: 'US Open Cup', accent: '#f87171', kind: 'cup', region: 'usa', seasonType: 'calendar-year' },
  { slug: 'leagues-cup', espn: 'concacaf.leagues.cup', name: 'Leagues Cup', shortName: 'Leagues Cup', accent: '#2dd4bf', kind: 'cup', region: 'usa', seasonType: 'calendar-year' },
  { slug: 'copa-libertadores', espn: 'conmebol.libertadores', name: 'Copa Libertadores', shortName: 'Libertadores', accent: '#fbbf24', kind: 'cup', region: 'south-america', seasonType: 'calendar-year' },
  { slug: 'copa-sudamericana', espn: 'conmebol.sudamericana', name: 'Copa Sudamericana', shortName: 'Sudamericana', accent: '#34d399', kind: 'cup', region: 'south-america', seasonType: 'calendar-year' },
]

export const LEAGUES: Competition[] = COMPETITIONS.filter((c) => c.kind === 'league')
export const CUPS: Competition[] = COMPETITIONS.filter((c) => c.kind === 'cup')

export function getCompetition(slug: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.slug === slug)
}

export function getLeague(slug: string): Competition | undefined {
  return LEAGUES.find((l) => l.slug === slug)
}

export function getCup(slug: string): Competition | undefined {
  return CUPS.find((c) => c.slug === slug)
}

const REGION_LABELS: { region: Region; label: string }[] = [
  { region: 'europe', label: 'Europe' },
  { region: 'england', label: 'England' },
  { region: 'spain', label: 'Spain' },
  { region: 'france', label: 'France' },
  { region: 'usa', label: 'United States' },
  { region: 'south-america', label: 'South America' },
]

/** The 11 cups grouped by region for the /cups browse page. Regions with no cups (brazil) are omitted. */
export function cupsByRegion(): { region: Region; label: string; cups: Competition[] }[] {
  return REGION_LABELS
    .map(({ region, label }) => ({ region, label, cups: CUPS.filter((c) => c.region === region) }))
    .filter((g) => g.cups.length > 0)
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
