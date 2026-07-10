import Link from 'next/link'
import type { StandingsGroup } from '@/lib/types'
import { TeamLogo } from './TeamLogo'

const STAT = 'px-2 py-2.5 text-center text-[13px] tabular-nums text-dim'

export function StandingsTable({
  group,
  leagueSlug,
  showName = false,
}: {
  group: StandingsGroup
  leagueSlug: string
  showName?: boolean
}) {
  return (
    <div>
      {showName && (
        <div className="mb-2.5 flex items-center gap-3">
          <h3 className="display text-[11px] leading-none">{group.name}</h3>
          <span className="h-px flex-1 bg-rule" />
        </div>
      )}
      <div className="board">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="eyebrow px-3 py-2.5 font-normal">Pos</th>
                <th className="eyebrow px-3 py-2.5 font-normal">Team</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">P</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">W</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">D</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">L</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">GF</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">GA</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal">GD</th>
                <th className="eyebrow px-2 py-2.5 text-center font-normal text-chalk">Pts</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((r) => (
                <tr key={r.teamId} className="board-row">
                  <td className="num px-3 py-2.5 text-[11px] text-dim">{r.rank}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/${leagueSlug}/${r.teamSlug}`} className="flex items-center gap-2.5 hover:underline">
                      <TeamLogo src={r.logo} alt={r.teamName} size={20} />
                      <span className="font-medium">{r.teamName}</span>
                    </Link>
                  </td>
                  <td className={STAT}>{r.played}</td>
                  <td className={STAT}>{r.wins}</td>
                  <td className={STAT}>{r.draws}</td>
                  <td className={STAT}>{r.losses}</td>
                  <td className={STAT}>{r.goalsFor}</td>
                  <td className={STAT}>{r.goalsAgainst}</td>
                  <td className={STAT}>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                  <td className="num px-2 py-2.5 text-center text-[13px] font-bold text-chalk">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
