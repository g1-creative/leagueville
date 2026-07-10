import { describe, it, expect } from 'vitest'
import manifest from './manifest'

describe('manifest', () => {
  const m = manifest()

  it('installs as a standalone app themed to the pitch', () => {
    expect(m.name).toBe('Leagueville')
    expect(m.short_name).toBe('Leagueville')
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.background_color).toBe('#0a100e')
    expect(m.theme_color).toBe('#0a100e')
  })

  it('ships any + maskable icons at 192 and 512', () => {
    const icons = m.icons ?? []
    const find = (purpose: string, size: string) =>
      icons.find((i) => i.purpose === purpose && i.sizes === size)
    expect(find('any', '192x192')?.src).toBe('/icons/icon-192.png')
    expect(find('any', '512x512')?.src).toBe('/icons/icon-512.png')
    expect(find('maskable', '192x192')?.src).toBe('/icons/icon-maskable-192.png')
    expect(find('maskable', '512x512')?.src).toBe('/icons/icon-maskable-512.png')
  })
})
