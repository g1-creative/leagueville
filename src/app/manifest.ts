import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Leagueville',
    short_name: 'Leagueville',
    description:
      'Fixtures, results, standings and squads for the Premier League, La Liga, Ligue 1, Brasileirão and MLS — plus eleven cup competitions — with one-click calendar subscriptions.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a100e',
    theme_color: '#0a100e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
