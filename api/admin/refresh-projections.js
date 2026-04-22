// api/admin/refresh-projections.js
// Daily cron that triggers the Supabase fetch-projections edge function,
// which pulls FanGraphs Depth Charts ROS + Baseball Savant into Supabase.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env vars' })
  }

  const endpoint = `${SUPABASE_URL}/functions/v1/fetch-projections`
  const startedAt = Date.now()

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    const elapsedMs = Date.now() - startedAt
    const body = await resp.text()

    if (!resp.ok) {
      console.error(`[refresh-projections] ${resp.status} after ${elapsedMs}ms:`, body)
      return res.status(502).json({ error: 'Edge function failed', status: resp.status, body, elapsedMs })
    }

    console.log(`[refresh-projections] ok in ${elapsedMs}ms`)
    return res.status(200).json({ ok: true, elapsedMs, body: safeJson(body) })
  } catch (err) {
    const elapsedMs = Date.now() - startedAt
    console.error(`[refresh-projections] threw after ${elapsedMs}ms:`, err)
    return res.status(500).json({ error: String(err), elapsedMs })
  }
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return text }
}
