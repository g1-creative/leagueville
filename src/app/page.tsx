import Link from 'next/link'
import { AutoRefresh } from '@/components/AutoRefresh'
import { FixtureList } from '@/components/FixtureList'
import { Section } from '@/components/Section'
import { getScoreboardWindow, getSeasonFixtures } from '@/lib/data/fixtures'
import { LEAGUES } from '@/lib/leagues'
import type { Fixture } from '@/lib/types'

export default async function Home() {
  const windows = await Promise.all(LEAGUES.map((l) => getScoreboardWindow(l).catch(() => [])))
  const all = windows.flat().sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  const now = Date.now()

  const live = all.filter((f) => f.status === 'live')
  const upcoming = all.filter((f) => f.status === 'scheduled')
  const recent = all.filter((f) => f.status === 'final' && new Date(f.kickoff).getTime() > now - 12 * 3600_000)

  let nextUp: Fixture[] = []
  if (live.length + upcoming.length + recent.length === 0) {
    const seasons = await Promise.all(LEAGUES.map((l) => getSeasonFixtures(l).catch(() => [])))
    nextUp = seasons
      .map((fx) => fx.find((f) => f.status === 'scheduled'))
      .filter((f): f is Fixture => f !== undefined)
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  }

  return (
    <div className="space-y-10">
      {(live.length > 0 || upcoming.length > 0) && <AutoRefresh seconds={60} />}
      {live.length > 0 && (
        <Section title="Live now">
          <FixtureList fixtures={live} showLeague />
        </Section>
      )}
      {upcoming.length > 0 && (
        <Section title="Up next">
          <FixtureList fixtures={upcoming} pickable showLeague />
        </Section>
      )}
      {recent.length > 0 && (
        <Section title="Just finished">
          <FixtureList fixtures={recent} showLeague />
        </Section>
      )}
      {nextUp.length > 0 && (
        <Section title="Next up in each league">
          <FixtureList fixtures={nextUp} pickable showLeague />
        </Section>
      )}
      <Section title="Leagues">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEAGUES.map((l) => (
            <Link
              key={l.slug}
              href={`/${l.slug}`}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600"
              style={{ borderTop: `3px solid ${l.accent}` }}
            >
              <div className="font-bold">{l.name}</div>
              <div className="text-xs text-slate-400">Fixtures · Results · Table · Teams</div>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}
