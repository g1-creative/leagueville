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
  competition: 'premier-league',
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
        fixtures={[fixture(), fixture({ id: '2', status: 'final' }), fixture({ id: '3', status: 'postponed' })]}
      />,
    )
    expect(screen.getAllByRole('button', { name: /add .* to calendar/i })).toHaveLength(2)
  })
})
