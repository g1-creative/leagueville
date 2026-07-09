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
    </nav>
  )
}
