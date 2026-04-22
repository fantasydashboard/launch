// api/admin/send-trial-emails.js
// Automated trial drip email system.
// - GET  = Vercel cron trigger (sends all pending emails for all trial users)
// - POST with admin JWT = manual trigger from admin panel (sends all pending)
// - POST with user JWT + welcome_only = instant welcome email for that user only

import { createClient } from '@supabase/supabase-js'
import { TRIAL_EMAILS, TRIAL_SEQUENCE } from './trial-email-templates.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: `Missing env vars. SUPABASE_URL: ${!!SUPABASE_URL}, SERVICE_ROLE_KEY: ${!!SERVICE_ROLE_KEY}`
    })
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // ── Auth logic ────────────────────────────────────────────────────────────────
  // GET = cron (no auth required — URL is not public)
  // POST = either admin manual trigger or user welcome_only trigger
  let welcomeOnlyUserId = null

  if (req.method === 'POST') {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' })
    }
    const userJwt = authHeader.replace('Bearer ', '')

    const { data: { user }, error: jwtErr } = await admin.auth.getUser(userJwt)
    if (jwtErr || !user) return res.status(401).json({ error: 'Invalid token: ' + jwtErr?.message })

    const { welcome_only } = req.body || {}

    if (welcome_only) {
      // Any authenticated user can trigger their own welcome email
      welcomeOnlyUserId = user.id
    } else {
      // Full trigger requires admin
      const { data: callerProfile } = await admin
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      if (callerProfile?.subscription_tier !== 'admin') {
        return res.status(403).json({ error: `Admin access required. Your tier: ${callerProfile?.subscription_tier}` })
      }
    }
  } else if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const now = new Date()
    const results = { sent: 0, skipped: 0, errors: [] }

    // ── 1. Fetch trial users ──────────────────────────────────────────────────
    let profilesQuery = admin
      .from('profiles')
      .select('id, email, trial_started_at, trial_expires_at')
      .not('trial_started_at', 'is', null)

    if (welcomeOnlyUserId) {
      profilesQuery = profilesQuery.eq('id', welcomeOnlyUserId)
    }

    const { data: profiles, error: profileErr } = await profilesQuery
    if (profileErr) {
      return res.status(500).json({ error: 'Failed to query profiles: ' + profileErr.message })
    }

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ ...results, message: 'No trial users found' })
    }

    // ── 2. Build paid user set ────────────────────────────────────────────────
    const { data: activeIndSubs } = await admin
      .from('individual_subscriptions')
      .select('user_id')
      .eq('status', 'active')

    const { data: activeLeaguePasses } = await admin
      .from('league_passes')
      .select('purchased_by_user_id')
      .eq('active', true)

    const paidUserIds = new Set([
      ...(activeIndSubs || []).map(s => s.user_id),
      ...(activeLeaguePasses || []).map(p => p.purchased_by_user_id).filter(Boolean),
    ])

    // ── 3. Fetch existing email log ───────────────────────────────────────────
    const { data: emailLog } = await admin
      .from('trial_email_log')
      .select('user_id, email_id')

    const sentSet = new Set(
      (emailLog || []).map(l => `${l.user_id}::${l.email_id}`)
    )

    // ── 4. Process each user ──────────────────────────────────────────────────
    const sequence = welcomeOnlyUserId
      ? TRIAL_SEQUENCE.filter(s => s.id === 'trial_welcome')
      : TRIAL_SEQUENCE

    for (const profile of profiles) {
      if (!profile.email || !profile.trial_started_at) continue

      const trialStart = new Date(profile.trial_started_at)
      const trialExpiry = profile.trial_expires_at ? new Date(profile.trial_expires_at) : null
      const trialDay = Math.floor((now.getTime() - trialStart.getTime()) / 86400000)

      for (const step of sequence) {
        const emailId = step.id
        const template = TRIAL_EMAILS[emailId]
        if (!template) continue

        // Already sent?
        if (sentSet.has(`${profile.id}::${emailId}`)) {
          results.skipped++
          continue
        }

        // Skip paid users for ending/expired emails
        if (step.skipIfPaid && paidUserIds.has(profile.id)) {
          results.skipped++
          continue
        }

        // Check timing
        let shouldSend = false

        if (step.useExpiryDate) {
          // trial_expired: send if trial has expired and within last 3 days of expiry
          if (trialExpiry && now >= trialExpiry) {
            const daysSinceExpiry = Math.floor((now.getTime() - trialExpiry.getTime()) / 86400000)
            shouldSend = daysSinceExpiry >= 0 && daysSinceExpiry <= 3
          }
        } else {
          // Normal day-based: send if we're on or past the scheduled day
          shouldSend = trialDay >= step.day
        }

        if (!shouldSend) continue

        // ── Send email via Resend ───────────────────────────────────────────
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Ultimate Fantasy Dashboard <notifications@ultimatefantasydashboard.com>',
              to: [profile.email],
              subject: template.subject,
              html: template.html,
            }),
          })

          if (!response.ok) {
            const errText = await response.text()
            console.error(`[send-trial-emails] Resend error for ${profile.email} (${emailId}):`, errText)
            results.errors.push({ email: profile.email, emailId, error: errText })
            continue
          }

          // Log success
          const { error: logErr } = await admin
            .from('trial_email_log')
            .insert({ user_id: profile.id, email_id: emailId })

          if (logErr) {
            console.warn(`[send-trial-emails] Log insert failed for ${profile.email} (${emailId}):`, logErr.message)
          }

          sentSet.add(`${profile.id}::${emailId}`)
          results.sent++
          console.log(`[send-trial-emails] Sent ${emailId} to ${profile.email}`)

          // Stay under Resend's 5 req/sec rate limit.
          await new Promise(r => setTimeout(r, 250))

          // At most one drip email per user per cron run — backlog catches up 1/day.
          if (!welcomeOnlyUserId) break

        } catch (sendErr) {
          console.error(`[send-trial-emails] Fetch error for ${profile.email} (${emailId}):`, sendErr)
          results.errors.push({ email: profile.email, emailId, error: sendErr.message || 'Network error' })
        }
      }
    }

    return res.status(200).json(results)

  } catch (err) {
    console.error('[send-trial-emails] caught error:', err)
    return res.status(500).json({ error: err.message || 'Unknown server error' })
  }
}
