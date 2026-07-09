import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Fixture } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { DayColumn } from './DayColumn'

const fixture = (over: Partial<Fixture> = {}): Fixture => ({
  id: '1',
  league: 'premier-league',
  kickoff: '2026-08-22T14:00:00.000Z',
  status: 'scheduled',
  statusDetail: '',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
  ...over,
})

describe('DayColumn', () => {
  it('renders a dash when the day is empty', () => {
    render(<DayColumn dayKey="2026-08-22" fixtures={[]} />)
    expect(screen.getByText('—')).toBeDefined()
  })

  it('links each game to its game page', () => {
    render(<DayColumn dayKey="2026-08-22" fixtures={[fixture()]} />)
    const link = screen.getByRole('link', { name: /Liverpool/ })
    expect(link.getAttribute('href')).toBe('/premier-league/game/1')
  })

  it('shows the kickoff time for a scheduled game, in the default UTC timezone', () => {
    render(<DayColumn dayKey="2026-08-22" fixtures={[fixture()]} />)
    expect(screen.getByText('2:00 PM')).toBeDefined()
  })

  it('shows the score for a finished game', () => {
    render(
      <DayColumn
        dayKey="2026-08-22"
        fixtures={[fixture({ status: 'final', home: { id: 'h', name: 'Liverpool', score: 2 }, away: { id: 'a', name: 'Everton', score: 1 } })]}
      />,
    )
    expect(screen.getByText('2–1')).toBeDefined()
  })

  it('offers a + for scheduled and finished games but not postponed ones', () => {
    render(
      <DayColumn
        dayKey="2026-08-22"
        fixtures={[
          fixture({
            id: '1',
            home: { id: 'h1', name: 'Liverpool' },
            away: { id: 'a1', name: 'Everton' },
          }),
          fixture({
            id: '2',
            status: 'final',
            home: { id: 'h2', name: 'Arsenal' },
            away: { id: 'a2', name: 'Chelsea' },
          }),
          fixture({
            id: '3',
            status: 'postponed',
            home: { id: 'h3', name: 'Fulham' },
            away: { id: 'a3', name: 'Brentford' },
          }),
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add Liverpool vs Everton to calendar' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Add Arsenal vs Chelsea to calendar' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Add Fulham vs Brentford to calendar' })).toBeNull()
  })
})
