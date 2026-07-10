import type { Metadata, Viewport } from 'next'
import { Archivo, Martian_Mono } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { LeagueNav } from '@/components/LeagueNav'
import { MyTeamLink } from '@/components/MyTeam'
import { SelectionTray } from '@/components/SelectionTray'
import { TimezoneProvider } from '@/components/TimezoneProvider'
import { TimezoneSelect } from '@/components/TimezoneSelect'
import './globals.css'

const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], axes: ['wdth'] })
const martian = Martian_Mono({ variable: '--font-martian', subsets: ['latin'], weight: ['500', '700'] })

export const viewport: Viewport = {
  themeColor: '#0a100e',
  viewportFit: 'cover', // enables env(safe-area-inset-*) on notched phones
}

// iOS launch screens are matched by exact device metrics; a missed device
// degrades to a plain dark launch, never a broken one.
const STARTUP_IMAGES = [
  { w: 750, h: 1334, dw: 375, dh: 667, dpr: 2 },
  { w: 828, h: 1792, dw: 414, dh: 896, dpr: 2 },
  { w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3 },
  { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 },
  { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 },
  { w: 1206, h: 2622, dw: 402, dh: 874, dpr: 3 },
  { w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3 },
  { w: 1284, h: 2778, dw: 428, dh: 926, dpr: 3 },
  { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 },
].map(({ w, h, dw, dh, dpr }) => ({
  url: `/splash/splash-${w}x${h}.png`,
  media: `(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}))

export const metadata: Metadata = {
  title: 'Leagueville — Soccer fixtures & calendars',
  description:
    'Fixtures, results, standings and squads for the Premier League, La Liga, Ligue 1, Brasileirão and MLS — plus eleven cup competitions — with one-click calendar subscriptions.',
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Leagueville',
    startupImage: STARTUP_IMAGES,
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The font vars must live on :root — @theme declares --font-sans there as
  // var(--font-archivo), which is invalid at computed-value time if the vars
  // are only defined further down the tree.
  return (
    <html lang="en" className={`${archivo.variable} ${martian.variable}`}>
      <body className="bg-pitch text-chalk antialiased">
        <TimezoneProvider>
          <header className="sticky top-0 z-40 border-b border-rule bg-pitch/90 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/brand/mark.png" alt="" width={20} height={20} className="size-5" priority />
                <span className="display text-[15px] leading-none">Leagueville</span>
              </Link>
              <LeagueNav />
              <div className="ml-auto flex items-center gap-3">
                <MyTeamLink />
                <TimezoneSelect />
              </div>
            </div>
          </header>
          <main className="px-4 py-8 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-24 lg:px-8">
            {children}
          </main>
          <SelectionTray />
          <BottomNav />
          <footer className="border-t border-rule px-4 py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-8 lg:px-8">
            <div className="flex items-start gap-3">
              <Image src="/brand/mark.png" alt="Leagueville" width={24} height={24} className="size-6" />
              <div>
                <p className="eyebrow">Data from ESPN and TheSportsDB</p>
                <p className="mt-1.5 text-xs text-dim">Not affiliated with any league or club.</p>
              </div>
            </div>
          </footer>
        </TimezoneProvider>
      </body>
    </html>
  )
}
