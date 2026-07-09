import { describe, it, expect } from 'vitest'
import { COMPETITIONS, CUPS, LEAGUES, getCompetition, getCup, getLeague, seasonRange, seasonStartYear } from './leagues'

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

describe('competition registry', () => {
  it('exposes 16 competitions: 5 leagues and 11 cups', () => {
    expect(COMPETITIONS).toHaveLength(16)
    expect(LEAGUES).toHaveLength(5)
    expect(CUPS).toHaveLength(11)
    expect(LEAGUES.every((l) => l.kind === 'league')).toBe(true)
    expect(CUPS.every((c) => c.kind === 'cup')).toBe(true)
  })

  it('keeps the exact league slugs — persisted in localStorage pick tokens', () => {
    expect(LEAGUES.map((l) => l.slug)).toEqual([
      'premier-league', 'la-liga', 'ligue-1', 'brasileirao', 'mls',
    ])
  })

  it('maps cups to their verified ESPN slugs', () => {
    expect(getCup('champions-league')?.espn).toBe('uefa.champions')
    expect(getCup('europa-league')?.espn).toBe('uefa.europa')
    expect(getCup('conference-league')?.espn).toBe('uefa.europa.conf')
    expect(getCup('fa-cup')?.espn).toBe('eng.fa')
    expect(getCup('efl-cup')?.espn).toBe('eng.league_cup')
    expect(getCup('copa-del-rey')?.espn).toBe('esp.copa_del_rey')
    expect(getCup('coupe-de-france')?.espn).toBe('fra.coupe_de_france')
    expect(getCup('us-open-cup')?.espn).toBe('usa.open')
    expect(getCup('leagues-cup')?.espn).toBe('concacaf.leagues.cup')
    expect(getCup('copa-libertadores')?.espn).toBe('conmebol.libertadores')
    expect(getCup('copa-sudamericana')?.espn).toBe('conmebol.sudamericana')
  })

  it('resolves any competition by slug; getLeague and getCup stay kind-scoped', () => {
    expect(getCompetition('fa-cup')?.kind).toBe('cup')
    expect(getCompetition('mls')?.kind).toBe('league')
    expect(getLeague('fa-cup')).toBeUndefined()
    expect(getCup('mls')).toBeUndefined()
    expect(getCompetition('copa-do-brasil')).toBeUndefined()
  })

  it('gives every league a region and tsdbName; cups have neither tsdbName', () => {
    expect(getLeague('premier-league')?.region).toBe('england')
    expect(getLeague('brasileirao')?.region).toBe('brazil')
    expect(getCup('leagues-cup')?.region).toBe('usa')
    expect(getCup('leagues-cup')?.seasonType).toBe('calendar-year')
    expect(getCup('fa-cup')?.seasonType).toBe('cross-year')
    expect(LEAGUES.every((l) => typeof l.tsdbName === 'string')).toBe(true)
    expect(CUPS.every((c) => c.tsdbName === undefined)).toBe(true)
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
