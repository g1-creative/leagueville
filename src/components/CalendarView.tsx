'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  bucketByDay,
  canShift,
  seasonDayBounds,
  shiftAnchor,
  weekKeys,
  type CalendarView as ViewName,
} from '@/lib/calendar'
import { LEAGUES } from '@/lib/leagues'
import { slugify } from '@/lib/slugify'
import { dateHeading } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { DayColumn } from './DayColumn'
import { MonthGrid } from './MonthGrid'
import { useTz } from './TimezoneProvider'

const weekColumnFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
})

function weekColumnHeading(key: string): string {
  return weekColumnFormat.format(new Date(`${key}T12:00:00Z`))
}

const VIEWS: { key: ViewName; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
]

interface PinnedTeam {
  league: string
  slug: string
  name: string
}

function readPinned(): PinnedTeam | null {
  try {
    return JSON.parse(window.localStorage.getItem('lv-myteam') ?? 'null')
  } catch {
    return null
  }
}

// PinnedTeam.league is a persisted localStorage key (lv-myteam) and keeps its
// name; only the Fixture field was renamed to `competition`.
function involves(f: Fixture, team: PinnedTeam): boolean {
  return (
    f.competition === team.league &&
    (slugify(f.home.name) === team.slug || slugify(f.away.name) === team.slug)
  )
}

export function CalendarView({
  view,
  anchor,
  today,
  leagues,
  myteam = false,
  fixtures,
}: {
  view: ViewName
  anchor: string
  today: string
  leagues: string[]
  myteam?: boolean
  fixtures: Fixture[]
}) {
  const { tz } = useTz()
  const [pinned, setPinned] = useState<PinnedTeam | null>(null)
  const [openDay, setOpenDay] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => setPinned(readPinned()), [])

  useEffect(() => {
    if (!openDay) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDay(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openDay])

  useEffect(() => {
    if (openDay) {
      panelRef.current?.focus()
    } else {
      openerRef.current?.focus()
      openerRef.current = null
    }
  }, [openDay])

  const openDayPanel = (dayKey: string) => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpenDay(dayKey)
  }

  // `myteam` wins over the league chips. With nothing pinned it is ignored.
  const teamFilter = myteam ? pinned : null
  const visible = useMemo(
    () =>
      teamFilter
        ? fixtures.filter((f) => involves(f, teamFilter))
        : fixtures.filter((f) => (leagues as readonly string[]).includes(f.competition)),
    [fixtures, leagues, teamFilter],
  )

  const href = (over: Partial<{ view: ViewName; d: string; leagues: string[]; myteam: boolean }>) => {
    const next = { view, d: anchor, leagues, myteam, ...over }
    const p = new URLSearchParams()
    if (next.view !== 'month') p.set('view', next.view)
    p.set('d', next.d)
    if (next.leagues.length !== LEAGUES.length) p.set('leagues', next.leagues.join(','))
    if (next.myteam) p.set('myteam', '1')
    return `/calendar?${p}`
  }

  const toggleLeague = (slug: string) =>
    leagues.includes(slug)
      ? leagues.filter((s) => s !== slug)
      : LEAGUES.filter((l) => leagues.includes(l.slug) || l.slug === slug).map((l) => l.slug)

  const bounds = seasonDayBounds(new Date(`${today}T00:00:00Z`))
  const byDay = useMemo(() => bucketByDay(visible, tz), [visible, tz])
  const prev = shiftAnchor(anchor, view, -1)
  const next = shiftAnchor(anchor, view, 1)
  const canPrev = canShift(anchor, view, -1, bounds)
  const canNext = canShift(anchor, view, 1, bounds)

  const heading =
    view === 'month'
      ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
          new Date(`${anchor}T00:00:00Z`),
        )
      : dateHeading(`${anchor}T12:00:00Z`, 'UTC')

  const arrow = (target: string, enabled: boolean, label: string, glyph: string) =>
    enabled ? (
      <Link href={href({ d: target })} aria-label={label} className="btn-muted text-base leading-none">
        {glyph}
      </Link>
    ) : (
      <span aria-label={label} aria-disabled className="btn-muted text-base leading-none opacity-30">
        {glyph}
      </span>
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {arrow(prev, canPrev, 'Previous', '‹')}
        <h1 className="display min-w-52 text-[22px] leading-none">{heading}</h1>
        {arrow(next, canNext, 'Next', '›')}
        <div className="ml-auto flex gap-5 border-b border-rule">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={href({ view: v.key })}
              aria-current={v.key === view ? 'page' : undefined}
              className={`-mb-px border-b-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                v.key === view ? 'border-chalk text-chalk' : 'border-transparent text-dim hover:text-chalk'
              }`}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {LEAGUES.map((l) => {
          const on = leagues.includes(l.slug)
          const isOnlySelected = on && leagues.length === 1
          const chipClassName = `num rounded-[2px] border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
            teamFilter ? 'pointer-events-none opacity-30' : ''
          } ${on ? '' : 'border-rule text-dim hover:text-chalk'}`
          const chipStyle =
            on && !teamFilter ? { borderColor: l.accent, backgroundColor: `${l.accent}26`, color: l.accent } : undefined

          if (teamFilter || isOnlySelected) {
            return (
              <span
                key={l.slug}
                aria-pressed={on && !teamFilter}
                aria-disabled
                className={chipClassName}
                style={chipStyle}
              >
                {l.shortName}
              </span>
            )
          }

          return (
            <Link
              key={l.slug}
              href={href({ leagues: toggleLeague(l.slug), myteam: false })}
              aria-pressed={on}
              className={chipClassName}
              style={chipStyle}
            >
              {l.shortName}
            </Link>
          )
        })}
        {pinned && (
          <Link
            href={href({ myteam: !myteam })}
            aria-pressed={myteam}
            className={`num rounded-[2px] border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
              myteam ? 'border-chalk bg-chalk text-pitch' : 'border-rule text-dim hover:text-chalk'
            }`}
          >
            ★ {pinned.name}
          </Link>
        )}
      </div>

      {view === 'month' && <MonthGrid anchor={anchor} byDay={byDay} onSelectDay={openDayPanel} />}

      {view === 'week' && (
        <>
          <div className="hidden grid-cols-7 gap-2 sm:grid">
            {weekKeys(anchor).map((key) => (
              <DayColumn
                key={key}
                dayKey={key}
                fixtures={byDay.get(key) ?? []}
                heading={weekColumnHeading(key)}
              />
            ))}
          </div>
          <div className="sm:hidden">
            <div className="mb-3 flex gap-1 overflow-x-auto">
              {weekKeys(anchor).map((key) => (
                <Link
                  key={key}
                  href={href({ d: key })}
                  className={`num shrink-0 rounded-[2px] px-2.5 py-1.5 text-[11px] font-medium ${
                    key === anchor ? 'bg-chalk text-pitch' : 'text-dim'
                  }`}
                >
                  {Number(key.slice(8))}
                </Link>
              ))}
            </div>
            <DayColumn dayKey={anchor} fixtures={byDay.get(anchor) ?? []} />
          </div>
        </>
      )}

      {view === 'day' && <DayColumn dayKey={anchor} fixtures={byDay.get(anchor) ?? []} />}

      {openDay && (
        <div
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
          aria-label={dateHeading(`${openDay}T12:00:00Z`, 'UTC')}
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 max-h-[70vh] overflow-y-auto border-t border-rule bg-pitch/95 p-4 backdrop-blur outline-none md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-[3px] md:border"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-[13px] leading-none">{dateHeading(`${openDay}T12:00:00Z`, 'UTC')}</h2>
            <button onClick={() => setOpenDay(null)} className="btn-muted">
              Close
            </button>
          </div>
          <DayColumn dayKey={openDay} fixtures={byDay.get(openDay) ?? []} />
        </div>
      )}
    </div>
  )
}
