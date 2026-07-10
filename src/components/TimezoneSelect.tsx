'use client'

import { useTz } from './TimezoneProvider'

export function TimezoneSelect() {
  const { tz, setTz } = useTz()
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [tz]
  return (
    <select
      value={tz}
      onChange={(e) => setTz(e.target.value)}
      aria-label="Timezone"
      className="min-h-11 max-w-40 rounded-[3px] border border-rule bg-board px-2 py-1.5 text-xs text-dim transition-colors hover:text-chalk md:min-h-0 md:text-[11px]"
    >
      {!zones.includes(tz) && <option value={tz}>{tz}</option>}
      {zones.map((z) => (
        <option key={z} value={z}>
          {z}
        </option>
      ))}
    </select>
  )
}
