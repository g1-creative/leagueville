import type { Metadata } from 'next'
import { Archivo, Martian_Mono } from 'next/font/google'
import Link from 'next/link'
import { LeagueNav } from '@/components/LeagueNav'
import { MyTeamLink } from '@/components/MyTeam'
import { SelectionTray } from '@/components/SelectionTray'
import { TimezoneProvider } from '@/components/TimezoneProvider'
import { TimezoneSelect } from '@/components/TimezoneSelect'
import './globals.css'

const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], axes: ['wdth'] })
const martian = Martian_Mono({ variable: '--font-martian', subsets: ['latin'], weight: ['500', '700'] })

export const metadata: Metadata = {
  title: 'Leagueville — Soccer fixtures & calendars',
  description:
    'Fixtures, results, standings and squads for the Premier League, La Liga, Ligue 1, Brasileirão and MLS — with one-click calendar subscriptions.',
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
              <Link href="/" className="display text-[15px] leading-none">
                Leagueville
              </Link>
              <LeagueNav />
              <div className="ml-auto flex items-center gap-3">
                <MyTeamLink />
                <TimezoneSelect />
              </div>
            </div>
          </header>
          <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">{children}</main>
          <SelectionTray />
          <footer className="border-t border-rule px-4 py-8 sm:px-6 lg:px-8">
            <p className="eyebrow">Data from ESPN and TheSportsDB</p>
            <p className="mt-1.5 text-xs text-dim">Not affiliated with any league or club.</p>
          </footer>
        </TimezoneProvider>
      </body>
    </html>
  )
}
