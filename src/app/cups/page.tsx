import type { Metadata } from 'next'
import Link from 'next/link'
import { Section } from '@/components/Section'
import { cupsByRegion } from '@/lib/leagues'

export const metadata: Metadata = {
  title: 'Cups — Leagueville',
  description: 'Fixtures, results and tables for the European, English, Spanish, French and American cups.',
}

export default function CupsPage() {
  return (
    <div className="space-y-12">
      <div className="max-w-2xl">
        <h1 className="display text-3xl leading-[0.95] sm:text-4xl">
          The cups,
          <br />
          round by round
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-dim">
          Knockout football from Europe to the Americas. Follow every draw, tie and final alongside the league
          season.
        </p>
      </div>

      {cupsByRegion().map((g) => (
        <Section key={g.region} title={g.label}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.cups.map((c) => (
              <Link
                key={c.slug}
                href={`/cups/${c.slug}`}
                className="board p-4 transition-colors hover:bg-board-hi"
                style={{ borderLeft: `2px solid ${c.accent}` }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-[15px] font-semibold">{c.name}</div>
                  {c.shortName !== c.name && <div className="eyebrow shrink-0">{c.shortName}</div>}
                </div>
                <div className="eyebrow mt-1.5">Fixtures · Results · Table · Teams</div>
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </div>
  )
}
