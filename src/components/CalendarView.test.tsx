import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Fixture } from '@/lib/types'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={props.alt ?? ''} {...props} />,
}))

import { CalendarView } from './CalendarView'

const ALL = ['premier-league', 'la-liga', 'ligue-1', 'brasileirao', 'mls']

const epl: Fixture = {
  id: '1', league: 'premier-league', kickoff: '2026-07-15T14:00:00.000Z',
  status: 'scheduled', statusDetail: '',
  home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
}
const mls: Fixture = {
  id: '2', league: 'mls', kickoff: '2026-07-15T23:00:00.000Z',
  status: 'scheduled', statusDetail: '',
  home: { id: 'h2', name: 'LA Galaxy' }, away: { id: 'a2', name: 'Inter Miami' },
}

const props = { view: 'day' as const, anchor: '2026-07-15', today: '2026-07-09', fixtures: [epl, mls] }

beforeEach(() => window.localStorage.clear())

describe('CalendarView', () => {
  it('shows every league when all chips are on', () => {
    render(<CalendarView {...props} leagues={ALL} />)
    expect(screen.getByText('Liverpool')).toBeDefined()
    expect(screen.getByText('LA Galaxy')).toBeDefined()
  })

  it('filters to the selected leagues', () => {
    render(<CalendarView {...props} leagues={['mls']} />)
    expect(screen.queryByText('Liverpool')).toBeNull()
    expect(screen.getByText('LA Galaxy')).toBeDefined()
  })

  it('narrows to the pinned team when myteam is on', () => {
    window.localStorage.setItem(
      'lv-myteam',
      JSON.stringify({ league: 'premier-league', slug: 'liverpool', name: 'Liverpool' }),
    )
    render(<CalendarView {...props} leagues={ALL} myteam />)
    expect(screen.getByText('Liverpool')).toBeDefined()
    expect(screen.queryByText('LA Galaxy')).toBeNull()
  })

  it('shows everything when myteam is on but nothing is pinned', () => {
    render(<CalendarView {...props} leagues={ALL} myteam />)
    expect(screen.getByText('Liverpool')).toBeDefined()
    expect(screen.getByText('LA Galaxy')).toBeDefined()
  })

  it('links the view switcher, preserving the anchor', () => {
    render(<CalendarView {...props} leagues={ALL} />)
    expect(screen.getByRole('link', { name: 'Week' }).getAttribute('href')).toContain('view=week')
    expect(screen.getByRole('link', { name: 'Week' }).getAttribute('href')).toContain('d=2026-07-15')
  })

  it('opens a day panel when a month cell is clicked', () => {
    render(<CalendarView {...props} view="month" anchor="2026-07-15" leagues={ALL} />)
    fireEvent.click(screen.getByRole('button', { name: /^July 15, 2026\b/ }))
    const panel = screen.getByRole('dialog')
    expect(panel.textContent).toContain('Liverpool')
  })

  it('closes the day panel on Escape', () => {
    render(<CalendarView {...props} view="month" anchor="2026-07-15" leagues={ALL} />)
    fireEvent.click(screen.getByRole('button', { name: /^July 15, 2026\b/ }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
