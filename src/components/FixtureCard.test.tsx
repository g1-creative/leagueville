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

describe('FixtureCard', () => {
  it('shows team names and kickoff time for a scheduled game', () => {
    render(<FixtureCard fixture={base} />)
    expect(screen.getByText('Liverpool')).toBeDefined()
    expect(screen.getByText('Everton')).toBeDefined()
    expect(screen.getByText('2:00 PM')).toBeDefined() // default tz is UTC
  })

  it('shows the score for a finished game', () => {
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
    expect(screen.getByText('2–1')).toBeDefined()
    expect(screen.getByText('FT')).toBeDefined()
  })

  it('shows a pick toggle only when pickable and scheduled', () => {
    render(<FixtureCard fixture={base} pickable />)
    expect(screen.getByRole('button', { name: /cal/i })).toBeDefined()
  })

  it('shows a competition badge for cup fixtures when showLeague is set', () => {
    render(<FixtureCard fixture={{ ...base, competition: 'fa-cup' }} showLeague />)
    expect(screen.getByText('FA Cup')).toBeDefined()
  })
})
