'use client'

import Link from 'next/link'
import { getCompetition } from '@/lib/leagues'
import { formatKickoff } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { TeamLogo } from './TeamLogo'
import { useTz } from './TimezoneProvider'
import { usePicks } from './picks'

export function FixtureCard({
  fixture,
  pickable = false,
  showLeague = false,
}: {
  fixture: Fixture
  pickable?: boolean
  showLeague?: boolean
}) {
  const { tz } = useTz()
  const { picks, toggle } = usePicks()
  const token = `${fixture.competition}:${fixture.id}`
  const picked = picks.includes(token)
  const competition = getCompetition(fixture.competition)
  const live = fixture.status === 'live'
  const showScore = live || fixture.status === 'final'

  const chip = showLeague && competition && (
    <span
      className="num shrink-0 rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${competition.accent}26`, color: competition.accent }}
    >
      {competition.shortName}
    </span>
  )

  const pickButton = (mobile: boolean) =>
    pickable &&
    fixture.status === 'scheduled' && (
      <button
        onClick={() => toggle(token)}
        aria-pressed={picked}
        className={`shrink-0 rounded-[2px] border font-bold uppercase tracking-wider transition-colors ${
          mobile ? 'min-h-11 px-2.5 text-[11px]' : 'px-2 py-1 text-[10px]'
        } ${
          picked ? 'border-chalk bg-chalk text-pitch' : 'border-rule text-dim hover:border-chalk/45 hover:text-chalk'
        }`}
      >
        {picked ? 'In cal' : '+ Cal'}
      </button>
    )

  return (
    <>
      {/* < sm: stacked GameRow-style row; everything but the pick button links
          to the game page. Team names render in full, truncating only as a
          last resort. */}
      <div className="board-row flex min-h-14 items-center gap-2 px-3 py-2 sm:hidden">
        <Link href={`/${fixture.competition}/game/${fixture.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex w-14 shrink-0 flex-col items-start gap-1 text-dim">
            {fixture.status === 'postponed' ? (
              <span className="eyebrow line-through decoration-1">PPD</span>
            ) : showScore ? (
              <span className="num text-[13px] font-bold text-chalk">
                <span className={live ? 'score-live' : undefined}>
                  {fixture.home.score ?? '-'}–{fixture.away.score ?? '-'}
                </span>
              </span>
            ) : (
              <span className="num text-[12px] font-medium leading-tight">{formatKickoff(fixture.kickoff, tz)}</span>
            )}
            {live && (
              <span className="eyebrow flex items-center gap-1 text-chalk">
                <span className="dot-live" aria-hidden />
                {fixture.statusDetail}
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5">
              <TeamLogo src={fixture.home.logo} alt={fixture.home.name} size={18} />
              <span className="truncate text-[13px] font-medium">{fixture.home.name}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TeamLogo src={fixture.away.logo} alt={fixture.away.name} size={18} />
              <span className="truncate text-[13px] font-medium">{fixture.away.name}</span>
            </span>
          </span>
          {chip}
        </Link>
        {pickButton(true)}
      </div>

      {/* sm+: the original single-line layout, truncating correctly. */}
      <div className="board-row hidden items-center gap-3 px-4 py-3 sm:flex">
        {chip}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
          <span className="truncate text-sm font-medium">{fixture.home.name}</span>
          <TeamLogo src={fixture.home.logo} alt={fixture.home.name} size={28} />
        </div>
        <div className="w-[92px] shrink-0 text-center">
          {showScore ? (
            <>
              <div className="num text-[17px] font-bold leading-tight">
                <span className={live ? 'score-live' : undefined}>
                  {fixture.home.score ?? '-'}–{fixture.away.score ?? '-'}
                </span>
              </div>
              <div className="eyebrow mt-1 flex items-center justify-center gap-1.5">
                {live && <span className="dot-live" aria-hidden />}
                <span className={live ? 'text-chalk' : undefined}>
                  {live ? `Live · ${fixture.statusDetail}` : fixture.statusDetail}
                </span>
              </div>
            </>
          ) : fixture.status === 'postponed' ? (
            <div className="eyebrow line-through decoration-1">Postponed</div>
          ) : (
            <div className="num text-[13px] font-medium leading-tight">{formatKickoff(fixture.kickoff, tz)}</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamLogo src={fixture.away.logo} alt={fixture.away.name} size={28} />
          <span className="truncate text-sm font-medium">{fixture.away.name}</span>
        </div>
        {pickButton(false)}
      </div>
    </>
  )
}
