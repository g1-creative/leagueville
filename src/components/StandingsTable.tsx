import Link from 'next/link'
import type { StandingsGroup } from '@/lib/types'
import { TeamLogo } from './TeamLogo'

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
      {showName && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{group.name}</h3>}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-2 py-2 text-center">P</th>
              <th className="px-2 py-2 text-center">W</th>
              <th className="px-2 py-2 text-center">D</th>
              <th className="px-2 py-2 text-center">L</th>
              <th className="px-2 py-2 text-center">GF</th>
              <th className="px-2 py-2 text-center">GA</th>
              <th className="px-2 py-2 text-center">GD</th>
              <th className="px-2 py-2 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((r) => (
              <tr key={r.teamId} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60">
                <td className="px-3 py-2 text-slate-400">{r.rank}</td>
                <td className="px-3 py-2">
                  <Link href={`/${leagueSlug}/${r.teamSlug}`} className="flex items-center gap-2 hover:underline">
                    <TeamLogo src={r.logo} alt={r.teamName} size={20} />
                    <span className="font-medium">{r.teamName}</span>
                  </Link>
                </td>
                <td className="px-2 py-2 text-center text-slate-300">{r.played}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.wins}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.draws}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.losses}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.goalsFor}</td>
                <td className="px-2 py-2 text-center text-slate-300">{r.goalsAgainst}</td>
                <td className="px-2 py-2 text-center text-slate-300">
                  {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                </td>
                <td className="px-2 py-2 text-center font-bold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
