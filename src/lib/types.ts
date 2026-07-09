import type { CompetitionSlug } from './leagues'

export interface FixtureSide {
  id: string
  name: string
  abbrev?: string
  logo?: string
  score?: number
  winner?: boolean
}

export interface Fixture {
  id: string
  competition: CompetitionSlug
  kickoff: string // ISO 8601 UTC
  status: 'scheduled' | 'live' | 'final' | 'postponed'
  statusDetail: string
  venue?: string
  home: FixtureSide
  away: FixtureSide
}

export interface Team {
  id: string
  slug: string
  name: string
  shortName: string
  abbrev?: string
  logo?: string
  location?: string
}

export interface StandingRow {
  rank: number
  teamId: string
  teamName: string
  teamSlug: string
  logo?: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface StandingsGroup {
  name: string
  rows: StandingRow[]
}

export interface Player {
  id: string
  name: string
  position?: string
  jersey?: string
  age?: number
  nationality?: string
  flag?: string
}

export interface TeamBio {
  description?: string
  banner?: string
  stadium?: string
  founded?: number
}

export interface SeasonFinish {
  season: number
  rank: number
  points: number
  group?: string
}
