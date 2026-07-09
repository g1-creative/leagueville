import type { Metadata } from 'next'
import { CalendarView } from '@/components/CalendarView'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { parseAnchor, parseView, viewSpan } from '@/lib/calendar'
import { LEAGUES } from '@/lib/leagues'

export const metadata: Metadata = {
  title: 'Calendar — Leagueville',
  description: 'Every Premier League, La Liga, Ligue 1, Brasileirão and MLS game on one calendar.',
}

const ALL_SLUGS = LEAGUES.map((l) => l.slug)

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string; leagues?: string; myteam?: string }>
}) {
  const sp = await searchParams
  const now = new Date()
  const view = parseView(sp.view)
  const anchor = parseAnchor(sp.d, now)
  const today = now.toISOString().slice(0, 10)

  const requested = (sp.leagues ?? '').split(',').filter((s) => ALL_SLUGS.includes(s as never))
  const leagues = requested.length > 0 ? requested : ALL_SLUGS

  const seasons = await Promise.all(LEAGUES.map((l) => getSeasonFixtures(l).catch(() => [])))
  const { from, to } = viewSpan(anchor, view)
  const fixtures = seasons
    .flat()
    .filter((f) => {
      const day = f.kickoff.slice(0, 10)
      return day >= from && day <= to
    })
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  return (
    <CalendarView
      view={view}
      anchor={anchor}
      today={today}
      leagues={leagues}
      myteam={sp.myteam === '1'}
      fixtures={fixtures}
    />
  )
}
