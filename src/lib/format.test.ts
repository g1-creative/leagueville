import { describe, it, expect } from 'vitest'
import { ordinal, seasonLabel } from './format'
import { getLeague } from './leagues'

describe('ordinal', () => {
  it('handles standard suffixes', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
  })
  it('handles the teens', () => {
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
  })
  it('handles twenty-plus', () => {
    expect(ordinal(21)).toBe('21st')
    expect(ordinal(22)).toBe('22nd')
    expect(ordinal(101)).toBe('101st')
  })
})

describe('seasonLabel', () => {
  it('formats cross-year seasons', () => {
    expect(seasonLabel(getLeague('premier-league')!, 2024)).toBe('2024–25')
    expect(seasonLabel(getLeague('la-liga')!, 1999)).toBe('1999–00')
  })
  it('formats calendar-year seasons', () => {
    expect(seasonLabel(getLeague('mls')!, 2024)).toBe('2024')
  })
})
