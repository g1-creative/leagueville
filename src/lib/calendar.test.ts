import { describe, it, expect } from 'vitest'
import {
  addDays,
  bucketByDay,
  canShift,
  monthGridKeys,
  monthOf,
  parseAnchor,
  parseView,
  seasonDayBounds,
  shiftAnchor,
  viewSpan,
  weekKeys,
} from './calendar'
import type { Fixture } from './types'

describe('parseView', () => {
  it('accepts the three views', () => {
    expect(parseView('month')).toBe('month')
    expect(parseView('week')).toBe('week')
    expect(parseView('day')).toBe('day')
  })

  it('falls back to month for anything else', () => {
    expect(parseView(undefined)).toBe('month')
    expect(parseView('year')).toBe('month')
  })
})

describe('parseAnchor', () => {
  const now = new Date('2026-07-09T23:30:00Z')

  it('accepts a valid key', () => {
    expect(parseAnchor('2026-08-22', now)).toBe('2026-08-22')
  })

  it('falls back to today (UTC) for missing or malformed input', () => {
    expect(parseAnchor(undefined, now)).toBe('2026-07-09')
    expect(parseAnchor('nonsense', now)).toBe('2026-07-09')
    expect(parseAnchor('2026-13-01', now)).toBe('2026-07-09')
    expect(parseAnchor('2026-02-30', now)).toBe('2026-07-09')
  })
})

describe('addDays', () => {
  it('rolls over months and years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('shiftAnchor', () => {
  it('shifts by one day', () => {
    expect(shiftAnchor('2026-07-09', 'day', 1)).toBe('2026-07-10')
    expect(shiftAnchor('2026-07-09', 'day', -1)).toBe('2026-07-08')
  })

  it('shifts by seven days for week', () => {
    expect(shiftAnchor('2026-07-09', 'week', 1)).toBe('2026-07-16')
    expect(shiftAnchor('2026-07-09', 'week', -1)).toBe('2026-07-02')
  })

  it('shifts by one month, clamping the day', () => {
    expect(shiftAnchor('2026-07-09', 'month', 1)).toBe('2026-08-09')
    expect(shiftAnchor('2026-01-31', 'month', 1)).toBe('2026-02-28')
    expect(shiftAnchor('2026-03-31', 'month', -1)).toBe('2026-02-28')
    expect(shiftAnchor('2026-12-15', 'month', 1)).toBe('2027-01-15')
  })
})

describe('weekKeys', () => {
  it('returns Sunday through Saturday containing the anchor', () => {
    // 2026-07-09 is a Thursday.
    expect(weekKeys('2026-07-09')).toEqual([
      '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08',
      '2026-07-09', '2026-07-10', '2026-07-11',
    ])
  })

  it('returns the same week when the anchor is the Sunday', () => {
    expect(weekKeys('2026-07-05')[0]).toBe('2026-07-05')
  })
})

describe('monthGridKeys', () => {
  it('returns 42 consecutive days starting on a Sunday', () => {
    const keys = monthGridKeys('2026-07-09')
    expect(keys).toHaveLength(42)
    expect(keys[0]).toBe('2026-06-28') // Sunday before July 1 (a Wednesday)
    expect(keys[41]).toBe('2026-08-08')
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).toBe(addDays(keys[i - 1], 1))
    }
  })

  it('includes every day of the anchor month', () => {
    const keys = monthGridKeys('2026-02-14')
    expect(keys).toContain('2026-02-01')
    expect(keys).toContain('2026-02-28')
  })

  it('starts on the 1st when the 1st is a Sunday', () => {
    // 2026-11-01 is a Sunday.
    expect(monthGridKeys('2026-11-20')[0]).toBe('2026-11-01')
  })
})

describe('viewSpan', () => {
  it('pads the month grid by a day on each side', () => {
    expect(viewSpan('2026-07-09', 'month')).toEqual({ from: '2026-06-27', to: '2026-08-09' })
  })

  it('pads the week by a day on each side', () => {
    expect(viewSpan('2026-07-09', 'week')).toEqual({ from: '2026-07-04', to: '2026-07-12' })
  })

  it('pads the day by a day on each side', () => {
    expect(viewSpan('2026-07-09', 'day')).toEqual({ from: '2026-07-08', to: '2026-07-10' })
  })
})

describe('seasonDayBounds', () => {
  it('spans the union of every league season', () => {
    // In July 2026: cross-year leagues run 2026-08-01..2027-06-30,
    // calendar-year leagues run 2026-01-01..2026-12-31.
    expect(seasonDayBounds(new Date('2026-07-09T00:00:00Z'))).toEqual({
      from: '2026-01-01',
      to: '2027-06-30',
    })
  })
})

describe('canShift', () => {
  const bounds = { from: '2026-01-01', to: '2027-06-30' }

  it('allows a shift whose span overlaps the bounds', () => {
    expect(canShift('2026-07-09', 'month', 1, bounds)).toBe(true)
    expect(canShift('2027-06-15', 'month', -1, bounds)).toBe(true)
  })

  it('rejects a shift entirely outside the bounds', () => {
    expect(canShift('2027-06-15', 'month', 1, bounds)).toBe(false)
    expect(canShift('2026-01-15', 'month', -1, bounds)).toBe(false)
  })
})

describe('monthOf', () => {
  it('extracts the year-month', () => {
    expect(monthOf('2026-07-09')).toBe('2026-07')
  })
})

const fixture = (id: string, kickoff: string): Fixture => ({
  id,
  competition: 'premier-league',
  kickoff,
  status: 'scheduled',
  statusDetail: '',
  home: { id: 'h', name: 'Liverpool' },
  away: { id: 'a', name: 'Everton' },
})

describe('bucketByDay', () => {
  it('groups fixtures by the viewer-timezone day', () => {
    const map = bucketByDay([fixture('1', '2026-08-22T14:00:00.000Z')], 'UTC')
    expect([...map.keys()]).toEqual(['2026-08-22'])
  })

  it('moves a late kickoff to the next day in a forward timezone', () => {
    // 23:00 UTC is 09:00 the next day in Sydney (UTC+10).
    const map = bucketByDay([fixture('1', '2026-08-22T23:00:00.000Z')], 'Australia/Sydney')
    expect([...map.keys()]).toEqual(['2026-08-23'])
  })

  it('moves an early kickoff to the previous day in a backward timezone', () => {
    // 01:00 UTC is 18:00 the previous day in Los Angeles (UTC-7).
    const map = bucketByDay([fixture('1', '2026-08-22T01:00:00.000Z')], 'America/Los_Angeles')
    expect([...map.keys()]).toEqual(['2026-08-21'])
  })

  it('keeps fixtures within a day sorted by kickoff', () => {
    const map = bucketByDay(
      [fixture('late', '2026-08-22T16:00:00.000Z'), fixture('early', '2026-08-22T12:00:00.000Z')],
      'UTC',
    )
    expect(map.get('2026-08-22')!.map((f) => f.id)).toEqual(['early', 'late'])
  })
})
