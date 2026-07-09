import type { Fixture } from './types'

export interface CalEvent {
  uid: string
  start: Date
  durationMinutes?: number
  title: string
  location?: string
  description?: string
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// RFC 5545 folding. We fold by character count rather than octets; multi-byte
// characters may push a line slightly past 75 octets, which parsers accept.
function foldLine(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function buildIcs(calName: string, events: CalEvent[], dtstamp: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leagueville//Fixtures//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calName)}`,
    'X-PUBLISHED-TTL:PT6H',
  ]
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(dtstamp)}`,
      `DTSTART:${icsDate(e.start)}`,
      `DURATION:PT${e.durationMinutes ?? 120}M`,
      `SUMMARY:${escapeText(e.title)}`,
    )
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** A Google Calendar "add event" deep link for a single event. */
export function googleCalendarUrl(e: CalEvent): string {
  const end = new Date(e.start.getTime() + (e.durationMinutes ?? 120) * 60_000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${icsDate(e.start)}/${icsDate(end)}`,
  })
  if (e.location) params.set('location', e.location)
  if (e.description) params.set('details', e.description)
  return `https://calendar.google.com/calendar/render?${params}`
}

export function fixturesToCalEvents(fixtures: Fixture[], leagueName: string): CalEvent[] {
  return fixtures
    .filter((f) => f.status !== 'postponed')
    .map((f) => ({
      uid: `${f.competition}-${f.id}@leagueville`,
      start: new Date(f.kickoff),
      title: `⚽ ${f.home.name} vs ${f.away.name}`,
      location: f.venue,
      description:
        leagueName +
        (f.status === 'final' && f.home.score !== undefined && f.away.score !== undefined
          ? ` — FT ${f.home.score}–${f.away.score}`
          : ''),
    }))
}
