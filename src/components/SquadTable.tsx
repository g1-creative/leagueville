import Image from 'next/image'
import type { Player } from '@/lib/types'

const POSITION_SECTIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Other'] as const

function positionKey(p: Player): (typeof POSITION_SECTIONS)[number] {
  return (POSITION_SECTIONS as readonly string[]).includes(p.position ?? '')
    ? (p.position as (typeof POSITION_SECTIONS)[number])
    : 'Other'
}

export function SquadTable({ players }: { players: Player[] }) {
  if (players.length === 0) return <p className="py-12 text-center text-slate-400">Squad unavailable right now.</p>
  const sections = POSITION_SECTIONS.map((pos) => ({
    pos,
    members: players.filter((p) => positionKey(p) === pos),
  })).filter((s) => s.members.length > 0)

  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <div key={s.pos}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{s.pos}s</h3>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <tbody>
                {s.members.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 last:border-0">
                    <td className="w-10 px-3 py-2 text-right font-mono text-slate-500">{p.jersey ?? '—'}</td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-slate-400">{p.age ? `${p.age} yrs` : ''}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2 text-slate-300">
                        {p.flag && (
                          <Image src={p.flag} alt={p.nationality ?? ''} width={16} height={12} className="h-3 w-4 object-cover" />
                        )}
                        {p.nationality ?? ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
