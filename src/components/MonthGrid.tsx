'use client'

import { bucketByDay, monthGridKeys, monthOf } from '@/lib/calendar'
import { getLeague } from '@/lib/leagues'
import { formatKickoff } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { useTz } from './TimezoneProvider'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS = 3

function abbrev(name: string): string {
  return name.slice(0, 3).toUpperCase()
}

export function MonthGrid({
  anchor,
  fixtures,
  today,
  onSelectDay,
}: {
  anchor: string
  fixtures: Fixture[]
  today: string
  onSelectDay: (dayKey: string) => void
}) {
  const { tz } = useTz()
  const byDay = bucketByDay(fixtures, tz)
  const keys = monthGridKeys(anchor)
  const month = monthOf(anchor)

  return (
    <div className="board">
      <div className="grid grid-cols-7 border-b border-rule">
        {WEEKDAYS.map((d) => (
          <div key={d} className="eyebrow py-2 text-center">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-rule">
        {keys.map((key) => {
          const games = byDay.get(key) ?? []
          const outside = monthOf(key) !== month
          const isToday = key === today
          const leagues = [...new Set(games.map((g) => g.league))]
          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              data-today={isToday}
              data-outside={outside}
              aria-label={`${Number(key.slice(8))} ${
                games.length === 1 ? '1 game' : `${games.length} games`
              }`}
              className={`min-h-16 bg-board p-1.5 text-left align-top transition-colors hover:bg-board-hi sm:min-h-28 ${
                outside ? 'opacity-35' : ''
              }`}
            >
              <div
                className={`num text-[11px] leading-none ${
                  isToday
                    ? 'inline-block rounded-[2px] bg-chalk px-1.5 py-1 font-bold text-pitch'
                    : 'px-0.5 py-1 font-medium text-dim'
                }`}
              >
                {Number(key.slice(8))}
              </div>

              {/* Mobile: dots + count */}
              {games.length > 0 && (
                <div data-testid="day-dots" className="mt-1.5 flex flex-wrap items-center gap-0.5 sm:hidden">
                  {leagues.map((slug) => (
                    <span
                      key={slug}
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: getLeague(slug)?.accent }}
                    />
                  ))}
                  <span className="num ml-0.5 text-[10px] text-dim">{games.length}</span>
                </div>
              )}

              {/* Desktop: up to three chips */}
              <div className="mt-1 hidden flex-col gap-1 sm:flex">
                {games.slice(0, MAX_CHIPS).map((g) => (
                  <span key={`${g.league}:${g.id}`} className="flex items-center gap-1 truncate text-[10px]">
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getLeague(g.league)?.accent }}
                    />
                    <span className="num truncate font-medium text-chalk">{abbrev(g.home.name)}</span>
                    <span className="text-dim">–</span>
                    <span className="num truncate font-medium text-chalk">{abbrev(g.away.name)}</span>
                    <span className="num ml-auto shrink-0 text-dim">
                      {g.status === 'postponed' ? 'PPD' : formatKickoff(g.kickoff, tz)}
                    </span>
                    <span className="sr-only">{g.home.name}</span>
                    <span className="sr-only">{g.away.name}</span>
                  </span>
                ))}
                {games.length > MAX_CHIPS && (
                  <span className="eyebrow">{`+${games.length - MAX_CHIPS} more`}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
