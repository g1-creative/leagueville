import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LeagueSheet } from './LeagueSheet'

describe('LeagueSheet', () => {
  it('renders nothing while closed', () => {
    const { container } = render(<LeagueSheet open={false} onClose={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('lists the five leagues as links that close the sheet on tap', () => {
    const onClose = vi.fn()
    render(<LeagueSheet open onClose={onClose} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(5)
    expect(screen.getByText('Premier League').closest('a')?.getAttribute('href')).toBe('/premier-league')
    expect(screen.getByText('MLS').closest('a')?.getAttribute('href')).toBe('/mls')
    expect(screen.getAllByText('MLS')).toHaveLength(1)
    fireEvent.click(screen.getByText('La Liga'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows the pin explainer only when hint is set', () => {
    const { rerender } = render(<LeagueSheet open onClose={() => {}} />)
    expect(screen.queryByText(/No team pinned/)).toBeNull()
    rerender(<LeagueSheet open hint onClose={() => {}} />)
    expect(screen.getByText(/No team pinned — pick a league, open a team/)).toBeDefined()
  })

  it('closes on Escape and on backdrop tap', () => {
    const onClose = vi.fn()
    render(<LeagueSheet open onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Close leagues' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('moves focus into the sheet on open and restores it on close', () => {
    const { rerender } = render(
      <>
        <button>opener</button>
        <LeagueSheet open={false} onClose={() => {}} />
      </>,
    )
    screen.getByText('opener').focus()
    rerender(
      <>
        <button>opener</button>
        <LeagueSheet open onClose={() => {}} />
      </>,
    )
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
    rerender(
      <>
        <button>opener</button>
        <LeagueSheet open={false} onClose={() => {}} />
      </>,
    )
    expect(document.activeElement).toBe(screen.getByText('opener'))
  })
})
