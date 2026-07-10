'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const KEY = 'lv-myteam'

interface MyTeam {
  league: string
  slug: string
  name: string
}

function read(): MyTeam | null {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

/** The pinned team, kept live across tabs of this page via the lv-myteam event. */
export function useMyTeam(): MyTeam | null {
  const [team, setTeam] = useState<MyTeam | null>(null)
  useEffect(() => {
    setTeam(read())
    const onChange = () => setTeam(read())
    window.addEventListener('lv-myteam', onChange)
    return () => window.removeEventListener('lv-myteam', onChange)
  }, [])
  return team
}

export function MyTeamLink() {
  const team = useMyTeam()
  if (!team) return null
  return (
    <Link
      href={`/${team.league}/${team.slug}`}
      className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-dim transition-colors hover:text-chalk"
    >
      ★ {team.name}
    </Link>
  )
}

export function PinTeamButton({ league, slug, name }: MyTeam) {
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    setPinned(read()?.slug === slug)
  }, [slug])
  const togglePin = () => {
    const next = read()?.slug === slug ? null : { league, slug, name }
    window.localStorage.setItem(KEY, JSON.stringify(next))
    setPinned(next !== null)
    window.dispatchEvent(new Event('lv-myteam'))
  }
  return (
    <button onClick={togglePin} className="btn" aria-pressed={pinned}>
      {pinned ? '★ Unpin my team' : '☆ Pin as my team'}
    </button>
  )
}
