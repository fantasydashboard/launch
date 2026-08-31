import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT and get the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json()
    const { plan, league_id, platform, sport, league_name } = body

    if (!plan) {
      return new Response(JSON.stringify({ error: 'Missing required field: plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    /* League Pass and monthly billing were retired for the 2026 season.
       League Pass sold one edge to twelve people at once, which cancels the edge it was
       selling — a cheat code everyone in your league has is not a cheat code. That mechanic
       now belongs to The League Beat, where everyone having it is the point.
       Monthly was a discount in disguise: a four-month season means a monthly subscriber
       paid roughly $32 and churned in January, less than the annual price.
       Refused here rather than silently falling through to an unknown-plan error, so an old
       cached page or a bookmarked link says something a human can act on. */
    if (plan === 'league_pass' || plan === 'individual_monthly') {
      return new Response(JSON.stringify({
        error: 'That plan is no longer offered. UFD is now a single Season Pass — please reload the pricing page.'
      }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Stripe setup ──────────────────────────────────────────────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    const appUrl = Deno.env.get('APP_URL') || 'https://ultimatefantasydashboard.com'

    // ── Get or create Stripe customer ─────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email || '',
        metadata: { supabase_user_id: user.id }
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // ── Build checkout session based on plan ──────────────────────────────────
    let sessionParams: Stripe.Checkout.SessionCreateParams

    if (plan === 'individual_annual') {
      const priceId = Deno.env.get('STRIPE_INDIVIDUAL_ANNUAL_PRICE_ID')!
      sessionParams = {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        // Surfaces the "Add promotion code" link in Stripe Checkout so returning users can
        // paste at-risk-drip codes (e.g. COMEBACK10). This is now the only checkout, so the
        // old "annual only" caveat no longer applies.
        allow_promotion_codes: true,
        success_url: `${appUrl}/pricing?success=1&plan=individual_annual`,
        cancel_url: `${appUrl}/pricing?cancelled=1`,
        metadata: {
          plan: 'individual_annual',
          user_id: user.id,
        }
      }
    } else {
      return new Response(JSON.stringify({ error: `Unknown plan: ${plan}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('[create-checkout-session] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
