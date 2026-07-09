import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { StandingsGroup } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { StandingsTable } from './StandingsTable'

const group: StandingsGroup = {
  name: 'League Phase',
  rows: [{
    rank: 1, teamId: '359', teamName: 'Arsenal', teamSlug: 'arsenal',
    played: 8, wins: 7, draws: 1, losses: 0,
    goalsFor: 20, goalsAgainst: 4, goalDiff: 16, points: 22,
  }],
}

describe('StandingsTable', () => {
  it('links rows to team pages when a league slug is given', () => {
    render(<StandingsTable group={group} leagueSlug="premier-league" />)
    expect(screen.getByText('Arsenal').closest('a')?.getAttribute('href')).toBe('/premier-league/arsenal')
  })

  it('renders plain rows without a league slug — cup standings have no team pages', () => {
    render(<StandingsTable group={group} />)
    expect(screen.getByText('Arsenal')).toBeDefined()
    expect(screen.getByText('Arsenal').closest('a')).toBeNull()
  })
})
