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
