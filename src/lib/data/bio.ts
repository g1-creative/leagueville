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
  if (!league.tsdbName) return undefined // cups have no TheSportsDB entry
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
