import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Fixture } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { FixtureCard } from './FixtureCard'

const base: Fixture = {
  id: '1',
  competition: 'premier-league',
  kickoff: '2026-08-22T14:00:00.000Z',
  status: 'scheduled',
  statusDetail: '',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
}

// The card renders a stacked mobile row (sm:hidden) and the classic desktop
// row (hidden sm:flex); jsdom applies no media queries, so shared content
// appears twice.
describe('FixtureCard', () => {
  it('shows team names and kickoff time in both layouts for a scheduled game', () => {
    render(<FixtureCard fixture={base} />)
    expect(screen.getAllByText('Liverpool')).toHaveLength(2)
    expect(screen.getAllByText('Everton')).toHaveLength(2)
    expect(screen.getAllByText('2:00 PM')).toHaveLength(2) // default tz is UTC
  })

  it('shows the score in both layouts for a finished game', () => {
    render(
      <FixtureCard
        fixture={{
          ...base,
          status: 'final',
          statusDetail: 'FT',
          home: { ...base.home, score: 2 },
          away: { ...base.away, score: 1 },
        }}
      />,
    )
    expect(screen.getAllByText('2–1')).toHaveLength(2)
    expect(screen.getByText('FT')).toBeDefined()
  })

  it('shows a pick toggle in each layout only when pickable and scheduled', () => {
    render(<FixtureCard fixture={base} pickable />)
    expect(screen.getAllByRole('button', { name: /cal/i })).toHaveLength(2)
  })

  it('shows a competition badge for cup fixtures when showLeague is set', () => {
    render(<FixtureCard fixture={{ ...base, competition: 'fa-cup' }} showLeague />)
    expect(screen.getAllByText('FA Cup')).toHaveLength(2)
  })

  it('links the mobile row to the game page', () => {
    const { container } = render(<FixtureCard fixture={base} pickable />)
    const link = container.querySelector('a[href="/premier-league/game/1"]')
    expect(link).not.toBeNull()
    expect(link?.textContent).toContain('Liverpool')
    expect(link?.textContent).toContain('Everton')
  })

  it('lets long team names truncate instead of overflowing the row', () => {
    const fixture: Fixture = {
      ...base,
      home: { id: 'h', name: 'Borussia Mönchengladbach Development Squad' },
      away: { id: 'a', name: 'Wolverhampton Wanderers Reserves and Academy' },
    }
    const { container } = render(<FixtureCard fixture={fixture} pickable />)
    const halves = container.querySelectorAll('div.flex-1')
    expect(halves.length).toBe(2)
    for (const el of halves) {
      expect(el.className).toContain('min-w-0')
    }
  })
})
