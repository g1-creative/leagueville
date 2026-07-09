import { getLeague } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { buildIcs, fixturesToCalEvents } from '@/lib/ics'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; id: string }> },
) {
  const { league: rawSlug, id: rawId } = await params
  const league = getLeague(rawSlug)
  if (!league) return new Response('Unknown league', { status: 404 })
  const id = rawId.replace(/\.ics$/, '')

  let fixture
  try {
    fixture = (await getSeasonFixtures(league)).find((f) => f.id === id)
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
  if (!fixture) return new Response('Unknown game', { status: 404 })

  const events = fixturesToCalEvents([fixture], league.name)
  if (events.length === 0) return new Response('Game has no scheduled kickoff', { status: 404 })

  const ics = buildIcs(`${fixture.home.name} vs ${fixture.away.name} — Leagueville`, events)
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
      'Content-Disposition': `attachment; filename="${league.slug}-${id}.ics"`,
    },
  })
}
