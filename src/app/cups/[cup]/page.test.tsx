import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Fixture, StandingsGroup } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

const getSeasonFixtures = vi.fn(async (): Promise<Fixture[]> => [])
const getStandings = vi.fn(async (): Promise<StandingsGroup[]> => [])

vi.mock('@/lib/data/fixtures', () => ({ getSeasonFixtures: () => getSeasonFixtures() }))
vi.mock('@/lib/data/standings', () => ({ getStandings: () => getStandings() }))

import CupPage from './page'

const fixture = (overrides: Partial<Fixture> = {}): Fixture => ({
  id: '1',
  competition: 'fa-cup',
  kickoff: '2026-01-10T15:00:00Z',
  status: 'scheduled',
  statusDetail: 'Sat',
  round: 'round-of-16',
  home: { id: '10', name: 'Home FC' },
  away: { id: '20', name: 'Away FC' },
  ...overrides,
})

function makeParams(cup: string, tab?: string) {
  return {
    params: Promise.resolve({ cup }),
    searchParams: Promise.resolve(tab ? { tab } : {}),
  }
}

describe('CupPage', () => {
  it('404s for an unknown slug', async () => {
    await expect(CupPage(makeParams('not-a-cup'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('404s for a league slug', async () => {
    await expect(CupPage(makeParams('premier-league'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('hides the Table tab for a knockout-only cup (getStandings returns [])', async () => {
    getStandings.mockResolvedValueOnce([])
    getSeasonFixtures.mockResolvedValueOnce([fixture()])
    const el = await CupPage(makeParams('fa-cup'))
    render(el)
    expect(screen.queryByRole('link', { name: 'Table' })).toBeNull()
  })

  it('shows the Table tab when getStandings returns rows', async () => {
    getStandings.mockResolvedValueOnce([
      { name: 'Group A', rows: [] } as unknown as StandingsGroup,
    ])
    getSeasonFixtures.mockResolvedValueOnce([])
    const el = await CupPage(makeParams('champions-league'))
    render(el)
    expect(screen.getByRole('link', { name: 'Table' })).toBeDefined()
  })

  it('renders the Teams tab with no anchor for a cup team (no cup-scoped team page)', async () => {
    getStandings.mockResolvedValueOnce([])
    getSeasonFixtures.mockResolvedValueOnce([fixture()])
    const el = await CupPage(makeParams('fa-cup', 'teams'))
    render(el)
    expect(screen.getByText('Home FC')).toBeDefined()
    expect(screen.getByText('Home FC').closest('a')).toBeNull()
    expect(screen.getByText('Away FC').closest('a')).toBeNull()
  })

  it('renders an empty-state message for an off-season cup instead of crashing', async () => {
    getStandings.mockResolvedValueOnce([])
    getSeasonFixtures.mockResolvedValueOnce([])
    const el = await CupPage(makeParams('leagues-cup', 'fixtures'))
    render(el)
    expect(screen.getByText(/Off-season/)).toBeDefined()
  })
})
