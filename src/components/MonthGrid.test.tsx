import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Fixture } from '@/lib/types'
import { MonthGrid } from './MonthGrid'

const fx = (id: string, kickoff: string, home = 'Liverpool', away = 'Everton'): Fixture => ({
  id,
  league: 'premier-league',
  kickoff,
  status: 'scheduled',
  statusDetail: '',
  home: { id: `h${id}`, name: home },
  away: { id: `a${id}`, name: away },
})

const cell = (day: string) => screen.getByRole('button', { name: new RegExp(`^${day}\\b`) })

describe('MonthGrid', () => {
  it('renders 42 day cells', () => {
    render(<MonthGrid anchor="2026-07-09" fixtures={[]} today="2026-07-09" onSelectDay={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(42)
  })

  it('places a fixture in its viewer-timezone day cell', () => {
    render(
      <MonthGrid anchor="2026-07-09" fixtures={[fx('1', '2026-07-15T14:00:00.000Z')]} today="2026-07-09" onSelectDay={() => {}} />,
    )
    expect(within(cell('15')).getByText(/Liverpool/)).toBeDefined()
  })

  it('caps chips at three and counts the remainder', () => {
    const fixtures = ['10', '11', '12', '13', '14'].map((h, i) =>
      fx(String(i), `2026-07-15T${h}:00:00.000Z`, `Home${i}`, `Away${i}`),
    )
    render(<MonthGrid anchor="2026-07-09" fixtures={fixtures} today="2026-07-09" onSelectDay={() => {}} />)
    const target = cell('15')
    expect(within(target).getByText('Home0')).toBeDefined()
    expect(within(target).getByText('Home2')).toBeDefined()
    expect(within(target).queryByText('Home3')).toBeNull()
    expect(within(target).getByText('+2 more')).toBeDefined()
  })

  it('shows a dot row and a game count for the mobile layout', () => {
    render(
      <MonthGrid anchor="2026-07-09" fixtures={[fx('1', '2026-07-15T14:00:00.000Z')]} today="2026-07-09" onSelectDay={() => {}} />,
    )
    const dots = within(cell('15')).getByTestId('day-dots')
    expect(dots.textContent).toContain('1')
  })

  it('reports the clicked day', () => {
    const onSelectDay = vi.fn()
    render(<MonthGrid anchor="2026-07-09" fixtures={[]} today="2026-07-09" onSelectDay={onSelectDay} />)
    fireEvent.click(cell('15'))
    expect(onSelectDay).toHaveBeenCalledWith('2026-07-15')
  })

  it('marks adjacent-month days and today', () => {
    render(<MonthGrid anchor="2026-07-09" fixtures={[]} today="2026-07-09" onSelectDay={() => {}} />)
    expect(cell('9').getAttribute('data-today')).toBe('true')
    expect(cell('9').getAttribute('data-outside')).toBe('false')
    // The grid starts Sunday 2026-06-28, an adjacent-month day. Day numbers
    // 28-30 appear twice in this grid, so index rather than match by name.
    const cells = screen.getAllByRole('button')
    expect(cells[0].getAttribute('data-outside')).toBe('true')
    expect(cells[41].getAttribute('data-outside')).toBe('true')
  })
})
