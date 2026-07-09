import { CUPS, type Competition, type Region } from '../leagues'
import type { Fixture, Team } from '../types'
import { getSeasonFixtures } from './fixtures'
import { slugify } from '../slugify'

// The continental competitions each domestic region feeds into.
// 'usa' has none beyond its domestic cups (Leagues Cup already carries region 'usa').
const FEEDS_INTO: Partial<Record<Region, Region>> = {
  england: 'europe',
  spain: 'europe',
  france: 'europe',
  brazil: 'south-america',
}

/**
 * The cups a club from `league` could appear in: domestic cups sharing the
 * league's region plus the continental cups that region feeds into. Actual
 * participation is discovered from fixture sets, never assumed from region.
 */
export function cupsForLeague(league: Competition): Competition[] {
  const regions = new Set<Region>([league.region])
  const continental = FEEDS_INTO[league.region]
  if (continental) regions.add(continental)
  return CUPS.filter((c) => regions.has(c.region))
}

/**
 * Merge per-competition fixture sets down to one team's games: filter by
 * ESPN team id, dedupe by competition+id, sort by kickoff.
 */
export function mergeTeamFixtures(sets: Fixture[][], teamId: string): Fixture[] {
  const seen = new Set<string>()
  const merged: Fixture[] = []
  for (const f of sets.flat()) {
    if (f.home.id !== teamId && f.away.id !== teamId) continue
    const key = `${f.competition}:${f.id}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(f)
  }
  return merged.sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

/** A team's full season: league games plus every cup game it appears in. */
export async function getTeamFixtures(league: Competition, teamId: string): Promise<Fixture[]> {
  const competitions = [league, ...cupsForLeague(league)]
  const sets = await Promise.all(competitions.map((c) => getSeasonFixtures(c).catch(() => [])))
  return mergeTeamFixtures(sets, teamId)
}

/** Unique participating teams derived from a fixture set, sorted by name. */
export function teamsFromFixtures(fixtures: Fixture[]): Team[] {
  const byId = new Map<string, Team>()
  for (const f of fixtures) {
    for (const side of [f.home, f.away]) {
      if (!byId.has(side.id)) {
        byId.set(side.id, {
          id: side.id,
          slug: slugify(side.name),
          name: side.name,
          shortName: side.name,
          abbrev: side.abbrev,
          logo: side.logo,
        })
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}
