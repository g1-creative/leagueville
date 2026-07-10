'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LEAGUES } from '@/lib/leagues'
import { LeagueSheet } from './LeagueSheet'
import { useMyTeam } from './MyTeam'

function TabIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      {children}
    </svg>
  )
}

const TAB = 'flex min-h-11 flex-col items-center justify-center gap-1 transition-colors'
const LABEL = 'max-w-full truncate px-1 text-[10px] font-semibold uppercase tracking-wider'

export function BottomNav() {
  const pathname = usePathname()
  const team = useMyTeam()
  const [sheet, setSheet] = useState<'closed' | 'leagues' | 'myteam'>('closed')

  const myTeamActive = team !== null && pathname === `/${team.league}/${team.slug}`
  const leaguesActive =
    !myTeamActive &&
    (pathname === '/cups' ||
      pathname.startsWith('/cups/') ||
      LEAGUES.some((l) => pathname === `/${l.slug}` || pathname.startsWith(`/${l.slug}/`)))

  const cls = (active: boolean) => `${TAB} ${active ? 'text-chalk' : 'text-dim'}`

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-pitch/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid h-14 grid-cols-4">
          <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className={cls(pathname === '/')}>
            <TabIcon>
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
            </TabIcon>
            <span className={LABEL}>Home</span>
          </Link>
          <button onClick={() => setSheet('leagues')} aria-haspopup="dialog" className={cls(leaguesActive)}>
            <TabIcon>
              <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M7 6H4v1a3 3 0 0 0 3 3" />
              <path d="M17 6h3v1a3 3 0 0 1-3 3" />
              <path d="M12 14v3" />
              <path d="M8 21h8m-4-4v4" />
            </TabIcon>
            <span className={LABEL}>Leagues</span>
          </button>
          <Link
            href="/calendar"
            aria-current={pathname === '/calendar' ? 'page' : undefined}
            className={cls(pathname === '/calendar')}
          >
            <TabIcon>
              <path d="M4 5h16v15H4z" />
              <path d="M4 9h16" />
              <path d="M8 3v4M16 3v4" />
            </TabIcon>
            <span className={LABEL}>Calendar</span>
          </Link>
          {team ? (
            <Link
              href={`/${team.league}/${team.slug}`}
              aria-current={myTeamActive ? 'page' : undefined}
              className={cls(myTeamActive)}
            >
              <TabIcon>
                <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />
              </TabIcon>
              <span className={LABEL}>{team.name}</span>
            </Link>
          ) : (
            <button onClick={() => setSheet('myteam')} aria-haspopup="dialog" className={cls(false)}>
              <TabIcon>
                <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />
              </TabIcon>
              <span className={LABEL}>My Team</span>
            </button>
          )}
        </div>
      </nav>
      <LeagueSheet open={sheet !== 'closed'} hint={sheet === 'myteam'} onClose={() => setSheet('closed')} />
    </>
  )
}
