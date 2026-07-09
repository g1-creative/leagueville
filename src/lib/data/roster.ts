import { espnJson } from './espn'
import type { League } from '../leagues'
import type { Player } from '../types'

export interface RawAthlete {
  id: string
  displayName: string
  jersey?: string
  age?: number
  citizenship?: string
  flag?: { href: string }
  position?: { displayName?: string; name?: string }
}

export function normalizePlayer(raw: RawAthlete): Player {
  return {
    id: raw.id,
    name: raw.displayName,
    position: raw.position?.displayName ?? raw.position?.name,
    jersey: raw.jersey,
    age: raw.age,
    nationality: raw.citizenship,
    flag: raw.flag?.href,
  }
}

const POSITION_ORDER: Record<string, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Forward: 3,
}

export function sortPlayers(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) =>
      (POSITION_ORDER[a.position ?? ''] ?? 9) - (POSITION_ORDER[b.position ?? ''] ?? 9) ||
      Number(a.jersey ?? 999) - Number(b.jersey ?? 999),
  )
}

export async function getRoster(league: League, teamId: string): Promise<Player[]> {
  const data = await espnJson<{ athletes?: RawAthlete[] }>(
    `/site/v2/sports/soccer/${league.espn}/teams/${teamId}/roster`,
    86400,
  )
  return sortPlayers((data.athletes ?? []).map(normalizePlayer))
}
