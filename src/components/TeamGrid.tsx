import Link from 'next/link'
import type { Team } from '@/lib/types'
import { TeamLogo } from './TeamLogo'

export function TeamGrid({ teams, leagueSlug }: { teams: Team[]; leagueSlug: string }) {
  if (teams.length === 0) return <p className="py-12 text-center text-slate-400">Teams unavailable right now.</p>
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {teams.map((t) => (
        <Link
          key={t.id}
          href={`/${leagueSlug}/${t.slug}`}
          className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600"
        >
          <TeamLogo src={t.logo} alt={t.name} size={48} />
          <span className="text-center text-sm font-medium">{t.name}</span>
        </Link>
      ))}
    </div>
  )
}
