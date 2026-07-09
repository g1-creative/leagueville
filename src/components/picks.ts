'use client'

import { useSyncExternalStore } from 'react'

const KEY = 'lv-picks'
const EMPTY: string[] = []

let cache: string[] | null = null
const listeners = new Set<() => void>()

function load(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(next: string[]) {
  cache = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — picks stay in memory
  }
  listeners.forEach((l) => l())
}

export function togglePick(token: string) {
  const current = cache ?? load()
  write(current.includes(token) ? current.filter((t) => t !== token) : [...current, token])
}

export function clearPicks() {
  write([])
}

export function usePicks() {
  const picks = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => {
      if (cache === null) cache = load()
      return cache
    },
    () => EMPTY,
  )
  return { picks, toggle: togglePick, clear: clearPicks }
}
