import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Fixture } from '@/lib/types'
import { AddToCalendarMenu } from './AddToCalendarMenu'

const base: Fixture = {
  id: '77',
  competition: 'premier-league',
  kickoff: '2026-08-22T14:00:00.000Z',
  status: 'scheduled',
  statusDetail: '',
  venue: 'Anfield',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
}

const open = () => fireEvent.click(screen.getByRole('button', { name: /add .* to calendar/i }))

describe('AddToCalendarMenu', () => {
  it('is closed until the + is clicked', () => {
    render(<AddToCalendarMenu fixture={base} />)
    expect(screen.queryByRole('menu')).toBeNull()
    open()
    expect(screen.getByRole('menu')).toBeDefined()
  })

  it('offers an ics download and a Google link', () => {
    render(<AddToCalendarMenu fixture={base} />)
    open()
    const ics = screen.getByRole('menuitem', { name: /apple/i })
    expect(ics.getAttribute('href')).toBe('/api/cal/game/premier-league/77.ics')

    const google = screen.getByRole('menuitem', { name: /google/i })
    const url = new URL(google.getAttribute('href')!)
    expect(url.searchParams.get('text')).toBe('⚽ Liverpool vs Everton')
    expect(url.searchParams.get('dates')).toBe('20260822T140000Z/20260822T160000Z')
    expect(url.searchParams.get('location')).toBe('Anfield')
  })

  it('closes on Escape', () => {
    render(<AddToCalendarMenu fixture={base} />)
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('closes on an outside click', () => {
    render(<AddToCalendarMenu fixture={base} />)
    open()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('renders nothing for a postponed game', () => {
    const { container } = render(<AddToCalendarMenu fixture={{ ...base, status: 'postponed' }} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders for a finished game', () => {
    render(<AddToCalendarMenu fixture={{ ...base, status: 'final' }} />)
    expect(screen.getByRole('button', { name: /add .* to calendar/i })).toBeDefined()
  })
})
