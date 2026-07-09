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
    return <p className="py-12 text-center text-slate-400">{emptyMessage}</p>
  }
  const groups: { key: string; heading: string; items: Fixture[] }[] = []
  for (const f of fixtures) {
    const key = dateKey(f.kickoff, tz)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(f)
    else groups.push({ key, heading: dateHeading(f.kickoff, tz), items: [f] })
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{g.heading}</h3>
          <div className="space-y-2">
            {g.items.map((f) => (
              <FixtureCard key={`${f.competition}:${f.id}`} fixture={f} pickable={pickable} showLeague={showLeague} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
