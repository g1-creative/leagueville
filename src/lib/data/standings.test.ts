import { describe, it, expect, vi } from 'vitest'

vi.mock('./espn', () => ({
  espnJson: vi.fn(async () => ({ children: [] })),
}))

import { getCup } from '../leagues'
import { getStandings, normalizeEntry } from './standings'

describe('normalizeEntry', () => {
  it('maps ESPN stats array to a standings row', () => {
    const row = normalizeEntry({
      team: { id: '359', displayName: 'Arsenal', logos: [{ href: 'https://a.espncdn.com/ars.png' }] },
      stats: [
        { name: 'rank', value: 2 },
        { name: 'gamesPlayed', value: 38 },
        { name: 'wins', value: 26 },
        { name: 'ties', value: 7 },
        { name: 'losses', value: 5 },
        { name: 'pointsFor', value: 84 },
        { name: 'pointsAgainst', value: 32 },
        { name: 'pointDifferential', value: 52 },
        { name: 'points', value: 85 },
      ],
    })
    expect(row).toEqual({
      rank: 2,
      teamId: '359',
      teamName: 'Arsenal',
      teamSlug: 'arsenal',
      logo: 'https://a.espncdn.com/ars.png',
      played: 38,
      wins: 26,
      draws: 7,
      losses: 5,
      goalsFor: 84,
      goalsAgainst: 32,
      goalDiff: 52,
      points: 85,
    })
  })

  it('defaults missing stats to 0', () => {
    const row = normalizeEntry({ team: { id: '1', displayName: 'X FC' }, stats: [] })
    expect(row.points).toBe(0)
    expect(row.rank).toBe(0)
    expect(row.logo).toBeUndefined()
  })
})

describe('getStandings', () => {
  it('returns no groups for a knockout-only cup (ESPN sends children: [])', async () => {
    expect(await getStandings(getCup('fa-cup')!)).toEqual([])
  })
})
