import { describe, it, expect } from 'vitest'
import { normalizeBios } from './bio'

describe('normalizeBios', () => {
  it('keys bios by ESPN id and cleans nulls', () => {
    const map = normalizeBios({
      teams: [
        {
          idESPN: '359',
          strDescriptionEN: 'Arsenal Football Club is...',
          strBanner: 'https://r2.thesportsdb.com/ars-banner.jpg',
          strStadium: 'Emirates Stadium',
          intFormedYear: '1886',
        },
        { idESPN: null, strDescriptionEN: 'No espn id — skipped' },
        { idESPN: '368', strDescriptionEN: null, strBanner: null, strStadium: 'Goodison Park', intFormedYear: null },
      ],
    })
    expect(map.get('359')).toEqual({
      description: 'Arsenal Football Club is...',
      banner: 'https://r2.thesportsdb.com/ars-banner.jpg',
      stadium: 'Emirates Stadium',
      founded: 1886,
    })
    expect(map.get('368')).toEqual({ description: undefined, banner: undefined, stadium: 'Goodison Park', founded: undefined })
    expect(map.size).toBe(2)
  })

  it('handles a null teams payload', () => {
    expect(normalizeBios({ teams: null }).size).toBe(0)
  })
})
