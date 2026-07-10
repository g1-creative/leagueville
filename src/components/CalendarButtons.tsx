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
      <span className="eyebrow mr-1">{label}</span>
      <a href={webcal} className="btn-primary">
        Subscribe in Apple or Outlook
      </a>
      <a href={gcal} target="_blank" rel="noreferrer" className="btn">
        Subscribe in Google Calendar
      </a>
      <a href={path} download className="btn-muted" title="One-time import — won't update if kickoff times change">
        Download .ics
      </a>
    </div>
  )
}
