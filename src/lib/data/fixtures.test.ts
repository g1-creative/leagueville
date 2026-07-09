import { describe, it, expect } from 'vitest'
import { normalizeEvent, type RawEvent } from './fixtures'

const finalEvent: RawEvent = {
  id: '2267073',
  date: '2025-08-15T19:00Z',
  competitions: [{
    venue: { fullName: 'Anfield' },
    status: { type: { state: 'post', completed: true, description: 'Full Time', detail: 'FT', shortDetail: 'FT' } },
    competitors: [
      { homeAway: 'home', winner: true, score: '4', team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV', logo: 'https://a.espncdn.com/liv.png' } },
      { homeAway: 'away', winner: false, score: '2', team: { id: '349', displayName: 'AFC Bournemouth', abbreviation: 'BOU', logo: 'https://a.espncdn.com/bou.png' } },
    ],
  }],
}

const scheduledEvent: RawEvent = {
  id: '760001',
  date: '2026-08-22T14:00Z',
  competitions: [{
    status: { type: { state: 'pre', completed: false, description: 'Scheduled', detail: 'Sat, August 22nd at 2:00 PM UTC', shortDetail: '8/22 - 2:00 PM UTC' } },
    competitors: [
      { homeAway: 'home', team: { id: '368', displayName: 'Everton' } },
      { homeAway: 'away', team: { id: '384', displayName: 'Crystal Palace' } },
    ],
  }],
}

// shape returned by the /teams/{id}/schedule endpoint: object scores, logos array
const scheduleShapeEvent: RawEvent = {
  id: '761440',
  date: '2026-05-02T23:30Z',
  competitions: [{
    status: { type: { state: 'post', completed: true, description: 'Full Time', detail: 'FT', shortDetail: 'FT' } },
    competitors: [
      { homeAway: 'home', winner: true, score: { value: 2, displayValue: '2' }, team: { id: '18267', displayName: 'FC Cincinnati', logos: [{ href: 'https://a.espncdn.com/cin.png' }] } },
      { homeAway: 'away', winner: false, score: { value: 0, displayValue: '0' }, team: { id: '18418', displayName: 'Atlanta United FC', logos: [{ href: 'https://a.espncdn.com/atl.png' }] } },
    ],
  }],
}

const postponedEvent: RawEvent = {
  ...scheduledEvent,
  id: '760002',
  competitions: [{
    ...scheduledEvent.competitions[0],
    status: { type: { state: 'pre', completed: false, description: 'Postponed', detail: 'Postponed', shortDetail: 'PPD' } },
  }],
}

describe('normalizeEvent', () => {
  it('normalizes a finished game', () => {
    const f = normalizeEvent(finalEvent, 'premier-league')!
    expect(f.id).toBe('2267073')
    expect(f.competition).toBe('premier-league')
    expect(f.kickoff).toBe('2025-08-15T19:00:00.000Z')
    expect(f.status).toBe('final')
    expect(f.statusDetail).toBe('FT')
    expect(f.venue).toBe('Anfield')
    expect(f.home).toMatchObject({ id: '364', name: 'Liverpool', abbrev: 'LIV', score: 4, winner: true, logo: 'https://a.espncdn.com/liv.png' })
    expect(f.away.score).toBe(2)
  })

  it('normalizes a scheduled game with no scores', () => {
    const f = normalizeEvent(scheduledEvent, 'premier-league')!
    expect(f.status).toBe('scheduled')
    expect(f.home.score).toBeUndefined()
    expect(f.venue).toBeUndefined()
  })

  it('handles schedule-endpoint shape (object score, logos array)', () => {
    const f = normalizeEvent(scheduleShapeEvent, 'mls')!
    expect(f.home.score).toBe(2)
    expect(f.away.score).toBe(0)
    expect(f.home.logo).toBe('https://a.espncdn.com/cin.png')
  })

  it('flags postponed games', () => {
    expect(normalizeEvent(postponedEvent, 'premier-league')!.status).toBe('postponed')
  })

  it('returns null for malformed events', () => {
    expect(normalizeEvent({ id: 'x', date: '2026-01-01T00:00Z', competitions: [] }, 'mls')).toBeNull()
  })
})
