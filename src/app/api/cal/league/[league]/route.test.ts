import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/data/fixtures', () => ({
  getSeasonFixtures: vi.fn(async () => [
    {
      id: '1', competition: 'premier-league', kickoff: '2026-08-22T14:00:00.000Z',
      status: 'scheduled', statusDetail: '', venue: 'Anfield',
      home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
    },
  ]),
}))

import { GET } from './route'

describe('league calendar route', () => {
  it('serves an ics for a known league, stripping the .ics suffix', async () => {
    const res = await GET(new Request('http://localhost/api/cal/league/premier-league.ics'), {
      params: Promise.resolve({ league: 'premier-league.ics' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    const body = await res.text()
    expect(body).toContain('SUMMARY:⚽ Liverpool vs Everton')
    expect(body).toContain('X-WR-CALNAME:Premier League — Leagueville')
  })

  it('404s an unknown league', async () => {
    const res = await GET(new Request('http://localhost/api/cal/league/nope'), {
      params: Promise.resolve({ league: 'nope' }),
    })
    expect(res.status).toBe(404)
  })
})
