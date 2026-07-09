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
