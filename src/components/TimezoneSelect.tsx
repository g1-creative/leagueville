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
      className="max-w-40 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-300"
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
