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

// Accents are drawn from each league's own identity and levelled to a similar
// lightness so none shouts over the others on the dark board.
export const LEAGUES: League[] = [
  { slug: 'premier-league', espn: 'eng.1', name: 'Premier League', shortName: 'EPL', accent: '#a56bf0', seasonType: 'cross-year', tsdbName: 'English Premier League' },
  { slug: 'la-liga', espn: 'esp.1', name: 'La Liga', shortName: 'La Liga', accent: '#ff5c4d', seasonType: 'cross-year', tsdbName: 'Spanish La Liga' },
  { slug: 'ligue-1', espn: 'fra.1', name: 'Ligue 1', shortName: 'Ligue 1', accent: '#f0b429', seasonType: 'cross-year', tsdbName: 'French Ligue 1' },
  { slug: 'brasileirao', espn: 'bra.1', name: 'Brasileirão', shortName: 'Brasileirão', accent: '#2fd48c', seasonType: 'calendar-year', tsdbName: 'Brazilian Serie A' },
  { slug: 'mls', espn: 'usa.1', name: 'MLS', shortName: 'MLS', accent: '#5b8def', seasonType: 'calendar-year', tsdbName: 'American Major League Soccer' },
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
