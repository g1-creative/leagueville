import { describe, it, expect } from 'vitest'
import { groupByRound, prettifyRound } from './rounds'
import type { Fixture } from './types'

const fixture = (id: string, kickoff: string, round?: string): Fixture => ({
  id,
  competition: 'champions-league',
  kickoff,
  status: 'scheduled',
  statusDetail: '',
  round,
  home: { id: 'h', name: 'Arsenal' },
  away: { id: 'a', name: 'Bayern Munich' },
})

describe('prettifyRound', () => {
  it('title-cases hyphenated slugs', () => {
    expect(prettifyRound('league-phase')).toBe('League Phase')
    expect(prettifyRound('quarterfinals')).toBe('Quarterfinals')
    expect(prettifyRound('knockout-round-playoffs')).toBe('Knockout Round Playoffs')
    expect(prettifyRound('first-round')).toBe('First Round')
    expect(prettifyRound('group-stage')).toBe('Group Stage')
  })

  it('uses the exceptions map where naive title-casing fails', () => {
    expect(prettifyRound('round-of-16')).toBe('Round of 16')
    expect(prettifyRound('round-of-32')).toBe('Round of 32')
    expect(prettifyRound('round-of-64')).toBe('Round of 64')
  })
})

describe('groupByRound', () => {
  it('orders rounds by earliest kickoff, not alphabetically or by input order', () => {
    const grouped = groupByRound([
      fixture('3', '2027-04-06T19:00:00.000Z', 'quarterfinals'),
      fixture('1', '2027-02-17T20:00:00.000Z', 'round-of-16'),
      fixture('2', '2027-03-09T20:00:00.000Z', 'round-of-16'),
    ])
    expect(grouped.map((g) => g.round)).toEqual(['round-of-16', 'quarterfinals'])
    expect(grouped[0].fixtures.map((f) => f.id)).toEqual(['1', '2'])
  })

  it('keeps within-round order stable', () => {
    const grouped = groupByRound([
      fixture('b', '2027-02-17T20:00:00.000Z', 'round-of-16'),
      fixture('a', '2027-02-17T20:00:00.000Z', 'round-of-16'),
    ])
    expect(grouped[0].fixtures.map((f) => f.id)).toEqual(['b', 'a'])
  })

  it('collapses fixtures without a round into a single unnamed group', () => {
    const grouped = groupByRound([
      fixture('1', '2026-08-22T14:00:00.000Z'),
      fixture('2', '2026-08-29T14:00:00.000Z'),
    ])
    expect(grouped).toHaveLength(1)
    expect(grouped[0].round).toBe('')
    expect(grouped[0].fixtures).toHaveLength(2)
  })
})
