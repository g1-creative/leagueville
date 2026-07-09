'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const TzContext = createContext<{ tz: string; setTz: (tz: string) => void }>({
  tz: 'UTC',
  setTz: () => {},
})

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [tz, setTzState] = useState('UTC')

  useEffect(() => {
    const saved = window.localStorage.getItem('lv-tz')
    setTzState(saved || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  }, [])

  const setTz = (next: string) => {
    window.localStorage.setItem('lv-tz', next)
    setTzState(next)
  }

  return <TzContext.Provider value={{ tz, setTz }}>{children}</TzContext.Provider>
}

export function useTz() {
  return useContext(TzContext)
}
