import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/data/teamFixtures', () => ({
  getTeamFixtures: vi.fn(async () => [
    {
      id: '1', competition: 'premier-league', kickoff: '2026-08-22T14:00:00.000Z',
      status: 'scheduled', statusDetail: '',
      home: { id: '359', name: 'Arsenal' }, away: { id: 'a', name: 'Everton' },
    },
    {
      id: '77', competition: 'champions-league', kickoff: '2026-09-16T19:00:00.000Z',
      status: 'scheduled', statusDetail: '', round: 'league-phase',
      home: { id: '359', name: 'Arsenal' }, away: { id: 'b', name: 'Bayern Munich' },
    },
  ]),
}))

vi.mock('@/lib/data/teams', () => ({
  findTeam: vi.fn(async (_league: unknown, slug: string) =>
    slug === 'arsenal' ? { id: '359', slug: 'arsenal', name: 'Arsenal', shortName: 'Arsenal' } : undefined,
  ),
}))

import { GET } from './route'

describe('team calendar route', () => {
  it('serves merged league + cup fixtures with per-competition descriptions', async () => {
    const res = await GET(new Request('http://localhost/api/cal/team/premier-league/arsenal.ics'), {
      params: Promise.resolve({ league: 'premier-league', team: 'arsenal.ics' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    const body = await res.text()
    expect(body).toContain('SUMMARY:⚽ Arsenal vs Everton')
    expect(body).toContain('SUMMARY:⚽ Arsenal vs Bayern Munich')
    expect(body).toContain('DESCRIPTION:Premier League')
    expect(body).toContain('DESCRIPTION:Champions League')
  })

  it('404s an unknown team', async () => {
    const res = await GET(new Request('http://localhost/api/cal/team/premier-league/nope'), {
      params: Promise.resolve({ league: 'premier-league', team: 'nope' }),
    })
    expect(res.status).toBe(404)
  })
})
