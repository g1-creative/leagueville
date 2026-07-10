import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const nav = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  beforeEach(() => {
    window.localStorage.clear()
    nav.pathname = '/'
  })

  it('renders the four tabs with Home active on /', () => {
    render(<BottomNav />)
    expect(screen.getByText('Home')).toBeDefined()
    expect(screen.getByText('Leagues')).toBeDefined()
    expect(screen.getByText('Calendar')).toBeDefined()
    expect(screen.getByText('My Team')).toBeDefined()
    expect(screen.getByText('Home').closest('a')?.getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Calendar').closest('a')?.getAttribute('aria-current')).toBeNull()
  })

  it('marks Calendar active on /calendar', () => {
    nav.pathname = '/calendar'
    render(<BottomNav />)
    expect(screen.getByText('Calendar').closest('a')?.getAttribute('aria-current')).toBe('page')
  })

  it('opens the league sheet from the Leagues tab, without the pin hint', () => {
    render(<BottomNav />)
    fireEvent.click(screen.getByText('Leagues'))
    expect(screen.getByRole('dialog', { name: 'Leagues' })).toBeDefined()
    expect(screen.queryByText(/No team pinned/)).toBeNull()
  })

  it('unpinned My Team opens the sheet with the pin explainer', () => {
    render(<BottomNav />)
    fireEvent.click(screen.getByText('My Team'))
    expect(screen.getByRole('dialog', { name: 'Leagues' })).toBeDefined()
    expect(screen.getByText(/No team pinned — pick a league, open a team/)).toBeDefined()
  })

  it('pinned My Team links to the team page and shows the short name', () => {
    window.localStorage.setItem(
      'lv-myteam',
      JSON.stringify({ league: 'premier-league', slug: 'arsenal', name: 'Arsenal' }),
    )
    nav.pathname = '/premier-league/arsenal'
    render(<BottomNav />)
    const tab = screen.getByText('Arsenal').closest('a')
    expect(tab?.getAttribute('href')).toBe('/premier-league/arsenal')
    expect(tab?.getAttribute('aria-current')).toBe('page')
  })

  it('marks Leagues active on league pages that are not the pinned team', () => {
    nav.pathname = '/la-liga'
    render(<BottomNav />)
    expect(screen.getByText('Leagues').closest('button')?.className).toContain('text-chalk')
  })

  it('marks Leagues active on /cups', () => {
    nav.pathname = '/cups'
    render(<BottomNav />)
    expect(screen.getByText('Leagues').closest('button')?.className).toContain('text-chalk')
  })
})
