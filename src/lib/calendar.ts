import { LEAGUES, seasonRange } from './leagues'
import { dateKey } from './time'
import type { Fixture } from './types'

export type CalendarView = 'month' | 'week' | 'day'

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function toUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** True only for a well-formed key naming a real calendar day. */
function isValidKey(key: string): boolean {
  return KEY_RE.test(key) && toKey(toUtc(key)) === key
}

export function parseView(v: string | undefined): CalendarView {
  return v === 'week' || v === 'day' ? v : 'month'
}

export function parseAnchor(d: string | undefined, now: Date = new Date()): string {
  return d !== undefined && isValidKey(d) ? d : toKey(now)
}

export function addDays(key: string, n: number): string {
  const d = toUtc(key)
  d.setUTCDate(d.getUTCDate() + n)
  return toKey(d)
}

export function monthOf(key: string): string {
  return key.slice(0, 7)
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
}

function addMonths(key: string, n: number): string {
  const d = toUtc(key)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + n
  const targetYear = y + Math.floor(m / 12)
  const targetMonth = ((m % 12) + 12) % 12
  const day = Math.min(d.getUTCDate(), daysInMonth(targetYear, targetMonth))
  return toKey(new Date(Date.UTC(targetYear, targetMonth, day)))
}

export function shiftAnchor(key: string, view: CalendarView, delta: number): string {
  if (view === 'month') return addMonths(key, delta)
  return addDays(key, delta * (view === 'week' ? 7 : 1))
}

/** The Sunday of the anchor's week, through the following Saturday. */
export function weekKeys(key: string): string[] {
  const start = addDays(key, -toUtc(key).getUTCDay())
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 42 consecutive days: six Sunday-start weeks covering the anchor's month. */
export function monthGridKeys(key: string): string[] {
  const first = `${monthOf(key)}-01`
  const start = addDays(first, -toUtc(first).getUTCDay())
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/**
 * The UTC day range a view needs, padded a day on each side. The padding
 * covers UTC-12..UTC+14: a fixture at a boundary shifts at most one day.
 */
export function viewSpan(key: string, view: CalendarView): { from: string; to: string } {
  if (view === 'day') return { from: addDays(key, -1), to: addDays(key, 1) }
  const keys = view === 'week' ? weekKeys(key) : monthGridKeys(key)
  return { from: addDays(keys[0], -1), to: addDays(keys[keys.length - 1], 1) }
}

function hyphenate(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
}

/** The union of every league's season: earliest start to latest end. */
export function seasonDayBounds(now: Date = new Date()): { from: string; to: string } {
  const ranges = LEAGUES.map((l) => seasonRange(l, now))
  return {
    from: ranges.map((r) => hyphenate(r.start)).sort()[0],
    to: ranges.map((r) => hyphenate(r.end)).sort().reverse()[0],
  }
}

/**
 * The view's real day range (no grid padding, no cross-boundary bleed),
 * used to test season-bounds overlap without a neighboring month's grid
 * days falsely extending the range.
 */
function realSpan(key: string, view: CalendarView): { from: string; to: string } {
  if (view === 'day') return { from: key, to: key }
  if (view === 'week') {
    const keys = weekKeys(key)
    return { from: keys[0], to: keys[keys.length - 1] }
  }
  const first = `${monthOf(key)}-01`
  const d = toUtc(first)
  const last = toKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
  return { from: first, to: last }
}

/** Can we navigate there? Only if the destination view overlaps the season. */
export function canShift(
  key: string,
  view: CalendarView,
  delta: number,
  bounds: { from: string; to: string },
): boolean {
  const span = realSpan(shiftAnchor(key, view, delta), view)
  return span.to >= bounds.from && span.from <= bounds.to
}

/** Group fixtures by their calendar day in `tz`, each day sorted by kickoff. */
export function bucketByDay(fixtures: Fixture[], tz: string): Map<string, Fixture[]> {
  const map = new Map<string, Fixture[]>()
  for (const f of fixtures) {
    const key = dateKey(f.kickoff, tz)
    const bucket = map.get(key)
    if (bucket) bucket.push(f)
    else map.set(key, [f])
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  }
  return map
}
