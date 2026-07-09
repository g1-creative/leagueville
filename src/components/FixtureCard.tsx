'use client'

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
  const showScore = fixture.status === 'live' || fixture.status === 'final'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      {showLeague && competition && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: `${competition.accent}33`, color: competition.accent }}
        >
          {competition.shortName}
        </span>
      )}
      <div className="flex flex-1 items-center justify-end gap-2 text-right">
        <span className="truncate text-sm font-medium">{fixture.home.name}</span>
        <TeamLogo src={fixture.home.logo} alt={fixture.home.name} />
      </div>
      <div className="w-24 shrink-0 text-center">
        {showScore ? (
          <>
            <div className={`text-lg font-bold ${fixture.status === 'live' ? 'text-emerald-400' : ''}`}>
              {fixture.home.score ?? '-'}–{fixture.away.score ?? '-'}
            </div>
            <div className="text-xs text-slate-400">
              {fixture.status === 'live' ? `LIVE · ${fixture.statusDetail}` : fixture.statusDetail}
            </div>
          </>
        ) : fixture.status === 'postponed' ? (
          <div className="text-xs font-semibold uppercase text-amber-400">Postponed</div>
        ) : (
          <div className="text-lg font-semibold">{formatKickoff(fixture.kickoff, tz)}</div>
        )}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <TeamLogo src={fixture.away.logo} alt={fixture.away.name} />
        <span className="truncate text-sm font-medium">{fixture.away.name}</span>
      </div>
      {pickable && fixture.status === 'scheduled' && (
        <button
          onClick={() => toggle(token)}
          aria-pressed={picked}
          className={`shrink-0 rounded-md border px-2 py-1 text-xs ${
            picked
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
              : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          {picked ? '✓ Added' : '+ Cal'}
        </button>
      )}
    </div>
  )
}
