import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('picks store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  it('toggles a pick on and off, persisting to localStorage', async () => {
    const { togglePick } = await import('./picks')
    togglePick('premier-league:1')
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual(['premier-league:1'])
    togglePick('mls:9')
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual(['premier-league:1', 'mls:9'])
    togglePick('premier-league:1')
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual(['mls:9'])
  })

  it('clears all picks', async () => {
    const { togglePick, clearPicks } = await import('./picks')
    togglePick('mls:9')
    clearPicks()
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual([])
  })

  it('survives corrupt storage', async () => {
    window.localStorage.setItem('lv-picks', '{not json')
    const { togglePick } = await import('./picks')
    togglePick('mls:9')
    expect(JSON.parse(window.localStorage.getItem('lv-picks')!)).toEqual(['mls:9'])
  })
})
