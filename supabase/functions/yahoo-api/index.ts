import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user's Yahoo tokens from the database
    const { data: platform, error: platformError } = await supabase
      .from('connected_platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'yahoo')
      .single()

    if (platformError || !platform) {
      return new Response(
        JSON.stringify({ error: 'Yahoo not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is expired and refresh if needed
    let accessToken = platform.access_token
    if (platform.token_expires_at && new Date(platform.token_expires_at) < new Date()) {
      // Refresh the token
      const refreshResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${Deno.env.get('YAHOO_CLIENT_ID')}:${Deno.env.get('YAHOO_CLIENT_SECRET')}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: platform.refresh_token
        })
      })

      if (!refreshResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Yahoo token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const tokens = await refreshResponse.json()
      accessToken = tokens.access_token

      // Update tokens in database
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      await supabase
        .from('connected_platforms')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt
        })
        .eq('user_id', user.id)
        .eq('platform', 'yahoo')
    }

    // Parse the request body to get the Yahoo API endpoint
    const { endpoint } = await req.json()
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'No endpoint specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Make the request to Yahoo API
    const yahooUrl = `${YAHOO_API_BASE}${endpoint}`
    console.log('Fetching Yahoo API:', yahooUrl)

    const yahooResponse = await fetch(yahooUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!yahooResponse.ok) {
      const errorText = await yahooResponse.text()
      console.error('Yahoo API error:', yahooResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: `Yahoo API error: ${yahooResponse.status}`, details: errorText }),
        { status: yahooResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await yahooResponse.json()

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Yahoo proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
