import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarButtons } from '@/components/CalendarButtons'
import { FixtureList } from '@/components/FixtureList'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { getLeague } from '@/lib/leagues'
import { slugify } from '@/lib/slugify'

export default async function GamePage({
  params,
}: {
  params: Promise<{ league: string; id: string }>
}) {
  const { league: leagueSlug, id } = await params
  const league = getLeague(leagueSlug)
  if (!league) notFound()

  const fixture = (await getSeasonFixtures(league).catch(() => [])).find((f) => f.id === id)
  if (!fixture) notFound()

  const teamLink = (name: string) => `/${league.slug}/${slugify(name)}`

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/calendar" className="btn-muted inline-block pl-0">
        ‹ Calendar
      </Link>

      <div className="space-y-4">
        <span
          className="num inline-block rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${league.accent}26`, color: league.accent }}
        >
          {league.name}
        </span>
        <FixtureList fixtures={[fixture]} />
        {fixture.venue && <p className="eyebrow">{fixture.venue}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={teamLink(fixture.home.name)} className="btn">
          {fixture.home.name}
        </Link>
        <Link href={teamLink(fixture.away.name)} className="btn">
          {fixture.away.name}
        </Link>
      </div>

      {fixture.status !== 'postponed' && (
        <CalendarButtons
          path={`/api/cal/game/${league.slug}/${fixture.id}.ics`}
          label="This game"
        />
      )}
      <CalendarButtons path={`/api/cal/league/${league.slug}.ics`} label="Whole league" />
    </div>
  )
}
