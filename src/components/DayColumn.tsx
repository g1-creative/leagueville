'use client'

import type { Fixture } from '@/lib/types'
import { GameRow } from './GameRow'

export function DayColumn({
  dayKey,
  fixtures,
  heading,
}: {
  dayKey: string
  fixtures: Fixture[]
  heading?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-day={dayKey}>
      {heading && <h3 className="eyebrow">{heading}</h3>}
      {fixtures.length === 0 ? (
        <p className="py-6 text-center text-sm text-rule">—</p>
      ) : (
        <div className="board">
          {fixtures.map((f) => (
            <GameRow key={`${f.league}:${f.id}`} fixture={f} />
          ))}
        </div>
      )}
    </div>
  )
}
