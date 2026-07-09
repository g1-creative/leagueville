import { getLeague } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { buildIcs, fixturesToCalEvents } from '@/lib/ics'

const ICS_HEADERS = {
  'Content-Type': 'text/calendar; charset=utf-8',
  'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
}

export async function GET(_req: Request, { params }: { params: Promise<{ league: string }> }) {
  const { league: rawSlug } = await params
  const league = getLeague(rawSlug.replace(/\.ics$/, ''))
  if (!league) return new Response('Unknown league', { status: 404 })
  try {
    const fixtures = await getSeasonFixtures(league)
    const ics = buildIcs(`${league.name} — Leagueville`, fixturesToCalEvents(fixtures, league.name))
    return new Response(ics, {
      headers: { ...ICS_HEADERS, 'Content-Disposition': `inline; filename="${league.slug}.ics"` },
    })
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
}
