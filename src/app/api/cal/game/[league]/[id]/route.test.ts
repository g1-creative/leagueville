import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/data/fixtures', () => ({
  getSeasonFixtures: vi.fn(async () => [
    {
      id: '1', competition: 'premier-league', kickoff: '2026-08-22T14:00:00.000Z',
      status: 'scheduled', statusDetail: '', venue: 'Anfield',
      home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
    },
    {
      id: '2', competition: 'premier-league', kickoff: '2026-08-23T14:00:00.000Z',
      status: 'final', statusDetail: 'FT',
      home: { id: 'h', name: 'Arsenal', score: 2 }, away: { id: 'a', name: 'Chelsea', score: 1 },
    },
    {
      id: '3', competition: 'premier-league', kickoff: '2026-08-24T14:00:00.000Z',
      status: 'postponed', statusDetail: '', venue: 'Stamford Bridge',
      home: { id: 'h', name: 'Manchester City' }, away: { id: 'a', name: 'Liverpool' },
    },
  ]),
}))

import { GET } from './route'

const call = (league: string, id: string) =>
  GET(new Request(`http://localhost/api/cal/game/${league}/${id}`), {
    params: Promise.resolve({ league, id }),
  })

describe('single-game calendar route', () => {
  it('serves an ics for one game, stripping the .ics suffix', async () => {
    const res = await call('premier-league', '1.ics')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    expect(res.headers.get('content-disposition')).toContain('attachment')
    const body = await res.text()
    expect(body).toContain('SUMMARY:⚽ Liverpool vs Everton')
    expect(body).toContain('UID:premier-league-1@leagueville')
    expect(body).not.toContain('Arsenal')
  })

  it('includes the final score for a finished game', async () => {
    const body = await (await call('premier-league', '2')).text()
    expect(body).toContain('FT 2–1')
  })

  it('404s an unknown league', async () => {
    expect((await call('nope', '1')).status).toBe(404)
  })

  it('404s an unknown game id', async () => {
    expect((await call('premier-league', '999')).status).toBe(404)
  })

  it('503s when fixture data is unavailable', async () => {
    const { getSeasonFixtures } = await import('@/lib/data/fixtures')
    vi.mocked(getSeasonFixtures).mockRejectedValueOnce(new Error('upstream down'))
    expect((await call('premier-league', '1')).status).toBe(503)
  })

  it('404s a postponed game', async () => {
    expect((await call('premier-league', '3')).status).toBe(404)
  })
})
