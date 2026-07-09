import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/data/fixtures', () => ({
  getSeasonFixtures: vi.fn(async (comp: { slug: string }) =>
    comp.slug === 'fa-cup'
      ? [{
          id: '77', competition: 'fa-cup', kickoff: '2027-01-09T15:00:00.000Z',
          status: 'scheduled', statusDetail: '',
          home: { id: 'h', name: 'Arsenal' }, away: { id: 'a', name: 'Wrexham' },
        }]
      : [{
          id: '1', competition: 'premier-league', kickoff: '2026-08-22T14:00:00.000Z',
          status: 'scheduled', statusDetail: '',
          home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
        }],
  ),
}))

import { GET } from './route'

describe('custom calendar route', () => {
  it('resolves cup pick tokens alongside league tokens', async () => {
    const res = await GET(new Request('http://localhost/api/cal/custom?ids=premier-league:1,fa-cup:77'))
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('SUMMARY:⚽ Liverpool vs Everton')
    expect(body).toContain('SUMMARY:⚽ Arsenal vs Wrexham')
    expect(body).toContain('DESCRIPTION:FA Cup')
  })

  it('400s with no ids', async () => {
    const res = await GET(new Request('http://localhost/api/cal/custom'))
    expect(res.status).toBe(400)
  })
})
