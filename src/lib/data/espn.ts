const BASE = 'https://site.api.espn.com/apis'

export async function espnJson<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } })
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${path}`)
  return res.json() as Promise<T>
}
