'use client'

import { usePicks } from './picks'

export function SelectionTray() {
  const { picks, clear } = usePicks()
  if (picks.length === 0) return null
  const href = `/api/cal/custom?ids=${encodeURIComponent(picks.join(','))}`
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 border-t border-rule bg-pitch/95 px-4 py-3 backdrop-blur sm:px-6 md:bottom-0 lg:px-8">
      <div className="flex items-center gap-4">
        <span className="text-sm">
          <span className="num font-bold">{picks.length}</span>
          <span className="ml-2 text-dim">game{picks.length === 1 ? '' : 's'} selected</span>
        </span>
        <a href={href} download className="btn-primary ml-auto sm:ml-0">
          Download .ics
        </a>
        <button onClick={clear} className="btn-muted">
          Clear
        </button>
      </div>
    </div>
  )
}
