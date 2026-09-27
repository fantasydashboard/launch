// api/admin/signup-canary.js
//
// Create an account, prove it landed, delete it. Hourly. Shout if any step fails.
//
// WHY THIS EXISTS. From 2026-09-17 to 2026-09-27 every signup on both products failed and
// nobody knew for ten days. A column added to user_preferences outside any migration made
// handle_new_user() raise, and because a trigger exception aborts the statement that fired it,
// the INSERT into auth.users rolled back too. Supabase reported only "Database error saving
// new user". The production logs show 23 failed attempts from 10 people on /callback alone —
// Google sign-in, the path most people actually use — and the real figure is higher because
// log retention had already eaten the first three days.
//
// Nothing caught it because nothing watched. Tests do not exercise the database trigger, the
// admin dashboard counts rows that were never created, and a signup chart reading zero looks
// the same as a quiet week. The only reliable check is to actually sign up.
//
// WHAT IT ASSERTS, AND WHY EACH ONE. Creating the user exercises the trigger, which is what
// broke. Reading the profile back proves the trigger's own work committed rather than merely
// not throwing. Deleting proves cleanup, and keeps the canary from polluting the numbers it
// is protecting.
//
// WHAT IT DOES NOT COVER. Email DELIVERY. An admin-created user is confirmed outright and
// Supabase sends nothing, so a broken mailer would pass this. That is a real gap and a
// deliberate one: proving delivery needs an inbox to read, which is a different piece of
// machinery. The outage this is built for was account creation, not mail.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

const ALERT_TO = 'support@ultimatefantasydashboard.com'
/* Routed through Resend's shared sender, same as notify-submission. */
const ALERT_FROM = 'UFD Canary <onboarding@resend.dev>'

async function alert(subject, lines) {
  if (!RESEND_API_KEY) {
    console.error('[signup-canary] RESEND_API_KEY not set — cannot alert:', subject)
    return false
  }
  const body = lines.map((l) => `<p style="margin:0 0 8px 0;font-family:monospace;font-size:13px;">${l}</p>`).join('')
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [ALERT_TO],
        subject,
        html: `<div style="background:#0B0E13;color:#E6EAF2;padding:20px;border-radius:12px;">
                 <h2 style="margin:0 0 12px 0;color:#FF5C5C;font-family:sans-serif;">Signup is broken</h2>
                 ${body}
                 <p style="margin:16px 0 0 0;font-family:sans-serif;font-size:12px;color:#8A93A6;">
                   Nobody can create an account right now. Check handle_new_user() and any column
                   recently added to profiles or user_preferences.
                 </p>
               </div>`,
      }),
    })
    return r.ok
  } catch (e) {
    console.error('[signup-canary] alert send failed', e)
    return false
  }
}

const admin = (path, init = {}) => fetch(`${SUPABASE_URL}${path}`, {
  ...init,
  headers: {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  },
})

export default async function handler(req, res) {
  /*
   * Guarded, unlike the other crons here, because this one CREATES USERS. An open endpoint
   * that does that is an invitation. Vercel sends this header on scheduled invocations when
   * CRON_SECRET is set; refusing outright when it is missing is deliberate, so a
   * misconfiguration fails loudly instead of leaving the door open.
   */
  if (!CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET not set — refusing to expose user creation' })
  }
  const auth = req.headers.authorization || ''
  const key = req.query?.key
  if (auth !== `Bearer ${CRON_SECRET}` && key !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env vars' })
  }

  /* Unique per run, and recognisable on sight if one ever survives cleanup. */
  const email = `signup-canary+${Date.now()}@ultimatefantasydashboard.com`
  const startedAt = Date.now()
  const steps = []
  let userId = null

  try {
    // 1. CREATE — this is what fires handle_new_user(), and what broke.
    const createRes = await admin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: `canary-${crypto.randomUUID()}`,
        email_confirm: true,
        /* The real client's metadata shape, so the trigger takes the same branch a person does. */
        user_metadata: { full_name: 'Signup Canary', product: 'ufd' },
      }),
    })
    const createBody = await createRes.json().catch(() => ({}))
    if (!createRes.ok || !createBody?.id) {
      steps.push(`CREATE failed — ${createRes.status} ${JSON.stringify(createBody).slice(0, 300)}`)
      throw new Error('create')
    }
    userId = createBody.id
    steps.push(`CREATE ok — ${userId}`)

    // 2. READ BACK — the trigger not throwing is not the same as the trigger working.
    const profRes = await admin(`/rest/v1/profiles?id=eq.${userId}&select=id,email,product`)
    const profile = await profRes.json().catch(() => [])
    if (!profRes.ok || !Array.isArray(profile) || profile.length !== 1) {
      steps.push(`PROFILE missing — ${profRes.status} ${JSON.stringify(profile).slice(0, 300)}`)
      throw new Error('profile')
    }
    /* Product tagging is load-bearing for every signup number on the admin page, and it is new
       enough (2026-09-17) that it has barely run in anger. Assert it rather than assume it. */
    if (profile[0].product !== 'ufd') {
      steps.push(`PROFILE product was ${JSON.stringify(profile[0].product)}, expected "ufd"`)
      throw new Error('product')
    }
    steps.push('PROFILE ok — product=ufd')

    return res.status(200).json({ ok: true, elapsedMs: Date.now() - startedAt, steps })
  } catch (err) {
    const lines = [
      `Failed at: ${err.message}`,
      ...steps,
      `Canary email: ${email}`,
      `Elapsed: ${Date.now() - startedAt}ms`,
    ]
    console.error('[signup-canary] FAILED', lines.join(' | '))
    const alerted = await alert('🚨 UFD signup is broken', lines)
    return res.status(500).json({ ok: false, alerted, steps })
  } finally {
    /*
     * Always, including after an assertion failure — a canary that leaves accounts behind
     * corrupts the very signup counts it exists to protect. Deleting the auth user cascades
     * to profiles and user_preferences.
     */
    if (userId) {
      try {
        const del = await admin(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
        if (!del.ok) {
          console.error(`[signup-canary] CLEANUP FAILED for ${userId} (${del.status}) — delete it by hand`)
          await alert('⚠️ UFD canary left an account behind', [
            `Could not delete canary user ${userId} (${email}).`,
            `HTTP ${del.status}. Remove it manually or it will be counted as a signup.`,
          ])
        }
      } catch (e) {
        console.error('[signup-canary] cleanup threw', e)
      }
    }
  }
}
