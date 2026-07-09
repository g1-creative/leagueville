'use client'

import Link from 'next/link'
import { getLeague } from '@/lib/leagues'
import { formatKickoff } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { AddToCalendarMenu } from './AddToCalendarMenu'
import { TeamLogo } from './TeamLogo'
import { useTz } from './TimezoneProvider'

export function GameRow({ fixture }: { fixture: Fixture }) {
  const { tz } = useTz()
  const league = getLeague(fixture.league)
  const showScore = fixture.status === 'live' || fixture.status === 'final'

  const live = fixture.status === 'live'

  return (
    <div className="board-row flex items-center gap-2 px-2.5 py-2.5">
      <Link href={`/${fixture.league}/game/${fixture.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
        {league && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: league.accent }}
          />
        )}
        <span className="num w-14 shrink-0 text-[11px] leading-none text-dim">
          {fixture.status === 'postponed' ? (
            <span className="line-through decoration-1">PPD</span>
          ) : showScore ? (
            <span className="font-bold text-chalk">
              <span className={live ? 'score-live' : undefined}>
                {fixture.home.score ?? '-'}–{fixture.away.score ?? '-'}
              </span>
            </span>
          ) : (
            formatKickoff(fixture.kickoff, tz)
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <TeamLogo src={fixture.home.logo} alt={fixture.home.name} size={16} />
            <span className="truncate text-xs font-medium">{fixture.home.name}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <TeamLogo src={fixture.away.logo} alt={fixture.away.name} size={16} />
            <span className="truncate text-xs font-medium">{fixture.away.name}</span>
          </span>
        </span>
      </Link>
      <AddToCalendarMenu fixture={fixture} />
    </div>
  )
}
