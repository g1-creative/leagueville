import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { LeagueNav } from '@/components/LeagueNav'
import { MyTeamLink } from '@/components/MyTeam'
import { SelectionTray } from '@/components/SelectionTray'
import { TimezoneProvider } from '@/components/TimezoneProvider'
import { TimezoneSelect } from '@/components/TimezoneSelect'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Leagueville — Soccer fixtures & calendars',
  description:
    'Fixtures, results, standings and squads for the Premier League, La Liga, Ligue 1, Brasileirão and MLS — plus eleven cup competitions — with one-click calendar subscriptions.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-100 antialiased`}>
        <TimezoneProvider>
          <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="text-lg font-black tracking-tight">
                ⚽ Leagueville
              </Link>
              <LeagueNav />
              <div className="ml-auto flex items-center gap-3">
                <MyTeamLink />
                <TimezoneSelect />
              </div>
            </div>
          </header>
          <main className="px-4 py-6 pb-24 sm:px-6 lg:px-8">{children}</main>
          <SelectionTray />
          <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
            Data from ESPN and TheSportsDB. Not affiliated with any league or club.
          </footer>
        </TimezoneProvider>
      </body>
    </html>
  )
}
