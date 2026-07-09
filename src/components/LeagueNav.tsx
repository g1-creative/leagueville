'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LEAGUES } from '@/lib/leagues'

export function LeagueNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LEAGUES.map((l) => {
        const active = pathname === `/${l.slug}` || pathname.startsWith(`/${l.slug}/`)
        return (
          <Link
            key={l.slug}
            href={`/${l.slug}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={active ? { backgroundColor: `${l.accent}33`, boxShadow: `inset 0 -2px 0 ${l.accent}` } : undefined}
          >
            {l.shortName}
          </Link>
        )
      })}
      <span aria-hidden className="my-1 w-px shrink-0 self-stretch bg-rule" />
      <Link
        href="/calendar"
        aria-current={pathname === '/calendar' ? 'page' : undefined}
        className={`whitespace-nowrap border-b-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
          pathname === '/calendar' ? 'border-chalk text-chalk' : 'border-transparent text-dim hover:text-chalk'
        }`}
      >
        Calendar
      </Link>
    </nav>
  )
}
