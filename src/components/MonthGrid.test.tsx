import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { bucketByDay } from '@/lib/calendar'
import type { Fixture } from '@/lib/types'
import { MonthGrid } from './MonthGrid'
import { TimezoneProvider } from './TimezoneProvider'

const fx = (id: string, kickoff: string, home = 'Liverpool', away = 'Everton'): Fixture => ({
  id,
  competition: 'premier-league',
  kickoff,
  status: 'scheduled',
  statusDetail: '',
  home: { id: `h${id}`, name: home },
  away: { id: `a${id}`, name: away },
})

const cell = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}\\b`) })

describe('MonthGrid', () => {
  it('renders 42 day cells', () => {
    render(<MonthGrid anchor="2026-07-09" byDay={new Map()} onSelectDay={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(42)
  })

  it('places a fixture in the day cell its bucket map keys it under', () => {
    // 2026-07-15T03:00:00.000Z is 18:00 the previous day in Los Angeles
    // (UTC-7). Bucketing with that tz should shift the fixture back a day —
    // proving MonthGrid trusts the map's keys rather than the raw UTC date.
    const byDay = bucketByDay([fx('1', '2026-07-15T03:00:00.000Z')], 'America/Los_Angeles')
    render(<MonthGrid anchor="2026-07-09" byDay={byDay} onSelectDay={() => {}} />)
    expect(within(cell('July 14, 2026')).getByText(/Liverpool/)).toBeDefined()
    expect(within(cell('July 15, 2026')).queryByText(/Liverpool/)).toBeNull()
  })

  it('caps chips at three, shows them in ascending kickoff order, and counts the remainder', () => {
    // Array order deliberately does not match kickoff order, so this test
    // fails if bucketByDay's sort is ever removed.
    const shuffledHours = ['14', '10', '13', '11', '12']
    const fixtures = shuffledHours.map((h, i) => fx(String(i), `2026-07-15T${h}:00:00.000Z`, `Hour${h}`, `Away${i}`))
    const byDay = bucketByDay(fixtures, 'UTC')
    render(<MonthGrid anchor="2026-07-09" byDay={byDay} onSelectDay={() => {}} />)
    const target = cell('July 15, 2026')

    // Earliest three kickoffs, in ascending order: 10:00, 11:00, 12:00.
    expect(within(target).getByText('Hour10')).toBeDefined()
    expect(within(target).getByText('Hour11')).toBeDefined()
    expect(within(target).getByText('Hour12')).toBeDefined()
    // Later kickoffs are hidden behind the "+2 more" summary.
    expect(within(target).queryByText('Hour13')).toBeNull()
    expect(within(target).queryByText('Hour14')).toBeNull()
    expect(within(target).getByText('+2 more')).toBeDefined()

    const chipNames = within(target)
      .getAllByText(/^Hour\d{2}$/)
      .map((el) => el.textContent)
    expect(chipNames).toEqual(['Hour10', 'Hour11', 'Hour12'])
  })

  it('shows a dot row and a game count for the mobile layout', () => {
    const byDay = bucketByDay([fx('1', '2026-07-15T14:00:00.000Z')], 'UTC')
    render(<MonthGrid anchor="2026-07-09" byDay={byDay} onSelectDay={() => {}} />)
    const dots = within(cell('July 15, 2026')).getByTestId('day-dots')
    expect(dots.textContent).toContain('1')
  })

  it('reports the clicked day', () => {
    const onSelectDay = vi.fn()
    render(<MonthGrid anchor="2026-07-09" byDay={new Map()} onSelectDay={onSelectDay} />)
    fireEvent.click(cell('July 15, 2026'))
    expect(onSelectDay).toHaveBeenCalledWith('2026-07-15')
  })

  it('names the day cell with its full date and game count', () => {
    render(<MonthGrid anchor="2026-07-09" byDay={new Map()} onSelectDay={() => {}} />)
    expect(cell('July 15, 2026').getAttribute('aria-label')).toBe('July 15, 2026 — no games')
  })

  it('marks adjacent-month days and today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-09T12:00:00Z'))
    try {
      render(<MonthGrid anchor="2026-07-09" byDay={new Map()} onSelectDay={() => {}} />)
      expect(cell('July 9, 2026').getAttribute('data-today')).toBe('true')
      expect(cell('July 9, 2026').getAttribute('data-outside')).toBe('false')
      // The grid starts Sunday 2026-06-28, an adjacent-month day. Day numbers
      // 28-30 appear twice in this grid, so index rather than match by name.
      const cells = screen.getAllByRole('button')
      expect(cells[0].getAttribute('data-outside')).toBe('true')
      expect(cells[41].getAttribute('data-outside')).toBe('true')
    } finally {
      vi.useRealTimers()
    }
  })

  it('rings the viewer-local today, not the UTC day, when they differ', () => {
    // 2026-07-15T02:00:00Z is already 2026-07-15 in UTC, but still
    // 2026-07-14 in America/Los_Angeles (UTC-7). The ring must land on the
    // viewer's local day, not the server/UTC day.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T02:00:00Z'))
    window.localStorage.setItem('lv-tz', 'America/Los_Angeles')
    try {
      render(
        <TimezoneProvider>
          <MonthGrid anchor="2026-07-09" byDay={new Map()} onSelectDay={() => {}} />
        </TimezoneProvider>,
      )
      expect(cell('July 14, 2026').getAttribute('data-today')).toBe('true')
      expect(cell('July 15, 2026').getAttribute('data-today')).toBe('false')
    } finally {
      window.localStorage.removeItem('lv-tz')
      vi.useRealTimers()
    }
  })
})
