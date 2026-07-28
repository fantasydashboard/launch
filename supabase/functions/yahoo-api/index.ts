import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

/**
 * Exchange the stored refresh_token for a fresh access_token and persist it.
 * Throws on failure (e.g. invalid_client = dead app credentials, or an invalid
 * refresh_token) so the caller can surface a clear reason instead of a bare 403.
 */
async function refreshYahooToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refreshToken: string,
): Promise<string> {
  const YAHOO_CLIENT_ID = Deno.env.get('YAHOO_CLIENT_ID')
  const YAHOO_CLIENT_SECRET = Deno.env.get('YAHOO_CLIENT_SECRET')
  if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET) {
    throw new Error('Yahoo credentials not configured (YAHOO_CLIENT_ID/SECRET env missing)')
  }

  const refreshResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!refreshResponse.ok) {
    const detail = await refreshResponse.text()
    // invalid_client here == the Yahoo developer app's credentials are dead/rotated;
    // invalid_grant == the refresh_token itself is bad (user must reconnect).
    throw new Error(`refresh ${refreshResponse.status}: ${detail}`)
  }

  const tokens = await refreshResponse.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  await supabase
    .from('connected_platforms')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
    })
    .eq('user_id', userId)
    .eq('platform', 'yahoo')

  return tokens.access_token
}

serve(async (req) => {
  // Handle CORS preflight - MUST return 200 OK
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // Get the authorization header (Supabase JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user and get their ID
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Get the user's Yahoo tokens from the database
    const { data: platform, error: platformError } = await supabase
      .from('connected_platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'yahoo')
      .single()

    if (platformError || !platform) {
      console.error('Platform error:', platformError)
      return new Response(
        JSON.stringify({ error: 'Yahoo not connected', details: platformError?.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Yahoo platform found, token expires:', platform.token_expires_at)

    // Refresh proactively if the stored token is past its clock expiry.
    let accessToken = platform.access_token
    let alreadyRefreshed = false
    const tokenExpired = platform.token_expires_at && new Date(platform.token_expires_at) < new Date()

    if (tokenExpired) {
      console.log('Token past clock-expiry, refreshing...')
      try {
        accessToken = await refreshYahooToken(supabase, user.id, platform.refresh_token)
        alreadyRefreshed = true
        console.log('Token refreshed (clock-expiry path)')
      } catch (e) {
        console.error('Token refresh failed:', (e as Error).message)
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Yahoo token', details: (e as Error).message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse the request body to get the Yahoo API endpoint
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'No endpoint specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const yahooUrl = `${YAHOO_API_BASE}${endpoint}`
    const callYahoo = (tok: string) =>
      fetch(yahooUrl, { headers: { 'Authorization': `Bearer ${tok}`, 'Accept': 'application/json' } })

    console.log('Fetching Yahoo API:', yahooUrl)
    let yahooResponse = await callYahoo(accessToken)
    console.log('Yahoo API response status:', yahooResponse.status)

    // Yahoo can INVALIDATE a token before its clock expiry (revoke, re-auth elsewhere,
    // security resets), which the clock-only check above never catches — the token looks
    // valid but every call comes back 401/403. If that happens and we haven't already
    // refreshed for this request, force one refresh + retry. A fresh token that STILL
    // fails means an app-level problem (dead credentials / throttle) — we stop and report it.
    if (
      (yahooResponse.status === 401 || yahooResponse.status === 403) &&
      !alreadyRefreshed &&
      platform.refresh_token
    ) {
      console.log(`Yahoo ${yahooResponse.status} on a not-yet-expired token — forcing refresh + retry`)
      try {
        accessToken = await refreshYahooToken(supabase, user.id, platform.refresh_token)
        console.log('Token refreshed (401/403 retry path), retrying request')
        yahooResponse = await callYahoo(accessToken)
        console.log('Retry Yahoo API response status:', yahooResponse.status)
      } catch (e) {
        // Refresh itself failed — surface the real reason (invalid_client = dead app creds,
        // invalid_grant = user must reconnect) instead of the opaque 403.
        console.error('Force-refresh failed:', (e as Error).message)
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Yahoo token', details: (e as Error).message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!yahooResponse.ok) {
      const errorText = await yahooResponse.text()
      console.error('Yahoo API error:', yahooResponse.status, errorText)
      return new Response(
        JSON.stringify({
          error: `Yahoo API error: ${yahooResponse.status}`,
          details: errorText,
          message: yahooResponse.status === 400 ? 'You may not have any leagues for this sport' : 'Yahoo API request failed'
        }),
        { status: yahooResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await yahooResponse.json()
    console.log('Yahoo API success')

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Yahoo proxy error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
