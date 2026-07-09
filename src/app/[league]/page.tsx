import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarButtons } from '@/components/CalendarButtons'
import { FixtureList } from '@/components/FixtureList'
import { StandingsTable } from '@/components/StandingsTable'
import { TeamGrid } from '@/components/TeamGrid'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { getStandings } from '@/lib/data/standings'
import { getTeams } from '@/lib/data/teams'
import { getLeague } from '@/lib/leagues'

const TABS = [
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'results', label: 'Results' },
  { key: 'table', label: 'Table' },
  { key: 'teams', label: 'Teams' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { league: slug } = await params
  const league = getLeague(slug)
  if (!league) notFound()
  const sp = await searchParams
  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : 'fixtures'

  let content: React.ReactNode
  if (tab === 'fixtures') {
    const fixtures = (await getSeasonFixtures(league).catch(() => [])).filter((f) => f.status !== 'final')
    content = (
      <FixtureList
        fixtures={fixtures}
        pickable
        emptyMessage="Off-season — fixtures for the new season will appear here once published."
      />
    )
  } else if (tab === 'results') {
    const results = (await getSeasonFixtures(league).catch(() => []))
      .filter((f) => f.status === 'final')
      .reverse()
    content = <FixtureList fixtures={results} emptyMessage="No results yet this season." />
  } else if (tab === 'table') {
    const groups = await getStandings(league).catch(() => [])
    content =
      groups.length > 0 ? (
        <div className="space-y-8">
          {groups.map((g) => (
            <StandingsTable key={g.name} group={g} leagueSlug={league.slug} showName={groups.length > 1} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-slate-400">Standings unavailable right now.</p>
      )
  } else {
    const teams = await getTeams(league).catch(() => [])
    content = <TeamGrid teams={teams} leagueSlug={league.slug} />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-black" style={{ borderLeft: `4px solid ${league.accent}`, paddingLeft: 12 }}>
          {league.name}
        </h1>
        <CalendarButtons path={`/api/cal/league/${league.slug}.ics`} label="League calendar" />
      </div>
      <div className="flex gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/${league.slug}?tab=${t.key}`}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={tab === t.key ? { boxShadow: `inset 0 2px 0 ${league.accent}` } : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {content}
    </div>
  )
}
