/**
 * Vercel Serverless Proxy — Supabase Auth & DB
 *
 * Routes:  /api/supabase/* → https://<project>.supabase.co/*
 *
 * Why this exists:
 *   Safari ITP blocks cross-origin fetch to supabase.co even with CORS headers
 *   set correctly on Supabase's side, because the cookie store is partitioned.
 *   Routing all Supabase traffic through the same origin (ultimatefantasydashboard.com)
 *   makes every request first-party and ITP-safe.
 */

export const config = {
  runtime: 'edge',          // Edge runtime = lowest latency, no cold starts
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export default async function handler(req) {
  // ── Validate env ────────────────────────────────────────────────────────────
  if (!SUPABASE_URL) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL not configured on server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── Build upstream URL ───────────────────────────────────────────────────────
  const url = new URL(req.url)

  // Strip the /api/supabase prefix to get the real Supabase path
  // e.g. /api/supabase/auth/v1/token → /auth/v1/token
  const upstreamPath = url.pathname.replace(/^\/api\/supabase/, '')
  const upstreamUrl = `${SUPABASE_URL}${upstreamPath}${url.search}`

  // ── Forward request headers ─────────────────────────────────────────────────
  const forwardedHeaders = new Headers(req.headers)

  // Remove headers that must not be forwarded to avoid problems
  forwardedHeaders.delete('host')
  forwardedHeaders.delete('x-forwarded-for')
  forwardedHeaders.delete('x-forwarded-host')
  forwardedHeaders.delete('x-forwarded-proto')
  forwardedHeaders.delete('x-vercel-id')

  // Ensure the anon key is always present — the browser client sends it as
  // apikey but just in case it's missing, inject it.
  if (!forwardedHeaders.get('apikey') && SUPABASE_ANON_KEY) {
    forwardedHeaders.set('apikey', SUPABASE_ANON_KEY)
  }

  // ── Proxy the request ────────────────────────────────────────────────────────
  let upstreamResponse
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: forwardedHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      // Required for edge runtime streaming
      duplex: 'half',
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy fetch failed', detail: String(err) }),
      { status: 502, headers: corsHeaders(req) }
    )
  }

  // ── Build response with CORS headers ────────────────────────────────────────
  const responseHeaders = new Headers(upstreamResponse.headers)

  // Apply CORS — allow the dashboard origin (and localhost for dev)
  const cors = corsHeaders(req)
  for (const [k, v] of cors.entries()) {
    responseHeaders.set(k, v)
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}

// ── CORS helper ──────────────────────────────────────────────────────────────
function corsHeaders(req) {
  const origin = req.headers.get('origin') || ''
  const allowed = [
    'https://ultimatefantasydashboard.com',
    'https://www.ultimatefantasydashboard.com',
    'http://localhost:5173',
    'http://localhost:4173',
  ]

  const headers = new Headers()
  headers.set(
    'Access-Control-Allow-Origin',
    allowed.includes(origin) ? origin : allowed[0]
  )
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  )
  headers.set(
    'Access-Control-Allow-Headers',
    'authorization, x-client-info, apikey, content-type, x-supabase-client'
  )
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}
