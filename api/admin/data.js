// api/admin/data.js
// ES module format — required because package.json has "type": "module"

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Debug: confirm env vars are present
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: `Missing env vars. SUPABASE_URL: ${!!SUPABASE_URL}, SERVICE_ROLE_KEY: ${!!SERVICE_ROLE_KEY}`
    })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }
  const userJwt = authHeader.replace('Bearer ', '')

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: { user }, error: jwtErr } = await admin.auth.getUser(userJwt)
  if (jwtErr || !user) return res.status(401).json({ error: 'Invalid token: ' + jwtErr?.message })

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  if (callerProfile?.subscription_tier !== 'admin') {
    return res.status(403).json({ error: `Admin access required. Your tier: ${callerProfile?.subscription_tier}` })
  }

  const { action, from_date, expiring_days = 30 } = req.body || {}

  try {
    if (action === 'stats') {
      const dateFilter = from_date || '2000-01-01'

      // ── Fetch all base data ───────────────────────────────────────────────────
      const { data: allProfiles, error: pErr } = await admin
        .from('profiles')
        .select('id, email, created_at, subscription_tier, stripe_customer_id, trial_started_at, trial_expires_at')
        .order('created_at', { ascending: false })

      const { data: allPasses, error: lpErr } = await admin
        .from('league_passes')
        .select('id, league_id, active, expires_at, created_at')
        .order('created_at', { ascending: false })

      const { data: allIndividualSubs } = await admin
        .from('individual_subscriptions')
        .select('id, user_id, tier, status, current_period_end, created_at')
        .order('created_at', { ascending: false })

      if (pErr) return res.status(500).json({ error: 'profiles query failed: ' + pErr.message })
      if (lpErr) return res.status(500).json({ error: 'league_passes query failed: ' + lpErr.message })

      const now = new Date()
      const nowIso = now.toISOString()
      const expiringCutoff = new Date(now.getTime() + Number(expiring_days) * 86400000)
      const profiles = allProfiles || []
      const passes = allPasses || []
      const indSubs = allIndividualSubs || []

      // ── Date-filtered subsets ─────────────────────────────────────────────────
      const filteredProfiles = profiles.filter(p => new Date(p.created_at) >= new Date(dateFilter))
      const filteredPasses   = passes.filter(p => new Date(p.created_at) >= new Date(dateFilter))
      const filteredIndSubs  = indSubs.filter(s => new Date(s.created_at) >= new Date(dateFilter))

      // ── Active pass sets ──────────────────────────────────────────────────────
      const activePasses = passes.filter(p => p.active && new Date(p.expires_at) > now)
      const activeLeagueIds = new Set(activePasses.map(p => p.league_id))
      const expiringPasses = activePasses.filter(p => new Date(p.expires_at) <= expiringCutoff)
      const expiringLeagueIds = new Set(expiringPasses.map(p => p.league_id))
      const multiPassUsers = activePasses.length > activeLeagueIds.size ? activePasses.length - activeLeagueIds.size : 0

      // ── Active individual subscriptions ───────────────────────────────────────
      const activeIndSubs = indSubs.filter(s => s.status === 'active' && new Date(s.current_period_end) > now)
      const activeMonthly = activeIndSubs.filter(s => s.tier === 'individual_monthly')
      const activeAnnual  = activeIndSubs.filter(s => s.tier === 'individual_annual')

      // Users with any active paid plan (individual subs only — league_passes has no user_id)
      const paidUserIds = new Set(activeIndSubs.map(s => s.user_id))
      const PAID_TIERS = new Set(['individual_monthly', 'individual_annual', 'premium', 'pro', 'admin'])

      // ── New KPI counts ────────────────────────────────────────────────────────
      // Free trial: trial active, no paid plan
      const freeTrial = profiles.filter(p =>
        p.trial_expires_at && new Date(p.trial_expires_at) > now &&
        !paidUserIds.has(p.id) && !PAID_TIERS.has(p.subscription_tier)
      ).length

      // Expired: trial over, no paid plan
      const expired = profiles.filter(p =>
        p.trial_expires_at && new Date(p.trial_expires_at) <= now &&
        !paidUserIds.has(p.id) && !PAID_TIERS.has(p.subscription_tier)
      ).length

      // New counts in date range
      const newFreeTrial = filteredProfiles.filter(p =>
        p.trial_expires_at && new Date(p.trial_expires_at) > now &&
        !paidUserIds.has(p.id) && !PAID_TIERS.has(p.subscription_tier)
      ).length
      const newIndividualMonthly = filteredIndSubs.filter(s => s.tier === 'individual_monthly').length
      const newIndividualAnnual  = filteredIndSubs.filter(s => s.tier === 'individual_annual').length
      const newLeaguePasses      = filteredPasses.length

      // Total passes = all active paid plans
      const totalPasses = activeMonthly.length + activeAnnual.length + activePasses.length

      // ── Stacked bar chart breakdown by type ───────────────────────────────────
      const monthlyMap = groupByDay(filteredIndSubs.filter(s => s.tier === 'individual_monthly').map(s => s.created_at), true)
      const annualMap  = groupByDay(filteredIndSubs.filter(s => s.tier === 'individual_annual').map(s => s.created_at), true)
      const leagueMap  = groupByDay(filteredPasses.map(p => p.created_at), true)

      const allPassDates = new Set([...Object.keys(monthlyMap), ...Object.keys(annualMap), ...Object.keys(leagueMap)])
      const passesByDayBreakdown = [...allPassDates].sort().map(date => ({
        date,
        individual_monthly: monthlyMap[date] || 0,
        individual_annual:  annualMap[date]  || 0,
        league_passes:      leagueMap[date]  || 0,
      }))

      return res.status(200).json({
        kpis: {
          // New fields
          freeTrial,
          expired,
          totalPasses,
          individualMonthly: activeMonthly.length,
          individualAnnual: activeAnnual.length,
          leaguePasses: activePasses.length,  // count of active league passes (not unique buyers — no user_id in table)
          newFreeTrial,
          newIndividualMonthly,
          newIndividualAnnual,
          newLeaguePasses,
          newPasses: newIndividualMonthly + newIndividualAnnual + newLeaguePasses,
          // Legacy fields kept for existing chart/email code
          totalUsers: profiles.length,
          newUsers: filteredProfiles.length,
          activePasses: activePasses.length,
          activePassUsers: activeLeagueIds.size,
          noPassUsers: profiles.filter(p => !p.stripe_customer_id).length,
          expiringPasses: expiringPasses.length,
          expiringUsers: expiringLeagueIds.size,
          multiPassUsers,
        },
        charts: {
          signupsByDay: groupByDay(filteredProfiles.map(p => p.created_at)),
          passesByDay: groupByDay(filteredPasses.map(p => p.created_at)),
          passesByDayBreakdown,
        }
      })
    }

    if (action === 'emails') {
      const { segment } = req.body

      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, full_name, created_at, subscription_tier, stripe_customer_id')
        .order('created_at', { ascending: false })

      const { data: passes } = await admin
        .from('league_passes')
        .select('id, league_id, active, expires_at, created_at')

      const now = new Date()
      const expDays = parseInt(expiring_days) || 30
      const expiringCutoff = new Date(now.getTime() + expDays * 86400000)
      const activePasses = (passes || []).filter(p => p.active && new Date(p.expires_at) > now)
      const activeLeagueIds = new Set(activePasses.map(p => p.league_id))

      if (segment === 'active') {
        const rows = (profiles || [])
          .filter(p => !!p.stripe_customer_id)
          .map(p => ({
            email: p.email,
            name: p.full_name || '',
            joined: p.created_at ? p.created_at.slice(0, 10) : '',
            tier: p.subscription_tier
          }))
        return res.status(200).json({ rows })
      }

      if (segment === 'nopass') {
        const rows = (profiles || [])
          .filter(p => !p.stripe_customer_id)
          .map(p => ({
            email: p.email,
            name: p.full_name || '',
            joined: p.created_at ? p.created_at.slice(0, 10) : '',
            tier: p.subscription_tier
          }))
        return res.status(200).json({ rows })
      }

      if (segment === 'expiring') {
        const expiringPasses = activePasses.filter(p => new Date(p.expires_at) <= expiringCutoff)
        const expiringLeagueIds = new Set(expiringPasses.map(p => p.league_id))
        const rows = (profiles || [])
          .filter(p => expiringUserIds.has(p.id))
          .map(p => {
            const userPasses = expiringPasses.filter(lp => lp.user_id === p.id)
            const soonest = userPasses.sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))[0]
            const daysLeft = soonest
              ? Math.ceil((new Date(soonest.expires_at).getTime() - now.getTime()) / 86400000)
              : 0
            return {
              email: p.email,
              name: p.full_name || '',
              joined: p.created_at ? p.created_at.slice(0, 10) : '',
              expires: soonest?.expires_at?.slice(0, 10) || '',
              daysLeft,
              leagueId: soonest?.league_id || ''
            }
          })
        return res.status(200).json({ rows })
      }

      return res.status(400).json({ error: 'Unknown segment: ' + segment })
    }

    if (action === 'kpi_detail') {
      const { type } = req.body
      const now = new Date()
      const nowIso = now.toISOString()
      const PAID_TIERS = new Set(['individual_monthly', 'individual_annual', 'premium', 'pro', 'admin'])

      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, full_name, created_at, trial_expires_at, subscription_tier')
        .order('created_at', { ascending: false })

      const { data: indSubs } = await admin
        .from('individual_subscriptions')
        .select('user_id, tier, status, current_period_end')
        .eq('status', 'active')

      const { data: leaguePasses } = await admin
        .from('league_passes')
        .select('league_id, active, expires_at, created_at')
        .eq('active', true)

      const activeIndSubs = (indSubs || []).filter(s => new Date(s.current_period_end) > now)
      const activeLeaguePasses = (leaguePasses || []).filter(p => new Date(p.expires_at) > now)

      // league_passes has no user_id column — only individual_subscriptions links to users
      const paidUserIds = new Set(activeIndSubs.map(s => s.user_id))

      const subByUser = {}
      activeIndSubs.forEach(s => { subByUser[s.user_id] = s.tier })

      // Get league counts
      const { data: userLeagues } = await admin
        .from('user_leagues')
        .select('user_id')
      const leagueCounts = {}
      ;(userLeagues || []).forEach(l => {
        leagueCounts[l.user_id] = (leagueCounts[l.user_id] || 0) + 1
      })

      function formatUser(p, overrides = {}) {
        const tier = p.subscription_tier
        const hasPaid = paidUserIds.has(p.id) || PAID_TIERS.has(tier)
        const trialActive = p.trial_expires_at && new Date(p.trial_expires_at) > now
        const trialExpired = p.trial_expires_at && new Date(p.trial_expires_at) <= now
        const subTier = subByUser[p.id]

        const status = subTier === 'individual_monthly' ? 'Individual Monthly' :
                       subTier === 'individual_annual'  ? 'Individual Annual' :
                       PAID_TIERS.has(tier)             ? tier :
                       trialActive                      ? 'Free Trial' :
                       trialExpired                     ? 'Expired' : 'Free'

        const statusColor = subTier?.startsWith('individual') ? '#22c55e' :
                            PAID_TIERS.has(tier)              ? '#22c55e' :
                            trialActive                       ? '#06b6d4' :
                            trialExpired                      ? '#ef4444' : '#6b7280'

        return {
          id: p.id,
          full_name: p.full_name || '',
          email: p.email || '',
          status,
          status_color: statusColor,
          joined: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
          trial_expires: p.trial_expires_at ? new Date(p.trial_expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
          plan: subTier || p.subscription_tier || 'Free',
          league_count: leagueCounts[p.id] || 0,
          ...overrides,
        }
      }

      let rows = []
      const allProfiles = profiles || []

      if (type === 'total_users') {
        rows = allProfiles.map(p => formatUser(p))

      } else if (type === 'free_trial') {
        rows = allProfiles
          .filter(p => p.trial_expires_at && new Date(p.trial_expires_at) > now && !paidUserIds.has(p.id) && !PAID_TIERS.has(p.subscription_tier))
          .map(p => formatUser(p))

      } else if (type === 'total_passes') {
        rows = allProfiles
          .filter(p => paidUserIds.has(p.id) || PAID_TIERS.has(p.subscription_tier) || p.stripe_customer_id)
          .map(p => formatUser(p))

      } else if (type === 'individual_monthly') {
        const ids = new Set(activeIndSubs.filter(s => s.tier === 'individual_monthly').map(s => s.user_id))
        rows = allProfiles.filter(p => ids.has(p.id)).map(p => formatUser(p, { plan: 'Individual Monthly', status: 'Active', status_color: '#06b6d4' }))

      } else if (type === 'individual_annual') {
        const ids = new Set(activeIndSubs.filter(s => s.tier === 'individual_annual').map(s => s.user_id))
        rows = allProfiles.filter(p => ids.has(p.id)).map(p => formatUser(p, { plan: 'Individual Annual', status: 'Active', status_color: '#8b5cf6' }))

      } else if (type === 'league_passes') {
        // league_passes has no user_id — show all users who have stripe_customer_id
        // and are not on individual plans (they purchased a league pass)
        const indUserIds = new Set(activeIndSubs.map(s => s.user_id))
        rows = allProfiles
          .filter(p => p.stripe_customer_id && !indUserIds.has(p.id))
          .map(p => formatUser(p, { plan: 'League Pass', status: 'Active', status_color: '#f97316' }))

      } else if (type === 'expired') {
        rows = allProfiles
          .filter(p => p.trial_expires_at && new Date(p.trial_expires_at) <= now && !paidUserIds.has(p.id) && !PAID_TIERS.has(p.subscription_tier))
          .map(p => formatUser(p))
      }

      return res.status(200).json({ rows })
    }

    return res.status(400).json({ error: 'Unknown action: ' + action })

  } catch (err) {
    console.error('[admin/data] caught error:', err)
    return res.status(500).json({ error: err.message || 'Unknown server error' })
  }
}

function groupByDay(dates, returnMap = false) {
  const map = {}
  dates.forEach(d => {
    const day = d ? d.slice(0, 10) : null
    if (day) map[day] = (map[day] || 0) + 1
  })
  if (returnMap) return map
  return Object.entries(map)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
