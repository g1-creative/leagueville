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

  it('moves focus into the day panel on open and restores it on Escape', () => {
    render(<CalendarView {...props} view="month" anchor="2026-07-15" leagues={ALL} />)
    const opener = screen.getByRole('button', { name: /^July 15, 2026\b/ })
    opener.focus()
    fireEvent.click(opener)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).toBe(opener)
  })

  it('does not let the last selected league chip be deactivated', () => {
    render(<CalendarView {...props} leagues={['mls']} />)
    const chip = screen.getByText('MLS')
    expect(chip.tagName).not.toBe('A')
    expect(screen.queryAllByRole('link', { name: 'MLS' })).toHaveLength(0)
    expect(chip.getAttribute('aria-disabled')).not.toBeNull()
    expect(chip.getAttribute('aria-pressed')).toBe('true')
  })

  it('lets any league chip toggle off when more than one is selected', () => {
    render(<CalendarView {...props} leagues={['mls', 'premier-league']} />)
    expect(screen.getByRole('link', { name: 'MLS' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'EPL' })).toBeDefined()
  })

  it('makes league chips non-interactive (not links) when myteam is on with a pinned team', () => {
    window.localStorage.setItem(
      'lv-myteam',
      JSON.stringify({ league: 'premier-league', slug: 'liverpool', name: 'Liverpool' }),
    )
    render(<CalendarView {...props} leagues={ALL} myteam />)
    expect(screen.queryAllByRole('link', { name: /^(EPL|MLS|La Liga|Ligue 1|Brasileirão)$/ })).toHaveLength(0)
    const mlsChip = screen.getByText('MLS')
    expect(mlsChip.getAttribute('aria-disabled')).not.toBeNull()
    expect(mlsChip.getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps league chips as links (interactive) when myteam is off', () => {
    window.localStorage.setItem(
      'lv-myteam',
      JSON.stringify({ league: 'premier-league', slug: 'liverpool', name: 'Liverpool' }),
    )
    render(<CalendarView {...props} leagues={ALL} />)
    expect(screen.getByRole('link', { name: 'MLS' })).toBeDefined()
  })

  it('reflects the pinned "myteam" chip pressed state', () => {
    window.localStorage.setItem(
      'lv-myteam',
      JSON.stringify({ league: 'premier-league', slug: 'liverpool', name: 'Liverpool' }),
    )
    render(<CalendarView {...props} leagues={ALL} myteam />)
    const myteamChip = screen.getByRole('link', { name: /★ Liverpool/ })
    expect(myteamChip.getAttribute('aria-pressed')).toBe('true')
  })

  it('shows the weekday and day number in week-view column headings', () => {
    render(<CalendarView {...props} view="week" anchor="2026-07-15" leagues={ALL} />)
    const expected = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
    }).format(new Date('2026-07-12T12:00:00Z'))
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
  })
})
