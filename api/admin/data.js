// api/admin/data.js
// Server-side admin data endpoint — uses service role key to bypass RLS.
// Verifies the caller is an admin before returning any data.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── 1. Verify admin caller ───────────────────────────────────────────────
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }
  const userJwt = authHeader.replace('Bearer ', '')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Admin endpoint not configured. Set SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.' })
  }

  // Use the service role client for all queries
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Verify the JWT belongs to an admin user
  const { data: { user }, error: jwtErr } = await admin.auth.getUser(userJwt)
  if (jwtErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  if (callerProfile?.subscription_tier !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // ── 2. Parse request ─────────────────────────────────────────────────────
  const { action, from_date, expiring_days = 30 } = req.body || {}

  try {
    // ── ACTION: stats ──────────────────────────────────────────────────────
    if (action === 'stats') {
      const dateFilter = from_date ? from_date : '2000-01-01'

      // All profiles (users)
      const { data: allProfiles } = await admin
        .from('profiles')
        .select('id, email, created_at, subscription_tier')
        .order('created_at', { ascending: false })

      // All league passes
      const { data: allPasses } = await admin
        .from('league_passes')
        .select('id, user_id, league_id, active, expires_at, created_at')
        .order('created_at', { ascending: false })

      const now = new Date()
      const expiringCutoff = new Date(now.getTime() + expiring_days * 86400000)

      const profiles = allProfiles || []
      const passes = allPasses || []

      // Filter to date range
      const filteredProfiles = profiles.filter(p => new Date(p.created_at) >= new Date(dateFilter))
      const filteredPasses = passes.filter(p => new Date(p.created_at) >= new Date(dateFilter))

      // Active passes (globally, not date-filtered — for segment counts)
      const activePasses = passes.filter(p => p.active && new Date(p.expires_at) > now)
      const activePassUserIds = new Set(activePasses.map(p => p.user_id))
      const expiringPasses = activePasses.filter(p => new Date(p.expires_at) <= expiringCutoff)
      const expiringUserIds = new Set(expiringPasses.map(p => p.user_id))

      // Users with 2+ active passes
      const passCountByUser: Record<string, number> = {}
      activePasses.forEach(p => { passCountByUser[p.user_id] = (passCountByUser[p.user_id] || 0) + 1 })
      const multiPassUsers = Object.values(passCountByUser).filter(c => c >= 2).length

      // Chart series: group by day
      const signupsByDay = groupByDay(filteredProfiles.map(p => p.created_at))
      const passesByDay = groupByDay(filteredPasses.map(p => p.created_at))

      return res.status(200).json({
        kpis: {
          totalUsers: profiles.length,
          newUsers: filteredProfiles.length,
          totalPasses: passes.length,
          newPasses: filteredPasses.length,
          activePasses: activePasses.length,
          activePassUsers: activePassUserIds.size,
          noPassUsers: profiles.filter(p => !activePassUserIds.has(p.id)).length,
          expiringPasses: expiringPasses.length,
          expiringUsers: expiringUserIds.size,
          multiPassUsers,
        },
        charts: {
          signupsByDay,
          passesByDay,
        }
      })
    }

    // ── ACTION: emails ─────────────────────────────────────────────────────
    if (action === 'emails') {
      const { segment } = req.body

      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, full_name, created_at, subscription_tier')
        .order('created_at', { ascending: false })

      const { data: passes } = await admin
        .from('league_passes')
        .select('id, user_id, league_id, active, expires_at, created_at')

      const now = new Date()
      const expDays = parseInt(expiring_days) || 30
      const expiringCutoff = new Date(now.getTime() + expDays * 86400000)

      const activePasses = (passes || []).filter(p => p.active && new Date(p.expires_at) > now)
      const activePassUserIds = new Set(activePasses.map(p => p.user_id))

      if (segment === 'active') {
        // Users with an active league pass
        const rows = (profiles || [])
          .filter(p => activePassUserIds.has(p.id))
          .map(p => ({
            email: p.email,
            name: p.full_name || '',
            joined: p.created_at?.slice(0, 10),
            passes: activePasses.filter(lp => lp.user_id === p.id).length,
            expires: activePasses
              .filter(lp => lp.user_id === p.id)
              .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0]
              ?.expires_at?.slice(0, 10) || ''
          }))
        return res.status(200).json({ rows })
      }

      if (segment === 'nopass') {
        // Users with NO active pass
        const rows = (profiles || [])
          .filter(p => !activePassUserIds.has(p.id))
          .map(p => ({
            email: p.email,
            name: p.full_name || '',
            joined: p.created_at?.slice(0, 10),
            tier: p.subscription_tier
          }))
        return res.status(200).json({ rows })
      }

      if (segment === 'expiring') {
        // Users whose pass expires within expiring_days
        const expiringPasses = activePasses.filter(p => new Date(p.expires_at) <= expiringCutoff)
        const expiringUserIds = new Set(expiringPasses.map(p => p.user_id))
        const rows = (profiles || [])
          .filter(p => expiringUserIds.has(p.id))
          .map(p => {
            const userPasses = expiringPasses.filter(lp => lp.user_id === p.id)
            const soonest = userPasses.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())[0]
            const daysLeft = soonest
              ? Math.ceil((new Date(soonest.expires_at).getTime() - now.getTime()) / 86400000)
              : 0
            return {
              email: p.email,
              name: p.full_name || '',
              joined: p.created_at?.slice(0, 10),
              expires: soonest?.expires_at?.slice(0, 10) || '',
              daysLeft,
              leagueId: soonest?.league_id || ''
            }
          })
          .sort((a, b) => a.daysLeft - b.daysLeft)
        return res.status(200).json({ rows })
      }

      return res.status(400).json({ error: 'Unknown segment' })
    }

    return res.status(400).json({ error: 'Unknown action' })

  } catch (err: any) {
    console.error('[admin/data]', err)
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function groupByDay(dates: string[]): { date: string; count: number }[] {
  const map: Record<string, number> = {}
  dates.forEach(d => {
    const day = d?.slice(0, 10)
    if (day) map[day] = (map[day] || 0) + 1
  })
  return Object.entries(map)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
