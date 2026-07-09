import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarButtons } from '@/components/CalendarButtons'
import { FixtureList } from '@/components/FixtureList'
import { Section } from '@/components/Section'
import { StandingsTable } from '@/components/StandingsTable'
import { TeamGrid } from '@/components/TeamGrid'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { getStandings } from '@/lib/data/standings'
import { teamsFromFixtures } from '@/lib/data/teamFixtures'
import { getCup } from '@/lib/leagues'
import { groupByRound, prettifyRound } from '@/lib/rounds'
import type { Fixture } from '@/lib/types'

const TABS = [
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'results', label: 'Results' },
  { key: 'table', label: 'Table' },
  { key: 'teams', label: 'Teams' },
] as const

type TabKey = (typeof TABS)[number]['key']

function RoundGroupedFixtures({
  fixtures,
  pickable = false,
  newestFirst = false,
  emptyMessage,
}: {
  fixtures: Fixture[]
  pickable?: boolean
  newestFirst?: boolean
  emptyMessage: string
}) {
  if (fixtures.length === 0) {
    return <p className="py-12 text-center text-slate-400">{emptyMessage}</p>
  }
  let groups = groupByRound(fixtures)
  if (newestFirst) {
    groups = [...groups].reverse().map((g) => ({ ...g, fixtures: [...g.fixtures].reverse() }))
  }
  if (groups.length === 1 && groups[0].round === '') {
    return <FixtureList fixtures={groups[0].fixtures} pickable={pickable} />
  }
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <Section key={g.round} title={prettifyRound(g.round)}>
          <FixtureList fixtures={g.fixtures} pickable={pickable} />
        </Section>
      ))}
    </div>
  )
}

export default async function CupPage({
  params,
  searchParams,
}: {
  params: Promise<{ cup: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { cup: slug } = await params
  const cup = getCup(slug)
  if (!cup) notFound()
  const sp = await searchParams
  const requested: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : 'fixtures'

  // No hasGroupPhase flag: the Table tab exists only when ESPN publishes
  // standings rows. Knockout-only cups return none — reality is the flag.
  const groups = await getStandings(cup).catch(() => [])
  const tabs = groups.length > 0 ? [...TABS] : TABS.filter((t) => t.key !== 'table')
  const tab: TabKey = tabs.some((t) => t.key === requested) ? requested : 'fixtures'

  let content: React.ReactNode
  if (tab === 'fixtures') {
    const fixtures = (await getSeasonFixtures(cup).catch(() => [])).filter((f) => f.status !== 'final')
    content = (
      <RoundGroupedFixtures
        fixtures={fixtures}
        pickable
        emptyMessage="Off-season — fixtures will appear here once the draw is published."
      />
    )
  } else if (tab === 'results') {
    const results = (await getSeasonFixtures(cup).catch(() => [])).filter((f) => f.status === 'final')
    content = <RoundGroupedFixtures fixtures={results} newestFirst emptyMessage="No results yet this season." />
  } else if (tab === 'table') {
    content = (
      <div className="space-y-8">
        {groups.map((g) => (
          <StandingsTable key={g.name} group={g} showName={groups.length > 1} />
        ))}
      </div>
    )
  } else {
    const fixtures = await getSeasonFixtures(cup).catch(() => [])
    content = <TeamGrid teams={teamsFromFixtures(fixtures)} />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-black" style={{ borderLeft: `4px solid ${cup.accent}`, paddingLeft: 12 }}>
          {cup.name}
        </h1>
        <CalendarButtons path={`/api/cal/cup/${cup.slug}.ics`} label="Cup calendar" />
      </div>
      <div className="flex gap-1 border-b border-slate-800">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/cups/${cup.slug}?tab=${t.key}`}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={tab === t.key ? { boxShadow: `inset 0 2px 0 ${cup.accent}` } : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {content}
    </div>
  )
}
