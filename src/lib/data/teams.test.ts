import { describe, it, expect } from 'vitest'
import { normalizeTeam } from './teams'

describe('normalizeTeam', () => {
  it('normalizes an ESPN team with slug and logo', () => {
    const t = normalizeTeam({
      id: '1068',
      displayName: 'Atlético Madrid',
      shortDisplayName: 'Atlético',
      abbreviation: 'ATM',
      location: 'Madrid',
      logos: [{ href: 'https://a.espncdn.com/atm.png' }],
    })
    expect(t).toEqual({
      id: '1068',
      slug: 'atletico-madrid',
      name: 'Atlético Madrid',
      shortName: 'Atlético',
      abbrev: 'ATM',
      logo: 'https://a.espncdn.com/atm.png',
      location: 'Madrid',
    })
  })

  it('tolerates missing optional fields', () => {
    const t = normalizeTeam({ id: '9', displayName: 'Some Club' })
    expect(t.slug).toBe('some-club')
    expect(t.shortName).toBe('Some Club')
    expect(t.logo).toBeUndefined()
  })
})
