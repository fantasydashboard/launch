/**
 * espn-login Edge Function
 *
 * Accepts { email, password } and logs the user into ESPN/Disney's
 * auth system server-side, returning { espn_s2, swid }.
 *
 * This lets mobile users (and anyone without the Chrome extension)
 * connect private ESPN leagues without touching cookies manually.
 *
 * ESPN uses Disney's auth platform. The login flow:
 *  1. POST credentials to Disney JGC endpoint → get a token
 *  2. Exchange token at ESPN's session endpoint → get espn_s2 + SWID cookies
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Disney/ESPN auth constants (embedded in ESPN's web app)
const DISNEY_AUTH_URL = 'https://ha.registerdisney.go.com/jgc/v6/client/ESPN-ONESITE.WEB-PROD/guest/login?langPref=en-US'
const ESPN_SESSION_URL = 'https://registerdisney.go.com/jgc/v6/client/ESPN-ONESITE.WEB-PROD/guest/login?langPref=en-US'

// The ESPN web client API key — embedded in ESPN's frontend bundle.
// This is the public key ESPN uses for their own web app.
const ESPN_API_KEY = Deno.env.get('ESPN_CLIENT_API_KEY') || 'WEB-ONESITE.ESPN.COM'

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let email: string
  let password: string

  try {
    const body = await req.json()
    email = body.email?.trim()
    password = body.password
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  console.log(`[espn-login] Attempting login for: ${email.substring(0, 4)}***`)

  // ── Step 1: POST to Disney/ESPN auth endpoint ──────────────────────────
  let loginData: any
  try {
    const loginResp = await fetch(DISNEY_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `APIKEY ${ESPN_API_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Origin': 'https://www.espn.com',
        'Referer': 'https://www.espn.com/',
      },
      body: JSON.stringify({
        loginValue: email,
        password: password,
      }),
    })

    const responseText = await loginResp.text()
    console.log(`[espn-login] Auth response status: ${loginResp.status}`)

    if (!loginResp.ok) {
      console.error(`[espn-login] Auth failed ${loginResp.status}: ${responseText.substring(0, 300)}`)

      // Parse error codes from Disney's response
      let parsedError: any = {}
      try { parsedError = JSON.parse(responseText) } catch {}

      const errorCode = parsedError?.error?.code || parsedError?.code || ''
      const errorMsg = parsedError?.error?.message || parsedError?.message || ''

      if (loginResp.status === 400 && (errorCode === 'INVALID_CREDENTIALS' || errorMsg.toLowerCase().includes('invalid'))) {
        return new Response(JSON.stringify({ error: 'invalid_credentials', message: 'Incorrect email or password.' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      if (loginResp.status === 429) {
        return new Response(JSON.stringify({ error: 'rate_limited', message: 'Too many attempts. Please try again in a few minutes.' }), {
          status: 429,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        error: 'auth_failed',
        message: `ESPN login failed (${loginResp.status}). Check your credentials and try again.`,
      }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    try {
      loginData = JSON.parse(responseText)
    } catch {
      console.error('[espn-login] Could not parse auth response')
      return new Response(JSON.stringify({ error: 'parse_error', message: 'Unexpected response from ESPN.' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
  } catch (err: any) {
    console.error('[espn-login] Network error calling Disney auth:', err.message)
    return new Response(JSON.stringify({ error: 'network_error', message: 'Could not reach ESPN. Please try again.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ── Step 2: Extract espn_s2 and SWID from auth response ────────────────
  // Disney's response structure contains the tokens we need.
  // espn_s2 lives in data.s2 or data.token, SWID in data.swid or profile.swid
  let espn_s2: string | null = null
  let swid: string | null = null

  // Try common response paths
  espn_s2 = loginData?.data?.s2
    || loginData?.token
    || loginData?.access_token
    || loginData?.data?.token
    || null

  swid = loginData?.data?.swid
    || loginData?.swid
    || loginData?.data?.profile?.swid
    || loginData?.profile?.swid
    || null

  // Sometimes SWID needs braces stripped/added — normalize to no-braces storage
  if (swid) {
    swid = swid.replace(/^\{/, '').replace(/\}$/, '')
  }

  console.log(`[espn-login] Extracted: espn_s2=${espn_s2 ? 'found' : 'missing'}, swid=${swid ? 'found' : 'missing'}`)
  console.log(`[espn-login] Response keys: ${Object.keys(loginData || {}).join(', ')}`)
  if (loginData?.data) {
    console.log(`[espn-login] data keys: ${Object.keys(loginData.data || {}).join(', ')}`)
  }

  if (!espn_s2 || !swid) {
    // Log the structure to help debug if ESPN changes their response format
    console.error('[espn-login] Could not find espn_s2/swid. Full response (truncated):', JSON.stringify(loginData).substring(0, 500))

    return new Response(JSON.stringify({
      error: 'cookies_not_found',
      message: 'Login succeeded but ESPN credentials could not be extracted. ESPN may have updated their auth flow.',
      // In dev/staging we can expose this to help debug
      debug: Deno.env.get('ENVIRONMENT') !== 'production' ? loginData : undefined,
    }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ── Success ────────────────────────────────────────────────────────────
  console.log(`[espn-login] Success for ${email.substring(0, 4)}***`)
  return new Response(JSON.stringify({
    espn_s2,
    swid,
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
