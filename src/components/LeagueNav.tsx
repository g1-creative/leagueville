'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LEAGUES } from '@/lib/leagues'

const CUPS_ACCENT = '#eab308'

export function LeagueNav() {
  const pathname = usePathname()
  const cupsActive = pathname === '/cups' || pathname.startsWith('/cups/')
  return (
    <nav className="-mb-px flex gap-4 overflow-x-auto">
      {LEAGUES.map((l) => {
        const active = pathname === `/${l.slug}` || pathname.startsWith(`/${l.slug}/`)
        return (
          <Link
            key={l.slug}
            href={`/${l.slug}`}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              active ? 'text-chalk' : 'border-transparent text-dim hover:text-chalk'
            }`}
            style={active ? { borderBottomColor: l.accent } : undefined}
          >
            {l.shortName}
          </Link>
        )
      })}
      <Link
        href="/cups"
        aria-current={cupsActive ? 'page' : undefined}
        className={`whitespace-nowrap border-b-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
          cupsActive ? 'text-chalk' : 'border-transparent text-dim hover:text-chalk'
        }`}
        style={cupsActive ? { borderBottomColor: CUPS_ACCENT } : undefined}
      >
        Cups
      </Link>
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
