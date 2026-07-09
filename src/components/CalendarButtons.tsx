'use client'

import { useEffect, useState } from 'react'

export function CalendarButtons({ path, label }: { path: string; label: string }) {
  const [origin, setOrigin] = useState('')
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  const webcal = `${origin}${path}`.replace(/^https?:/, 'webcal:')
  const gcal = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-400">{label}:</span>
      <a href={webcal} className="btn">
        📅 Subscribe (Apple / Outlook)
      </a>
      <a href={gcal} target="_blank" rel="noreferrer" className="btn">
        Google Calendar
      </a>
      <a href={path} download className="btn-muted" title="One-time import — won't update if kickoff times change">
        Download .ics
      </a>
    </div>
  )
}
