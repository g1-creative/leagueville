import { describe, it, expect } from 'vitest'
import { normalizePlayer, sortPlayers } from './roster'

describe('normalizePlayer', () => {
  it('maps an ESPN athlete', () => {
    const p = normalizePlayer({
      id: '150225',
      displayName: 'Bukayo Saka',
      jersey: '7',
      age: 24,
      citizenship: 'England',
      flag: { href: 'https://a.espncdn.com/eng.png' },
      position: { displayName: 'Forward' },
    })
    expect(p).toEqual({
      id: '150225',
      name: 'Bukayo Saka',
      position: 'Forward',
      jersey: '7',
      age: 24,
      nationality: 'England',
      flag: 'https://a.espncdn.com/eng.png',
    })
  })

  it('tolerates missing fields', () => {
    const p = normalizePlayer({ id: '1', displayName: 'Trialist' })
    expect(p.position).toBeUndefined()
    expect(p.jersey).toBeUndefined()
  })
})

describe('sortPlayers', () => {
  it('orders GK, DEF, MID, FWD then jersey number', () => {
    const names = sortPlayers([
      { id: '1', name: 'Fwd9', position: 'Forward', jersey: '9' },
      { id: '2', name: 'GK1', position: 'Goalkeeper', jersey: '1' },
      { id: '3', name: 'Mid8', position: 'Midfielder', jersey: '8' },
      { id: '4', name: 'Def2', position: 'Defender', jersey: '2' },
      { id: '5', name: 'Fwd7', position: 'Forward', jersey: '7' },
      { id: '6', name: 'NoPos' },
    ]).map((p) => p.name)
    expect(names).toEqual(['GK1', 'Def2', 'Mid8', 'Fwd7', 'Fwd9', 'NoPos'])
  })
})
