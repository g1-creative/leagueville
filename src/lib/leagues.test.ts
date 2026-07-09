import { describe, it, expect } from 'vitest'
import { LEAGUES, getLeague, seasonRange, seasonStartYear } from './leagues'

describe('league registry', () => {
  it('has the 5 leagues in display order', () => {
    expect(LEAGUES.map((l) => l.slug)).toEqual([
      'premier-league', 'la-liga', 'ligue-1', 'brasileirao', 'mls',
    ])
    expect(getLeague('premier-league')?.espn).toBe('eng.1')
    expect(getLeague('mls')?.espn).toBe('usa.1')
    expect(getLeague('nope')).toBeUndefined()
  })
})

describe('seasonRange', () => {
  const epl = getLeague('premier-league')!
  const mls = getLeague('mls')!

  it('cross-year league in July belongs to the upcoming season', () => {
    expect(seasonRange(epl, new Date('2026-07-08T12:00:00Z'))).toEqual({
      start: '20260801', end: '20270630',
    })
    expect(seasonStartYear(epl, new Date('2026-07-08T12:00:00Z'))).toBe(2026)
  })

  it('cross-year league in March belongs to the running season', () => {
    expect(seasonRange(epl, new Date('2026-03-01T12:00:00Z'))).toEqual({
      start: '20250801', end: '20260630',
    })
  })

  it('calendar-year league spans the current year', () => {
    expect(seasonRange(mls, new Date('2026-07-08T12:00:00Z'))).toEqual({
      start: '20260101', end: '20261231',
    })
    expect(seasonStartYear(mls, new Date('2026-07-08T12:00:00Z'))).toBe(2026)
  })
})
