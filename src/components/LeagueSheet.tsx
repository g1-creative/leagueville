'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { LEAGUES } from '@/lib/leagues'

// Bottom sheet above the mobile tab bar. Same focus/Escape pattern as the
// calendar day panel in CalendarView.
export function LeagueSheet({
  open,
  hint = false,
  onClose,
}: {
  open: boolean
  hint?: boolean
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      panelRef.current?.focus()
    } else {
      openerRef.current?.focus()
      openerRef.current = null
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button aria-label="Close leagues" onClick={onClose} className="absolute inset-0 bg-pitch/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Leagues"
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 overscroll-contain rounded-t-[10px] border-t border-rule bg-board pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 outline-none"
      >
        <div aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-full bg-rule" />
        {hint && (
          <p className="border-b border-rule px-4 pb-3 text-xs leading-relaxed text-dim">
            No team pinned — pick a league, open a team, tap ☆ Pin as my team.
          </p>
        )}
        <nav aria-label="Leagues">
          {LEAGUES.map((l) => (
            <Link
              key={l.slug}
              href={`/${l.slug}`}
              onClick={onClose}
              className="flex min-h-12 items-center gap-3 border-b border-rule/60 px-4 text-sm font-semibold last:border-b-0 active:bg-board-hi"
            >
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: l.accent }} />
              {l.name}
              {l.shortName !== l.name && <span className="eyebrow ml-auto">{l.shortName}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
