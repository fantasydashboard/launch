import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.ultimatefantasydashboard.com'

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
    if (!league_id || !platform) {
      return new Response(JSON.stringify({ error: 'Missing required fields: league_id, platform' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if already has an active unexpired pass
    const now = new Date().toISOString()
    const { data: existing } = await supabase
      .from('league_passes')
      .select('id, expires_at')
      .eq('league_id', league_id)
      .eq('active', true)
      .gt('expires_at', now)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'This league already has an active League Pass.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // expires_at = 365 days from now
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const stripePayload = {
      mode: 'payment',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${SITE_URL}/pricing?success=1&league=${encodeURIComponent(league_id)}&platform=${encodeURIComponent(platform)}&sport=${encodeURIComponent(sport || '')}`,
      cancel_url: `${SITE_URL}/pricing?league=${encodeURIComponent(league_id)}&platform=${encodeURIComponent(platform)}`,
      metadata: {
        league_id,
        platform,
        sport: sport || '',
        league_name: league_name || '',
        purchased_by_user_id: user.id,
        expires_at: expiresAt,
      },
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
