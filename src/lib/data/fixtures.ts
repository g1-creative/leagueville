import { unstable_cache } from 'next/cache'
import { espnJson } from './espn'
import { seasonRange, type League, type CompetitionSlug } from '../leagues'
import type { Fixture, FixtureSide } from '../types'

interface RawCompetitor {
  homeAway: 'home' | 'away'
  winner?: boolean
  score?: string | { value?: number; displayValue?: string }
  team: {
    id: string
    displayName: string
    abbreviation?: string
    logo?: string
    logos?: { href: string }[]
  }
}

export interface RawEvent {
  id: string
  date: string
  season?: { slug?: string }
  competitions: {
    venue?: { fullName?: string }
    status: {
      type: { state: 'pre' | 'in' | 'post'; completed: boolean; description: string; detail: string; shortDetail: string }
    }
    competitors: RawCompetitor[]
  }[]
}

function side(c: RawCompetitor): FixtureSide {
  const rawScore = typeof c.score === 'object' ? c.score?.displayValue : c.score
  const parsed = rawScore === undefined || rawScore === '' ? undefined : Number(rawScore)
  return {
    id: c.team.id,
    name: c.team.displayName,
    abbrev: c.team.abbreviation,
    logo: c.team.logo ?? c.team.logos?.[0]?.href,
    score: parsed !== undefined && Number.isNaN(parsed) ? undefined : parsed,
    winner: c.winner,
  }
}

export function normalizeEvent(raw: RawEvent, competition: CompetitionSlug): Fixture | null {
  const comp = raw.competitions?.[0]
  if (!comp) return null
  const home = comp.competitors?.find((c) => c.homeAway === 'home')
  const away = comp.competitors?.find((c) => c.homeAway === 'away')
  if (!home || !away) return null
  const st = comp.status.type
  const status: Fixture['status'] =
    st.description === 'Postponed' ? 'postponed'
    : st.state === 'pre' ? 'scheduled'
    : st.state === 'in' ? 'live'
    : 'final'
  return {
    id: raw.id,
    competition,
    kickoff: new Date(raw.date).toISOString(),
    status,
    statusDetail: st.shortDetail ?? st.detail ?? st.description,
    round: raw.season?.slug,
    venue: comp.venue?.fullName,
    home: side(home),
    away: side(away),
  }
}

function normalizeAll(events: RawEvent[] | undefined, league: League): Fixture[] {
  return (events ?? [])
    .map((e) => normalizeEvent(e, league.slug))
    .filter((f): f is Fixture => f !== null)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

async function fetchSeasonFixtures(league: League, start: string, end: string): Promise<Fixture[]> {
  const data = await espnJson<{ events?: RawEvent[] }>(
    `/site/v2/sports/soccer/${league.espn}/scoreboard?dates=${start}-${end}&limit=1000`,
    0, // raw payload exceeds the 2 MB data-cache cap — cache the normalized result instead
  )
  return normalizeAll(data.events, league)
}

// Bump SCHEMA when the shape of a cached Fixture changes. The data cache
// survives deployments, so without this a new build reads old-shaped objects
// until the TTL expires — v2 renamed Fixture.league to Fixture.competition,
// which surfaced as `DESCRIPTION:undefined` in live calendar subscriptions.
const SCHEMA = 'v2'

export async function getSeasonFixtures(league: League): Promise<Fixture[]> {
  const { start, end } = seasonRange(league, new Date())
  return unstable_cache(
    () => fetchSeasonFixtures(league, start, end),
    ['season-fixtures', SCHEMA, league.slug, `${start}-${end}`],
    { revalidate: 21600 },
  )()
}

export async function getScoreboardWindow(league: League): Promise<Fixture[]> {
  const day = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
  const now = Date.now()
  const from = day(new Date(now - 24 * 3600_000))
  const to = day(new Date(now + 24 * 3600_000))
  const data = await espnJson<{ events?: RawEvent[] }>(
    `/site/v2/sports/soccer/${league.espn}/scoreboard?dates=${from}-${to}&limit=200`,
    60,
  )
  return normalizeAll(data.events, league)
}
