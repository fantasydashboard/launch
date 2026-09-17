#!/usr/bin/env node
/**
 * Who signs up, who connects a league, and who pays.
 *
 * WHY THIS EXISTS. The admin page reports signups and paid users but nothing in between, so
 * the question that actually matters — do people ever reach the product — has never been
 * answered. The signups board showed twenty accounts in a row with no league attached, which
 * is either a catastrophic onboarding failure or an artifact of two products sharing one
 * database. This tells you which.
 *
 * READS THE KEY FROM THE ENVIRONMENT, never from a file in the repo and never from an
 * argument (which would put it in your shell history):
 *
 *   export SUPABASE_SERVICE_ROLE_KEY='...'
 *   node scripts/activation-report.mjs [days]
 *
 * The service role bypasses row-level security, so this is read-only by construction here —
 * it issues selects and nothing else.
 */

import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  || 'https://ergxtydfgffqgkddclvr.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY in your environment first:\n')
  console.error("  export SUPABASE_SERVICE_ROLE_KEY='...'")
  console.error('  node scripts/activation-report.mjs 30\n')
  process.exit(1)
}

const DAYS = Number(process.argv[2]) || 30
const since = new Date(Date.now() - DAYS * 86400000).toISOString()
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—')

const { data: profiles, error: pErr } = await db
  .from('profiles')
  .select('id, created_at, subscription_tier, trial_started_at')
  .gte('created_at', since)
  .order('created_at', { ascending: false })
if (pErr) { console.error('profiles:', pErr.message); process.exit(1) }

const ids = profiles.map((p) => p.id)
/* Chunked: an `in` list of a few thousand ids is a URL long enough for the gateway to
   refuse it, which fails as a confusing 400 rather than as an obvious limit. */
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

const leagues = []
const subs = []
for (const part of chunk(ids, 400)) {
  const [{ data: l }, { data: s }] = await Promise.all([
    db.from('user_leagues').select('user_id, platform, sport, created_at').in('user_id', part),
    db.from('individual_subscriptions').select('user_id, status, created_at').in('user_id', part),
  ])
  leagues.push(...(l || []))
  subs.push(...(s || []))
}

const leagueBy = new Map()
for (const l of leagues) leagueBy.set(l.user_id, [...(leagueBy.get(l.user_id) || []), l])
const paidIds = new Set(subs.filter((s) => s.status === 'active' || s.status === 'trialing').map((s) => s.user_id))

const total = profiles.length
const connected = profiles.filter((p) => leagueBy.has(p.id))
const paid = profiles.filter((p) => paidIds.has(p.id) || p.subscription_tier?.startsWith('individual'))
const paidOfConnected = connected.filter((p) => paidIds.has(p.id) || p.subscription_tier?.startsWith('individual'))
const paidOfNot = paid.length - paidOfConnected.length

console.log(`\nLast ${DAYS} days — ${total} signups\n`)
console.log(`  connected a league   ${connected.length.toString().padStart(5)}   ${pct(connected.length, total)}`)
console.log(`  never connected      ${(total - connected.length).toString().padStart(5)}   ${pct(total - connected.length, total)}`)
console.log(`  paid                 ${paid.length.toString().padStart(5)}   ${pct(paid.length, total)}`)

console.log(`\nDoes reaching the product matter?\n`)
console.log(`  paid | connected     ${paidOfConnected.length.toString().padStart(5)}   ${pct(paidOfConnected.length, connected.length)}  <- the number that decides the pricing question`)
console.log(`  paid | never connected ${paidOfNot.toString().padStart(3)}   ${pct(paidOfNot, total - connected.length)}`)

/* Platform mix is the cross-product tell: UFD and The League Beat share user_leagues, so a
   sport or platform this product does not sell is somebody else's signup. */
const byPlatform = {}
const bySport = {}
for (const l of leagues) {
  byPlatform[l.platform || '?'] = (byPlatform[l.platform || '?'] || 0) + 1
  bySport[l.sport || '?'] = (bySport[l.sport || '?'] || 0) + 1
}
console.log(`\nConnected leagues by platform:`, byPlatform)
console.log(`Connected leagues by sport:   `, bySport)

/* How fast people connect, which is what decides where a trial clock should start. */
const lags = connected.map((p) => {
  const first = leagueBy.get(p.id).map((l) => new Date(l.created_at)).sort((a, b) => a - b)[0]
  return (first - new Date(p.created_at)) / 3600000
}).filter((h) => Number.isFinite(h) && h >= 0).sort((a, b) => a - b)
if (lags.length) {
  const med = lags[Math.floor(lags.length / 2)]
  const sameDay = lags.filter((h) => h <= 24).length
  console.log(`\nSignup -> first league: median ${med.toFixed(1)}h, ${pct(sameDay, lags.length)} within a day`)
}
console.log()
