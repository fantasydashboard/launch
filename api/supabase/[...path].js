// api/supabase/[...path].js
// Vercel serverless function — proxies all Supabase requests server-side.
// This makes Supabase calls same-origin from the browser's perspective,
// bypassing Safari ITP which blocks cross-origin fetches to known trackers.

export default async function handler(req, res) {
  // The real Supabase project URL (use the original, not the custom domain)
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

  // Build the path after /api/supabase/
  const path = req.url.replace(/^\/api\/supabase/, '')

  const targetUrl = `${SUPABASE_URL}${path}`

  // Forward all headers except host
  const forwardHeaders = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== 'host') {
      forwardHeaders[key] = value
    }
  }

  try {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    })

    // Forward response headers
    for (const [key, value] of response.headers.entries()) {
      // Skip headers that Vercel manages
      if (['transfer-encoding', 'connection'].includes(key.toLowerCase())) continue
      res.setHeader(key, value)
    }

    // Add CORS headers so the browser accepts the response
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    res.status(response.status)

    const data = await response.text()
    res.send(data)
  } catch (err) {
    console.error('[supabase-proxy] error:', err)
    res.status(502).json({ error: 'Proxy error', message: err.message })
  }
}
