import { getLeague } from '@/lib/leagues'
import { getSeasonFixtures } from '@/lib/data/fixtures'
import { buildIcs, fixturesToCalEvents, type CalEvent } from '@/lib/ics'

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200)
  if (ids.length === 0) return new Response('No games selected', { status: 400 })

  const byLeague = new Map<string, Set<string>>()
  for (const token of ids) {
    const [slug, id] = token.split(':')
    if (!slug || !id) continue
    if (!byLeague.has(slug)) byLeague.set(slug, new Set())
    byLeague.get(slug)!.add(id)
  }

  const events: CalEvent[] = []
  try {
    for (const [slug, wanted] of byLeague) {
      const league = getLeague(slug)
      if (!league) continue
      const fixtures = (await getSeasonFixtures(league)).filter((f) => wanted.has(f.id))
      events.push(...fixturesToCalEvents(fixtures))
    }
  } catch {
    return new Response('Fixture data temporarily unavailable', { status: 503 })
  }
  if (events.length === 0) return new Response('No matching games found', { status: 404 })

  events.sort((a, b) => a.start.getTime() - b.start.getTime())
  const ics = buildIcs('My picks — Leagueville', events)
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leagueville-picks.ics"',
    },
  })
}
