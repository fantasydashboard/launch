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

      const { data: allProfiles, error: pErr } = await admin
        .from('profiles')
        .select('id, email, created_at, subscription_tier')
        .order('created_at', { ascending: false })

      const { data: allPasses, error: lpErr } = await admin
        .from('league_passes')
        .select('id, user_id, league_id, active, expires_at, created_at')
        .order('created_at', { ascending: false })

      if (pErr) return res.status(500).json({ error: 'profiles query failed: ' + pErr.message })
      if (lpErr) return res.status(500).json({ error: 'league_passes query failed: ' + lpErr.message })

      const now = new Date()
      const expiringCutoff = new Date(now.getTime() + Number(expiring_days) * 86400000)
      const profiles = allProfiles || []
      const passes = allPasses || []

      const filteredProfiles = profiles.filter(p => new Date(p.created_at) >= new Date(dateFilter))
      const filteredPasses = passes.filter(p => new Date(p.created_at) >= new Date(dateFilter))

      const activePasses = passes.filter(p => p.active && new Date(p.expires_at) > now)
      const activePassUserIds = new Set(activePasses.map(p => p.user_id))
      const expiringPasses = activePasses.filter(p => new Date(p.expires_at) <= expiringCutoff)
      const expiringUserIds = new Set(expiringPasses.map(p => p.user_id))

      const passCountByUser = {}
      activePasses.forEach(p => { passCountByUser[p.user_id] = (passCountByUser[p.user_id] || 0) + 1 })
      const multiPassUsers = Object.values(passCountByUser).filter(c => c >= 2).length

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
          signupsByDay: groupByDay(filteredProfiles.map(p => p.created_at)),
          passesByDay: groupByDay(filteredPasses.map(p => p.created_at)),
        }
      })
    }

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
        const rows = (profiles || [])
          .filter(p => activePassUserIds.has(p.id))
          .map(p => ({
            email: p.email,
            name: p.full_name || '',
            joined: p.created_at ? p.created_at.slice(0, 10) : '',
            passes: activePasses.filter(lp => lp.user_id === p.id).length,
            expires: activePasses
              .filter(lp => lp.user_id === p.id)
              .sort((a, b) => new Date(b.expires_at) - new Date(a.expires_at))[0]
              ?.expires_at?.slice(0, 10) || ''
          }))
        return res.status(200).json({ rows })
      }

      if (segment === 'nopass') {
        const rows = (profiles || [])
          .filter(p => !activePassUserIds.has(p.id))
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
        const expiringUserIds = new Set(expiringPasses.map(p => p.user_id))
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
          .sort((a, b) => a.daysLeft - b.daysLeft)
        return res.status(200).json({ rows })
      }

      return res.status(400).json({ error: 'Unknown segment: ' + segment })
    }

    return res.status(400).json({ error: 'Unknown action: ' + action })

  } catch (err) {
    console.error('[admin/data] caught error:', err)
    return res.status(500).json({ error: err.message || 'Unknown server error' })
  }
}

function groupByDay(dates) {
  const map = {}
  dates.forEach(d => {
    const day = d ? d.slice(0, 10) : null
    if (day) map[day] = (map[day] || 0) + 1
  })
  return Object.entries(map)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
