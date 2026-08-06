/** Local first, then CDN if Vercel challenge/blocks large JSON */

const GH_CDN = 'https://cdn.jsdelivr.net/gh/reh1kka/vibeflows@main/public'

export function catalogUrls(path: string, bustCache = false): string[] {
  const local = bustCache ? `${path}?v=${Date.now()}` : path
  return [local, `${GH_CDN}${path}`]
}

export async function loadCatalogJson<T>(
  urls: string[],
  failMessage: string,
): Promise<T> {
  let last: unknown
  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const type = res.headers.get('content-type') ?? ''
        // Vercel bot challenge returns HTML
        if (type.includes('text/html')) throw new Error('blocked html')
        return (await res.json()) as T
      } catch (e) {
        last = e
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)))
      }
    }
  }
  console.warn('catalog load failed', urls, last)
  throw new Error(failMessage)
}
