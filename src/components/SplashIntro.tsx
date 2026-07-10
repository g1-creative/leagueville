'use client'

import { useEffect, useState } from 'react'

const KEY = 'lv-splash'

// Once-per-session cinematic intro. All motion is CSS (see .lv-splash in
// globals.css); JS only decides whether to mount and when to unmount. The app
// renders concurrently underneath, so the splash costs no time-to-interactive.
export function SplashIntro() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(KEY)) return
      window.sessionStorage.setItem(KEY, '1')
    } catch {
      return // storage unavailable — never risk replaying on every navigation
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setShow(true)
    // Fallback for the animationend event (the global reduced-motion CSS kill
    // switch, a hidden tab, etc. must never leave the overlay stuck).
    const timer = window.setTimeout(() => setShow(false), 1700)
    return () => window.clearTimeout(timer)
  }, [])

  if (!show) return null
  return (
    <div
      data-testid="splash"
      aria-hidden
      className="lv-splash"
      onAnimationEnd={(e) => {
        if (e.animationName === 'lv-splash-out') setShow(false)
      }}
    >
      <div className="lv-splash-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-full.png" alt="" className="lv-splash-logo" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/ball.png" alt="" className="lv-splash-ball" />
      </div>
    </div>
  )
}
