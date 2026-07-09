'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { fixturesToCalEvents, googleCalendarUrl } from '@/lib/ics'
import { getCompetition } from '@/lib/leagues'
import type { Fixture } from '@/lib/types'

export function AddToCalendarMenu({ fixture }: { fixture: Fixture }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const competition = getCompetition(fixture.competition)
  const [event] = fixturesToCalEvents([fixture], competition?.name ?? '')
  if (!event) return null // postponed games have no kickoff to add

  const label = `${fixture.home.name} vs ${fixture.away.name}`

  return (
    <div ref={root} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Add ${label} to calendar`}
        className={`num rounded-[2px] border px-2 py-1 text-[11px] font-bold leading-none transition-colors ${
          open ? 'border-chalk bg-chalk text-pitch' : 'border-rule text-dim hover:border-chalk/45 hover:text-chalk'
        }`}
      >
        +
      </button>
      {open && (
        <div
          role="menu"
          className="board absolute right-0 z-50 mt-1 w-52 bg-board shadow-xl"
        >
          <a
            role="menuitem"
            href={`/api/cal/game/${fixture.competition}/${fixture.id}.ics`}
            download
            onClick={() => setOpen(false)}
            className="board-row block px-3 py-2.5 text-[11px] font-medium"
          >
            Apple / Outlook (.ics)
          </a>
          <a
            role="menuitem"
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="board-row block px-3 py-2.5 text-[11px] font-medium"
          >
            Google Calendar
          </a>
        </div>
      )}
    </div>
  )
}
