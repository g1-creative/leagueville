import Image from 'next/image'
import type { Player } from '@/lib/types'

const POSITION_SECTIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Other'] as const

function positionKey(p: Player): (typeof POSITION_SECTIONS)[number] {
  return (POSITION_SECTIONS as readonly string[]).includes(p.position ?? '')
    ? (p.position as (typeof POSITION_SECTIONS)[number])
    : 'Other'
}

export function SquadTable({ players }: { players: Player[] }) {
  if (players.length === 0)
    return (
      <div className="board px-6 py-14 text-center">
        <p className="text-sm text-dim">Squad unavailable right now.</p>
      </div>
    )
  const sections = POSITION_SECTIONS.map((pos) => ({
    pos,
    members: players.filter((p) => positionKey(p) === pos),
  })).filter((s) => s.members.length > 0)

  return (
    <div className="space-y-7">
      {sections.map((s) => (
        <div key={s.pos}>
          <div className="mb-2.5 flex items-center gap-3">
            <h3 className="display text-[11px] leading-none">{s.pos}s</h3>
            <span className="h-px flex-1 bg-rule" />
          </div>
          <div className="board">
            <table className="w-full text-sm">
              <tbody>
                {s.members.map((p) => (
                  <tr key={p.id} className="board-row">
                    <td className="num w-12 px-3 py-2.5 text-right text-[11px] text-dim">{p.jersey ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium">{p.name}</td>
                    <td className="px-3 py-2.5 text-[13px] tabular-nums text-dim">{p.age ? `${p.age} yrs` : ''}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2 text-[13px] text-dim">
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
