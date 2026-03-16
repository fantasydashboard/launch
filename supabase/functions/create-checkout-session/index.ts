import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.ultimatefantasydashboard.com'

function getCurrentSeasonKey(sport: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  switch (sport) {
    case 'football':
      return month >= 9 ? `nfl_${year}` : `nfl_${year - 1}`
    case 'basketball':
      return month >= 10 ? `nba_${year}-${String(year + 1).slice(2)}` : `nba_${year - 1}-${String(year).slice(2)}`
    case 'hockey':
      return month >= 10 ? `nhl_${year}-${String(year + 1).slice(2)}` : `nhl_${year - 1}-${String(year).slice(2)}`
    case 'baseball':
      return `mlb_${year}`
    default:
      return `season_${year}`
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { league_id, platform, sport, league_name } = await req.json()
    if (!league_id || !platform || !sport) {
      return new Response(JSON.stringify({ error: 'Missing required fields: league_id, platform, sport' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const season_key = getCurrentSeasonKey(sport)
    const { data: existing } = await supabase.from('league_passes').select('id').eq('league_id', league_id).eq('season_key', season_key).eq('active', true).maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({ error: 'This league already has an active League Pass for this season.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const stripePayload = {
      mode: 'payment',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${SITE_URL}/pricing?success=1&league=${encodeURIComponent(league_id)}&platform=${encodeURIComponent(platform)}&sport=${encodeURIComponent(sport)}`,
      cancel_url: `${SITE_URL}/pricing?league=${encodeURIComponent(league_id)}&platform=${encodeURIComponent(platform)}`,
      metadata: { league_id, platform, sport, season_key, league_name: league_name || '', purchased_by_user_id: user.id },
      ...(user.email ? { customer_email: user.email } : {}),
    }
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(flattenForStripe(stripePayload)).toString(),
    })
    const session = await stripeRes.json()
    if (!stripeRes.ok) {
      console.error('Stripe error:', session)
      return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

function flattenForStripe(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object') Object.assign(result, flattenForStripe(item, `${fullKey}[${i}]`))
        else result[`${fullKey}[${i}]`] = String(item)
      })
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenForStripe(value, fullKey))
    } else if (value !== undefined && value !== null) {
      result[fullKey] = String(value)
    }
  }
  return result
}
