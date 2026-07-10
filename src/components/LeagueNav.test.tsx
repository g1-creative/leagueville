import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ usePathname: () => '/cups' }))

import { LeagueNav } from './LeagueNav'

describe('LeagueNav', () => {
  it('renders the five leagues plus a Cups item linking to /cups', () => {
    render(<LeagueNav />)
    expect(screen.getByText('EPL')).toBeDefined()
    expect(screen.getByText('MLS')).toBeDefined()
    expect(screen.getByText('Cups').closest('a')?.getAttribute('href')).toBe('/cups')
  })
})
