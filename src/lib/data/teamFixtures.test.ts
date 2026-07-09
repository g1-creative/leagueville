import { describe, it, expect } from 'vitest'
import { cupsForLeague, mergeTeamFixtures } from './teamFixtures'
import { getLeague } from '../leagues'
import type { Fixture } from '../types'

const fixture = (
  id: string,
  competition: Fixture['competition'],
  kickoff: string,
  homeId = '359',
  awayId = '360',
): Fixture => ({
  id,
  competition,
  kickoff,
  status: 'scheduled',
  statusDetail: '',
  home: { id: homeId, name: `Team ${homeId}` },
  away: { id: awayId, name: `Team ${awayId}` },
})

describe('cupsForLeague', () => {
  it('gives an English club its domestic cups plus the UEFA cups', () => {
    expect(cupsForLeague(getLeague('premier-league')!).map((c) => c.slug)).toEqual([
      'champions-league', 'europa-league', 'conference-league', 'fa-cup', 'efl-cup',
    ])
  })

  it('gives a Spanish club the Copa del Rey plus the UEFA cups', () => {
    expect(cupsForLeague(getLeague('la-liga')!).map((c) => c.slug)).toEqual([
      'champions-league', 'europa-league', 'conference-league', 'copa-del-rey',
    ])
  })

  it('gives a Brazilian club only the CONMEBOL cups — no domestic cup upstream', () => {
    expect(cupsForLeague(getLeague('brasileirao')!).map((c) => c.slug)).toEqual([
      'copa-libertadores', 'copa-sudamericana',
    ])
  })

  it('gives an MLS club its domestic cups and nothing continental', () => {
    expect(cupsForLeague(getLeague('mls')!).map((c) => c.slug)).toEqual([
      'us-open-cup', 'leagues-cup',
    ])
  })
})

describe('mergeTeamFixtures', () => {
  it("merges league and cup sets, keeping only the team's games, sorted by kickoff", () => {
    const league = [
      fixture('L1', 'premier-league', '2026-08-22T14:00:00.000Z'),
      fixture('L2', 'premier-league', '2026-08-29T14:00:00.000Z', '361', '362'), // other teams
    ]
    const faCup = [fixture('F1', 'fa-cup', '2027-01-09T15:00:00.000Z')]
    const ucl = [fixture('C1', 'champions-league', '2026-09-16T19:00:00.000Z', '360', '359')] // away side
    const merged = mergeTeamFixtures([league, faCup, ucl], '359')
    expect(merged.map((f) => f.id)).toEqual(['L1', 'C1', 'F1'])
  })

  it('dedupes a fixture that appears in more than one set', () => {
    const dup = fixture('X', 'fa-cup', '2027-01-09T15:00:00.000Z')
    expect(mergeTeamFixtures([[dup], [dup]], '359')).toHaveLength(1)
  })
})
