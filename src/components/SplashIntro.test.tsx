import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { SplashIntro } from './SplashIntro'

beforeEach(() => {
  window.sessionStorage.clear()
  // jsdom has no matchMedia
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('SplashIntro', () => {
  it('plays on a fresh session and records the visit', () => {
    const { getByTestId } = render(<SplashIntro />)
    expect(getByTestId('splash')).toBeDefined()
    expect(window.sessionStorage.getItem('lv-splash')).toBe('1')
  })

  it('does not play again within the same session', () => {
    window.sessionStorage.setItem('lv-splash', '1')
    const { queryByTestId } = render(<SplashIntro />)
    expect(queryByTestId('splash')).toBeNull()
  })

  it('skips entirely under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const { queryByTestId } = render(<SplashIntro />)
    expect(queryByTestId('splash')).toBeNull()
  })

  it('removes itself after the animation window', () => {
    vi.useFakeTimers()
    const { queryByTestId } = render(<SplashIntro />)
    expect(queryByTestId('splash')).toBeDefined()
    act(() => {
      vi.advanceTimersByTime(1700)
    })
    expect(queryByTestId('splash')).toBeNull()
  })
})
