import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing stripe-signature header', { status: 400 })
  const body = await req.text()
  let event: any
  try {
    event = await verifyStripeWebhook(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }
  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }
  const session = event.data.object
  const meta = session.metadata || {}
  const { league_id, platform, sport, season_key, purchased_by_user_id } = meta
  if (!league_id || !platform || !sport || !season_key) {
    console.error('Missing metadata fields in session:', session.id)
    return new Response('Missing metadata', { status: 400 })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: existing } = await supabase.from('league_passes').select('id').eq('stripe_session_id', session.id).maybeSingle()
  if (existing) {
    console.log('Already processed session:', session.id)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }
  const { error } = await supabase.from('league_passes').insert({
    league_id, platform, sport, season_key,
    purchased_by_user_id: purchased_by_user_id || null,
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent || null,
    active: true,
  })
  if (error) {
    console.error('Supabase insert error:', error)
    return new Response('Database error', { status: 500 })
  }
  console.log(`League Pass activated: ${league_id} (${platform}/${sport}) season: ${season_key}`)
  return new Response(JSON.stringify({ received: true }), { status: 200 })
})

async function verifyStripeWebhook(payload: string, signature: string, secret: string): Promise<any> {
  const parts = Object.fromEntries(signature.split(',').map(part => { const [key, ...rest] = part.split('='); return [key, rest.join('=')] }))
  const timestamp = parts['t']
  const expectedSig = parts['v1']
  if (!timestamp || !expectedSig) throw new Error('Malformed signature')
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error('Timestamp too old')
  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const computedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (computedSig !== expectedSig) throw new Error('Signature mismatch')
  return JSON.parse(payload)
}
