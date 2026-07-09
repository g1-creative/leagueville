import type { League } from './leagues'

export function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`
}

export function seasonLabel(league: League, startYear: number): string {
  if (league.seasonType === 'calendar-year') return String(startYear)
  return `${startYear}–${String((startYear + 1) % 100).padStart(2, '0')}`
}
