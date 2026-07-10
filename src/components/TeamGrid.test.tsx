import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Team } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { TeamGrid } from './TeamGrid'

const teams: Team[] = [{ id: '359', slug: 'arsenal', name: 'Arsenal', shortName: 'Arsenal' }]

describe('TeamGrid', () => {
  it('links to team pages when a league slug is given', () => {
    render(<TeamGrid teams={teams} leagueSlug="premier-league" />)
    expect(screen.getByText('Arsenal').closest('a')?.getAttribute('href')).toBe('/premier-league/arsenal')
  })

  it('renders plain cards without a league slug — cup teams have no team page', () => {
    render(<TeamGrid teams={teams} />)
    expect(screen.getByText('Arsenal')).toBeDefined()
    expect(screen.getByText('Arsenal').closest('a')).toBeNull()
  })
})
