// Stripe Billing Portal session.
//
// Every subscriber needs a way to cancel, change their card, and read their invoices, and
// it needs to be reachable without emailing anyone. Without it a customer who wants out
// disputes the charge instead — which costs the fee, the revenue, and a mark against the
// account, and is a far worse outcome than the cancellation they were trying to make.
//
// Stripe hosts the whole thing; this only mints a short-lived link to it.

import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not signed in' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Not signed in' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    /* No Stripe customer means they have never checked out, so there is nothing to manage.
       Say that plainly rather than returning a portal link to an empty account. */
    if (!profile?.stripe_customer_id) {
      return new Response(JSON.stringify({
        error: "You don't have a subscription to manage yet."
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
    const appUrl = Deno.env.get('APP_URL') || 'https://ultimatefantasydashboard.com'

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('[create-portal-session] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Could not open the billing portal' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
