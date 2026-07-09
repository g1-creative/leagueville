import { describe, it, expect } from 'vitest'
import { formatKickoff, dateKey, dateHeading } from './time'

describe('time helpers', () => {
  it('formats kickoff in the given timezone', () => {
    expect(formatKickoff('2026-08-22T14:00:00Z', 'America/New_York')).toBe('10:00 AM')
    expect(formatKickoff('2026-08-22T14:00:00Z', 'UTC')).toBe('2:00 PM')
  })

  it('groups by local date', () => {
    expect(dateKey('2026-08-22T23:30:00Z', 'America/New_York')).toBe('2026-08-22')
    expect(dateKey('2026-08-22T23:30:00Z', 'Asia/Tokyo')).toBe('2026-08-23')
  })

  it('renders a readable heading', () => {
    expect(dateHeading('2026-08-22T14:00:00Z', 'UTC')).toBe('Saturday, August 22')
  })
})
