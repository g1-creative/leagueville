# Mobile native experience — design

**Date:** 2026-07-09
**Status:** Approved
**Goal:** Make Leagueville on a phone feel like a native app: installable PWA with branded splash screens, bottom tab navigation, correct fixture rendering, touch-sized controls, and tables that fit the screen.

## Background

A Playwright audit (iPhone 13 / iPhone SE emulation, all routes) found:

- Fixture rows clip team names — the two `flex-1` halves in `FixtureCard` lack `min-w-0`, so `truncate` cannot shrink them and `.board`'s `overflow: hidden` cuts the row off. With pick buttons rendered, home team names disappear entirely.
- The sticky header is desktop chrome: 110px tall, three wrapped rows, the Calendar nav item clipped mid-word.
- No PWA infrastructure: no manifest, icons, theme color, or splash screens. Installed to a home screen, the site opens as a plain browser tab.
- Hundreds of tap targets below 36px (iOS guideline: 44px); dominant text sizes 9–11px.
- Standings table scrolls horizontally with no affordance; squad table wraps the age column.

What already works: no page-level horizontal overflow anywhere, and the calendar day panel is already a bottom-sheet-like pattern worth extending.

## Approach

Responsive single codebase. All mobile chrome is Tailwind-breakpoint-gated inside the existing components (`md:hidden` bottom nav, `hidden md:flex` desktop nav, responsive table columns). No user-agent detection, no separate route tree. Desktop rendering stays pixel-identical to today.

Rejected alternatives: user-agent split (duplication, cache complexity, tablet ambiguity) and a separate `(mobile)` route group (maximum duplication, unwarranted at this size).

## 1. PWA layer

### Manifest
`src/app/manifest.ts` (Next MetadataRoute.Manifest):
- `name` "Leagueville", `short_name` "Leagueville"
- `description` from existing metadata
- `display: "standalone"`, `start_url: "/"`
- `background_color` and `theme_color`: `#0a100e` (pitch)
- icons: 192 and 512 PNG, `purpose: "any"`, plus 192/512 `purpose: "maskable"` variants with safe-zone padding

### Icons and splash assets
Source artwork: the user's logo (LV mark + soccer ball + green check, wordmark below, on black).

- **App icon**: the LV+ball mark only, cropped square with padding on the logo's black background. Wordmark omitted (illegible at icon sizes). Files: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png` (extra 20% padding), `public/icons/apple-touch-icon.png` (180px).
- **iOS splash screens**: full logo (mark + wordmark) centered on black, portrait only, one PNG per current iPhone class (~9 files: 750×1334, 828×1792, 1125×2436, 1170×2532, 1179×2556, 1242×2688, 1284×2778, 1290×2796, 1206×2622) in `public/splash/`, wired as `apple-touch-startup-image` links with `device-width/device-height/-webkit-device-pixel-ratio` media queries.
- **Generation**: a one-off Node script under `scripts/` that renders crops/compositions with Playwright's headless Chromium canvas (already available locally; no new npm dependencies). Generated PNGs are committed; the script is kept for regeneration.

### Layout metadata
In `src/app/layout.tsx`:
- `export const viewport: Viewport` with `themeColor: "#0a100e"` and `viewportFit: "cover"` (enables safe-area insets).
- `metadata.appleWebApp`: `capable: true`, `statusBarStyle: "black-translucent"`, `title: "Leagueville"`, `startupImage: [...]` (the splash set).

### Non-goals
No service worker and no offline support in this pass. Install, standalone display, and splash screens do not require one.

## 2. App shell (mobile, `< md`)

### BottomNav (new client component)
- Fixed to the bottom, `md:hidden`, `z-50`, background `bg-pitch/95` with backdrop blur and a top `border-rule`, bottom padding `env(safe-area-inset-bottom)`.
- Four tabs, each ≥44px target, icon (inline SVG, stroke style consistent with the scoreboard aesthetic) over a 10px uppercase label:
  - **Home** → `/`
  - **Leagues** → opens the league sheet (not a route)
  - **Calendar** → `/calendar`
  - **My Team** → pinned team's page, read from the existing `lv-myteam` localStorage key (star icon, label shows the short team name when pinned)
- Active tab: chalk text; inactive: dim. League/team pages mark the Leagues or My Team tab active via `usePathname`.
- My Team unpinned: tab stays visible (no layout shift); tapping opens the same league sheet with an explainer line: "No team pinned — pick a league, open a team, tap ☆ Pin as my team."

### LeagueSheet (new client component)
- Bottom sheet above the nav: backdrop, slide-up panel, rounded top corners, `overscroll-behavior: contain`.
- Lists the 5 leagues as full-width 48px rows with their accent color dot/short name; tapping navigates and closes.
- Close on backdrop tap, Escape, and navigation. Focus moves into the sheet on open and restores on close (same pattern as the existing calendar day panel in `CalendarView`).

### Header (mobile)
- Single slim row: wordmark left, timezone select right. `LeagueNav` and `MyTeamLink` become `hidden md:flex` — their jobs move to the bottom nav.
- Desktop (`md+`): header exactly as today.

### SelectionTray and stacking
- On mobile the tray sits above the bottom nav: `bottom-[calc(3.5rem+env(safe-area-inset-bottom))]` (desktop keeps `bottom-0`).
- `main` bottom padding grows to clear nav + tray.
- The calendar day panel also gets safe-area/nav-aware bottom offset so the tray, panel, and nav never overlap.

## 3. FixtureCard

- **Bug fix**: `min-w-0` on both `flex-1` team containers so `truncate` works (applies at all widths).
- **Mobile layout (`< sm`)**: restack in the style of `GameRow` — kickoff time or score as a left column, home and away teams stacked on two lines with logos, league chip inline, pick button on the right. Team names render in full (truncate only as a last resort); row min-height 56px.
- The row (except the pick button) links to the game page `/{league}/game/{id}`, matching `GameRow`'s existing pattern.
- `sm+` keeps the current single-line home/time/away layout, now truncating correctly.

## 4. Touch ergonomics

- Interactive elements reach a ≥44px effective target on mobile: `.btn`/`.btn-primary` get a mobile `min-height`; the timezone select grows to 44px; pick buttons pad up; bottom-nav tabs are full-height.
- Type bump on mobile reading surfaces: 9px eyebrows stay for pure labels, but interactive/reading text at 10–11px rises to 11–13px below `sm` (fixture times, table cells, buttons).
- Pressed feedback: `active:` background states on rows and buttons (hover styles remain for pointer devices).
- Global touch polish in `globals.css`: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` on interactive elements.

## 5. Tables

- **StandingsTable `< sm`**: show Pos, team, P, GD, Pts; hide W/D/L (and GF/GA if present) with responsive classes. Full columns from `sm` up. Wrapper no longer needs horizontal scroll on phones.
- **SquadTable**: age column set `whitespace-nowrap`; column paddings tightened so nothing wraps at 390px.

## 6. Testing

- **Vitest** (existing setup): BottomNav renders 4 tabs, marks the right tab active per pathname, My Team tab reflects pinned/unpinned localStorage; LeagueSheet opens/closes on backdrop and Escape and lists 5 leagues; FixtureCard mobile and desktop layouts both render full team names; StandingsTable hides/shows the responsive columns.
- **Playwright re-audit** (same harness as the research pass, iPhone 13 + iPhone SE): zero horizontal overflow on all routes, no clipped team names with and without picks, tap-target sweep on the new chrome, and fresh screenshots of every route.
- **Manifest/PWA smoke**: served HTML contains manifest link, theme-color, apple-touch-icon, and startup-image links; `/manifest.webmanifest` parses.

## Risks

- iOS splash media queries are notoriously picky (exact pixel matches). Mitigation: generate from a known-good device matrix; a missed device degrades to a plain dark launch screen, not a broken one.
- Bottom nav overlaying content: mitigated by the `main` padding change and tray offset, verified in the Playwright pass.
