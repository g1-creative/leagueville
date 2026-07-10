'use client'

import { dateHeading, dateKey } from '@/lib/time'
import type { Fixture } from '@/lib/types'
import { FixtureCard } from './FixtureCard'
import { useTz } from './TimezoneProvider'

export function FixtureList({
  fixtures,
  pickable = false,
  showLeague = false,
  emptyMessage = 'No games to show.',
}: {
  fixtures: Fixture[]
  pickable?: boolean
  showLeague?: boolean
  emptyMessage?: string
}) {
  const { tz } = useTz()
  if (fixtures.length === 0) {
    return (
      <div className="board px-6 py-14 text-center">
        <p className="mx-auto max-w-md text-sm text-dim">{emptyMessage}</p>
      </div>
    )
  }
  const groups: { key: string; heading: string; items: Fixture[] }[] = []
  for (const f of fixtures) {
    const key = dateKey(f.kickoff, tz)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(f)
    else groups.push({ key, heading: dateHeading(f.kickoff, tz), items: [f] })
  }
  return (
    <div className="space-y-7">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-2.5 flex items-center gap-3">
            <h3 className="display text-[11px] leading-none">{g.heading}</h3>
            <span className="h-px flex-1 bg-rule" />
            <span className="eyebrow">{g.key}</span>
          </div>
          <div className="board">
            {g.items.map((f) => (
              <FixtureCard key={`${f.competition}:${f.id}`} fixture={f} pickable={pickable} showLeague={showLeague} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
