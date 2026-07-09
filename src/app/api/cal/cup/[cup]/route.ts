import { getCup } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { buildIcs, fixturesToCalEvents } from '@/lib/ics'

const ICS_HEADERS = {
  'Content-Type': 'text/calendar; charset=utf-8',
  'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
}

export async function GET(_req: Request, { params }: { params: Promise<{ cup: string }> }) {
  const { cup: rawSlug } = await params
  const cup = getCup(rawSlug.replace(/\.ics$/, ''))
  if (!cup) return new Response('Unknown cup', { status: 404 })
  try {
    const fixtures = await getSeasonFixtures(cup)
    const ics = buildIcs(`${cup.name} — Leagueville`, fixturesToCalEvents(fixtures))
    return new Response(ics, {
      headers: { ...ICS_HEADERS, 'Content-Disposition': `inline; filename="${cup.slug}.ics"` },
    })
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
}
