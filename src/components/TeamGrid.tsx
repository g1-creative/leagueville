import Link from 'next/link'
import type { Team } from '@/lib/types'
import { TeamLogo } from './TeamLogo'

const CARD = 'board flex flex-col items-center gap-3 p-5'

// leagueSlug is optional: cup participants have no team page, so their cards
// render unlinked rather than pointing at a route that does not exist.
export function TeamGrid({ teams, leagueSlug }: { teams: Team[]; leagueSlug?: string }) {
  if (teams.length === 0)
    return (
      <div className="board px-6 py-14 text-center">
        <p className="text-sm text-dim">Teams unavailable right now.</p>
      </div>
    )
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {teams.map((t) => {
        const inner = (
          <>
            <TeamLogo src={t.logo} alt={t.name} size={44} />
            <span className="text-center text-[13px] font-medium">{t.name}</span>
          </>
        )
        return leagueSlug ? (
          <Link
            key={t.id}
            href={`/${leagueSlug}/${t.slug}`}
            className={`${CARD} transition-colors hover:border-chalk/35 hover:bg-board-hi`}
          >
            {inner}
          </Link>
        ) : (
          <div key={t.id} className={CARD}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}
