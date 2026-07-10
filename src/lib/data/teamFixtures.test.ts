import { describe, it, expect, vi } from 'vitest'
import { cupsForLeague, mergeTeamFixtures, teamsFromFixtures, getTeamFixtures } from './teamFixtures'
import { getSeasonFixtures } from './fixtures'
import { getLeague } from '../leagues'
import type { Fixture } from '../types'

vi.mock('./fixtures', () => ({
  getSeasonFixtures: vi.fn(),
}))

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

  it('gives a mid-table club zero Champions League games when it never qualified', () => {
    const league = [
      fixture('L1', 'premier-league', '2026-08-22T14:00:00.000Z', '99', '360'),
      fixture('L2', 'premier-league', '2026-08-29T14:00:00.000Z', '361', '99'),
    ]
    // Champions League fixture set with no involvement from team '99' — the
    // club never qualified, so this is a candidate competition, not an
    // actual one.
    const ucl = [
      fixture('C1', 'champions-league', '2026-09-16T19:00:00.000Z', '360', '361'),
      fixture('C2', 'champions-league', '2026-09-17T19:00:00.000Z', '362', '363'),
    ]
    const merged = mergeTeamFixtures([league, ucl], '99')
    expect(merged.map((f) => f.id)).toEqual(['L1', 'L2'])
    expect(merged.every((f) => f.competition !== 'champions-league')).toBe(true)
  })
})

describe('getTeamFixtures', () => {
  const mockedGetSeasonFixtures = vi.mocked(getSeasonFixtures)
  const mls = getLeague('mls')!

  it('rejects when the fetch for the team\'s own league rejects', async () => {
    mockedGetSeasonFixtures.mockImplementation(async (c) => {
      if (c.slug === mls.slug) throw new Error('ESPN outage')
      return []
    })
    await expect(getTeamFixtures(mls, '359')).rejects.toThrow()
  })

  it('does not reject when only a cup fetch rejects — the league fixtures still come back', async () => {
    const leagueFixture = fixture('L1', 'mls', '2026-08-22T14:00:00.000Z')
    mockedGetSeasonFixtures.mockImplementation(async (c) => {
      if (c.slug === mls.slug) return [leagueFixture]
      throw new Error('cup ESPN outage')
    })
    const result = await getTeamFixtures(mls, '359')
    expect(result.map((f) => f.id)).toEqual(['L1'])
  })
})

describe('teamsFromFixtures', () => {
  it('derives unique participating teams sorted by name', () => {
    const teams = teamsFromFixtures([
      {
        id: '1', competition: 'fa-cup', kickoff: '2027-01-09T15:00:00.000Z',
        status: 'scheduled', statusDetail: '',
        home: { id: '359', name: 'Arsenal', abbrev: 'ARS', logo: 'https://a.espncdn.com/ars.png' },
        away: { id: '380', name: 'Wrexham' },
      },
      {
        id: '2', competition: 'fa-cup', kickoff: '2027-01-10T15:00:00.000Z',
        status: 'scheduled', statusDetail: '',
        home: { id: '364', name: 'Liverpool' },
        away: { id: '359', name: 'Arsenal' },
      },
    ])
    expect(teams.map((t) => t.name)).toEqual(['Arsenal', 'Liverpool', 'Wrexham'])
    expect(teams[0]).toEqual({
      id: '359', slug: 'arsenal', name: 'Arsenal', shortName: 'Arsenal',
      abbrev: 'ARS', logo: 'https://a.espncdn.com/ars.png',
    })
  })
})
