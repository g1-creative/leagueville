'use client'

import { usePicks } from './picks'

export function SelectionTray() {
  const { picks, clear } = usePicks()
  if (picks.length === 0) return null
  const href = `/api/cal/custom?ids=${encodeURIComponent(picks.join(','))}`
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <span className="text-sm font-medium">
          {picks.length} game{picks.length === 1 ? '' : 's'} selected
        </span>
        <a
          href={href}
          download
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Download .ics
        </a>
        <button onClick={clear} className="text-sm text-slate-400 hover:text-slate-200">
          Clear
        </button>
      </div>
    </div>
  )
}
