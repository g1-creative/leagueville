import Link from 'next/link'
import { Section } from '@/components/Section'
import { cupsByRegion } from '@/lib/leagues'

export const metadata = { title: 'Cups — Leagueville' }

export default function CupsPage() {
  return (
    <div className="space-y-10">
      {cupsByRegion().map((g) => (
        <Section key={g.region} title={g.label}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.cups.map((c) => (
              <Link
                key={c.slug}
                href={`/cups/${c.slug}`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600"
                style={{ borderTop: `3px solid ${c.accent}` }}
              >
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-slate-400">Fixtures · Results · Table · Teams</div>
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </div>
  )
}
