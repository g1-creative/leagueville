import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/data/fixtures', () => ({
  getSeasonFixtures: vi.fn(async () => [
    {
      id: '740123', competition: 'fa-cup', kickoff: '2027-01-09T15:00:00.000Z',
      status: 'scheduled', statusDetail: '', round: 'third-round',
      home: { id: '359', name: 'Arsenal' }, away: { id: '380', name: 'Wrexham' },
    },
  ]),
}))

import { GET } from './route'

describe('cup calendar route', () => {
  it('serves an ics for a known cup, stripping the .ics suffix', async () => {
    const res = await GET(new Request('http://localhost/api/cal/cup/fa-cup.ics'), {
      params: Promise.resolve({ cup: 'fa-cup.ics' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    const body = await res.text()
    expect(body).toContain('SUMMARY:⚽ Arsenal vs Wrexham')
    expect(body).toContain('X-WR-CALNAME:FA Cup — Leagueville')
    expect(body).toContain('DESCRIPTION:FA Cup')
  })

  it('404s a league slug — leagues stay on /api/cal/league', async () => {
    const res = await GET(new Request('http://localhost/api/cal/cup/premier-league'), {
      params: Promise.resolve({ cup: 'premier-league' }),
    })
    expect(res.status).toBe(404)
  })

  it('404s an unknown cup', async () => {
    const res = await GET(new Request('http://localhost/api/cal/cup/copa-do-brasil'), {
      params: Promise.resolve({ cup: 'copa-do-brasil' }),
    })
    expect(res.status).toBe(404)
  })
})
