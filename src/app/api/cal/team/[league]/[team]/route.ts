import { getLeague } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { findTeam } from '@/lib/data/teams'
import { buildIcs, fixturesToCalEvents } from '@/lib/ics'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; team: string }> },
) {
  const { league: rawLeague, team: rawTeam } = await params
  const league = getLeague(rawLeague)
  if (!league) return new Response('Unknown league', { status: 404 })
  try {
    const team = await findTeam(league, rawTeam.replace(/\.ics$/, ''))
    if (!team) return new Response('Unknown team', { status: 404 })
    const fixtures = (await getSeasonFixtures(league)).filter(
      (f) => f.home.id === team.id || f.away.id === team.id,
    )
    const ics = buildIcs(`${team.name} — Leagueville`, fixturesToCalEvents(fixtures))
    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
        'Content-Disposition': `inline; filename="${team.slug}.ics"`,
      },
    })
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
}
