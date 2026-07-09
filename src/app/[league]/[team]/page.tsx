import { notFound } from 'next/navigation'
import { CalendarButtons } from '@/components/CalendarButtons'
import { FixtureList } from '@/components/FixtureList'
import { PinTeamButton } from '@/components/MyTeam'
import { Section } from '@/components/Section'
import { SquadTable } from '@/components/SquadTable'
import { TeamLogo } from '@/components/TeamLogo'
import { getTeamBio } from '@/lib/data/bio'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { getRoster } from '@/lib/data/roster'
import { getSeasonHistory, getStandings } from '@/lib/data/standings'
import { findTeam } from '@/lib/data/teams'
import { ordinal, seasonLabel } from '@/lib/format'
import { getLeague } from '@/lib/leagues'

export default async function TeamPage({
  params,
}: {
  params: Promise<{ league: string; team: string }>
}) {
  const { league: leagueSlug, team: teamSlug } = await params
  const league = getLeague(leagueSlug)
  if (!league) notFound()
  const team = await findTeam(league, teamSlug).catch(() => undefined)
  if (!team) notFound()

  const [fixtures, roster, bio, history, standings] = await Promise.all([
    getSeasonFixtures(league).catch(() => []),
    getRoster(league, team.id).catch(() => []),
    getTeamBio(league, team.id),
    getSeasonHistory(league, team.id).catch(() => []),
    getStandings(league).catch(() => []),
  ])

  const mine = fixtures.filter((f) => f.home.id === team.id || f.away.id === team.id)
  const upcoming = mine.filter((f) => f.status !== 'final')
  const results = mine.filter((f) => f.status === 'final').reverse()

  let position: string | undefined
  for (const g of standings) {
    const row = g.rows.find((r) => r.teamId === team.id)
    if (row) {
      position = `${ordinal(row.rank)}${standings.length > 1 ? ` in ${g.name}` : ''} · ${row.points} pts`
      break
    }
  }

  const bioParagraphs = bio?.description?.split(/\r?\n\r?\n/).filter(Boolean) ?? []

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <TeamLogo src={team.logo} alt={team.name} size={72} />
          <div>
            <h1 className="text-3xl font-black">{team.name}</h1>
            <p className="text-sm text-slate-400">
              {[bio?.stadium, bio?.founded ? `Founded ${bio.founded}` : undefined, position]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="ml-auto">
            <PinTeamButton league={league.slug} slug={team.slug} name={team.shortName} />
          </div>
        </div>
        <CalendarButtons path={`/api/cal/team/${league.slug}/${team.slug}.ics`} label={`${team.shortName} calendar`} />
        {bioParagraphs.length > 0 && (
          <div className="max-w-3xl text-sm leading-relaxed text-slate-300">
            <p>{bioParagraphs[0]}</p>
            {bioParagraphs.length > 1 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-200">Read more</summary>
                <div className="mt-2 space-y-2">
                  {bioParagraphs.slice(1).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      <Section title="Upcoming">
        <FixtureList fixtures={upcoming} pickable emptyMessage="No upcoming games scheduled." />
      </Section>

      <Section title="Results">
        <FixtureList fixtures={results} emptyMessage="No results yet this season." />
      </Section>

      <Section title="Squad">
        <SquadTable players={roster} />
      </Section>

      {history.length > 0 && (
        <Section title="Season history">
          <ul className="divide-y divide-slate-800/50 overflow-hidden rounded-xl border border-slate-800 text-sm">
            {history.map((h) => (
              <li key={h.season} className="flex items-center gap-4 px-4 py-2.5">
                <span className="w-20 font-mono text-slate-400">{seasonLabel(league, h.season)}</span>
                <span className="font-semibold">{ordinal(h.rank)}</span>
                {h.group && <span className="text-slate-400">{h.group}</span>}
                <span className="ml-auto text-slate-300">{h.points} pts</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
