import type { Fixture } from './types'

// Round slugs whose naive title-casing is wrong ('Round Of 16').
const EXCEPTIONS: Record<string, string> = {
  'round-of-16': 'Round of 16',
  'round-of-32': 'Round of 32',
  'round-of-64': 'Round of 64',
}

export function prettifyRound(slug: string): string {
  const exception = EXCEPTIONS[slug]
  if (exception) return exception
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export interface RoundGroup {
  round: string // raw ESPN round slug; '' for fixtures without one
  fixtures: Fixture[]
}

function earliestKickoff(fixtures: Fixture[]): string {
  return fixtures.reduce((min, f) => (f.kickoff < min ? f.kickoff : min), fixtures[0].kickoff)
}

/**
 * Group fixtures by round, ordered by each round's earliest kickoff — NOT by
 * ESPN's season.type id, which only sorts correctly by coincidence. Fixtures
 * without a round collapse into a single '' group. Within-round input order
 * is preserved.
 */
export function groupByRound(fixtures: Fixture[]): RoundGroup[] {
  const buckets = new Map<string, Fixture[]>()
  for (const f of fixtures) {
    const key = f.round ?? ''
    const bucket = buckets.get(key)
    if (bucket) bucket.push(f)
    else buckets.set(key, [f])
  }
  return [...buckets.entries()]
    .map(([round, grouped]) => ({ round, fixtures: grouped }))
    .sort((a, b) => earliestKickoff(a.fixtures).localeCompare(earliestKickoff(b.fixtures)))
}
