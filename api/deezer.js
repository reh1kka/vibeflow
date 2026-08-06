/**
 * Proxy Deezer API for production (browser CORS + no Vite /deezer rewrite).
 * Usage: /api/deezer?p=/search/artist?q=foo%26limit=5
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }

  const raw = typeof req.query?.p === 'string' ? req.query.p : ''
  if (!raw.startsWith('/')) {
    res.status(400).json({ error: 'missing p' })
    return
  }

  try {
    const upstream = await fetch(`https://api.deezer.com${raw}`, {
      headers: { Accept: 'application/json' },
    })
    const text = await upstream.text()
    res
      .status(upstream.status)
      .setHeader('Content-Type', 'application/json; charset=utf-8')
      .send(text)
  } catch (e) {
    res.status(502).json({ error: String(e?.message || e) })
  }
}
