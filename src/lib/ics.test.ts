import { describe, it, expect } from 'vitest'
import { buildIcs, fixturesToCalEvents, googleCalendarUrl, type CalEvent } from './ics'
import type { Fixture } from './types'

const dtstamp = new Date('2026-07-08T00:00:00Z')

const ev: CalEvent = {
  uid: 'premier-league-760001@leagueville',
  start: new Date('2026-08-22T14:00:00Z'),
  title: '⚽ Everton vs Crystal Palace',
  location: 'Goodison Park, Liverpool',
  description: 'Premier League',
}

describe('buildIcs', () => {
  const ics = buildIcs('Premier League — Leagueville', [ev], dtstamp)

  it('produces a well-formed VCALENDAR', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('UID:premier-league-760001@leagueville')
    expect(ics).toContain('DTSTAMP:20260708T000000Z')
    expect(ics).toContain('DTSTART:20260822T140000Z')
    expect(ics).toContain('DURATION:PT120M')
  })

  it('uses CRLF exclusively', () => {
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('escapes commas in text fields', () => {
    expect(ics).toContain('LOCATION:Goodison Park\\, Liverpool')
  })

  it('folds lines longer than 74 chars with a leading space', () => {
    const long = buildIcs('X', [{ ...ev, title: '⚽ ' + 'Very Long Team Name United '.repeat(5) + ' vs Opponent' }], dtstamp)
    const lines = long.split('\r\n')
    expect(lines.some((l) => l.startsWith(' '))).toBe(true)
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(75)
  })
})

describe('fixturesToCalEvents', () => {
  const base: Fixture = {
    id: '1', league: 'premier-league', kickoff: '2026-08-22T14:00:00.000Z',
    status: 'scheduled', statusDetail: '', venue: 'Anfield',
    home: { id: 'h', name: 'Liverpool' }, away: { id: 'a', name: 'Everton' },
  }

  it('maps fixtures and skips postponed', () => {
    const events = fixturesToCalEvents(
      [base, { ...base, id: '2', status: 'postponed' }],
      'Premier League',
    )
    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('premier-league-1@leagueville')
    expect(events[0].title).toBe('⚽ Liverpool vs Everton')
    expect(events[0].location).toBe('Anfield')
    expect(events[0].start.toISOString()).toBe('2026-08-22T14:00:00.000Z')
  })

  it('appends the final score for finished games', () => {
    const events = fixturesToCalEvents(
      [{ ...base, status: 'final', home: { id: 'h', name: 'Liverpool', score: 2 }, away: { id: 'a', name: 'Everton', score: 1 } }],
      'Premier League',
    )
    expect(events[0].description).toBe('Premier League — FT 2–1')
  })
})

describe('googleCalendarUrl', () => {
  const url = new URL(googleCalendarUrl(ev))

  it('points at the Google template renderer', () => {
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
  })

  it('carries the title, location and description', () => {
    expect(url.searchParams.get('text')).toBe('⚽ Everton vs Crystal Palace')
    expect(url.searchParams.get('location')).toBe('Goodison Park, Liverpool')
    expect(url.searchParams.get('details')).toBe('Premier League')
  })

  it('spans start to start-plus-duration in compact UTC', () => {
    expect(url.searchParams.get('dates')).toBe('20260822T140000Z/20260822T160000Z')
  })

  it('honours a custom duration', () => {
    const custom = new URL(googleCalendarUrl({ ...ev, durationMinutes: 90 }))
    expect(custom.searchParams.get('dates')).toBe('20260822T140000Z/20260822T153000Z')
  })

  it('omits location and details when absent', () => {
    const bare = new URL(googleCalendarUrl({ uid: 'u', start: ev.start, title: 'T' }))
    expect(bare.searchParams.has('location')).toBe(false)
    expect(bare.searchParams.has('details')).toBe(false)
  })
})
