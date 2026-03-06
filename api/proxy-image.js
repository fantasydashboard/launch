// api/proxy-image.js
// Vercel serverless function - fetches external images server-side (no CORS restrictions)
// Usage: /api/proxy-image?url=https://cdn.example.com/logo.png

export default async function handler(req, res) {
  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  // Basic allow-list: only proxy known fantasy CDN domains
  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return res.status(400).json({ error: 'Invalid url' })
  }

  const allowedHosts = [
    'a.espncdn.com',
    'g.espncdn.com',
    'espncdn.com',
    'sleepercdn.com',
    'yt3.googleusercontent.com',
    'yt3.ggpht.com',
    'yahoofantasysports-res.cloudinary.com',
    'ct.yimg.com',
    's.yimg.com',
    'ui-avatars.com',
  ]

  const isAllowed = allowedHosts.some(h =>
    parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h)
  )

  if (!isAllowed) {
    return res.status(403).json({ error: 'Domain not allowed: ' + parsedUrl.hostname })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UFD-ImageProxy/1.0)',
        'Accept': 'image/*,*/*',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream fetch failed' })
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const buffer = await response.arrayBuffer()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400') // cache 24h
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).send(Buffer.from(buffer))
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error: ' + err.message })
  }
}
