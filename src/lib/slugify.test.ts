import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Manchester United')).toBe('manchester-united')
  })
  it('strips diacritics', () => {
    expect(slugify('Atlético Madrid')).toBe('atletico-madrid')
    expect(slugify('São Paulo')).toBe('sao-paulo')
  })
  it('collapses punctuation runs and trims hyphens', () => {
    expect(slugify('St. Louis CITY SC')).toBe('st-louis-city-sc')
    expect(slugify('  Paris Saint-Germain ')).toBe('paris-saint-germain')
  })
})
