<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useCategoryStrength } from '@/composables/useCategoryStrength'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { useLeagueLandscape } from '@/composables/useLeagueLandscape'
import { buildPowerRankings, type PowerTeamInput } from '@/league/powerRankings'
import { buildLeagueStandings, type StakesTag } from '@/league/leagueStandings'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { buildPointsPositional } from '@/league/pointsPositional'
import { seasonStakes } from '@/myteam/seasonStakes'
import { buildTrajectory } from '@/league/powerTrajectory'
import { simulatePlayoffOdds, buildLeverage, type OddsTeam, type GameLeverage } from '@/league/playoffOdds'
import { buildHotCold } from '@/league/hotCold'
import PowerTrajectoryChart from '@/components/league/PowerTrajectoryChart.vue'
import type { Landscape } from '@/trades/landscape'

const props = withDefaults(defineProps<{ scoring?: 'points' | 'category' }>(), { scoring: 'points' })
const isCategory = computed(() => props.scoring === 'category')

const leagueStore = useLeagueStore()
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const cat = useCategoryStrength()
const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const scoring = useLeagueScoring()
const trajectory = usePowerTrajectory()

function loadAll() {
  trajectory.load({ categoryForm: isCategory.value })
  if (isCategory.value) {
    cat.load()
  } else {
    scoring.load()
    if (isEspn.value) espnPoints.load()
    else yahooLeague.load()
  }
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

// ── POINTS branch data ────────────────────────────────────────────────────────

const pool = computed<PointsPoolPlayer[]>(() =>
  (isEspn.value ? espnPoints.pool.value : yahooLeague.pool.value) as PointsPoolPlayer[],
)
const fgByKey = computed(() => (isEspn.value ? espnPoints.fgByKey.value : yahooLeague.fgByKey.value))
const rosterSlots = computed(() => (isEspn.value ? espnPoints.rosterSlots.value : yahooLeague.rosterSlots.value))

const pointsMyTeamKey = computed<string>(() => {
  if (isEspn.value) return espnPoints.myTeamId.value ?? ''
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return me ? String(me.team_key) : ''
})

function detectManagerless(t: any): boolean {
  return /manager-?less/i.test(String(t?.name ?? ''))
}

interface PointsMeta {
  name: string
  logo: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  managerless: boolean
}

const pointsTeamMeta = computed<Record<string, PointsMeta>>(() => {
  if (isEspn.value) {
    const names = espnPoints.teamNames.value
    const logos = espnPoints.teamLogos.value
    const recs = espnPoints.teamRecords.value
    const out: Record<string, PointsMeta> = {}
    for (const k of Object.keys(names)) {
      const r = recs[k] ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0 }
      out[k] = { name: names[k] || 'Team', logo: logos[k] || '', wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor, managerless: false }
    }
    return out
  }
  const out: Record<string, PointsMeta> = {}
  for (const t of leagueStore.yahooTeams ?? []) {
    out[String(t.team_key)] = {
      name: String(t.name ?? 'Team'),
      logo: String(t.logo_url ?? ''),
      wins: Number(t.wins ?? 0),
      losses: Number(t.losses ?? 0),
      ties: Number(t.ties ?? 0),
      pointsFor: Number(t.points_for ?? 0),
      managerless: detectManagerless(t),
    }
  }
  return out
})

// ── RANKINGS: category or points ─────────────────────────────────────────────

const catRankings = computed(() => {
  const s = cat.strengths.value
  if (!s.length || !cat.myTeamKey.value) return null
  const meta = cat.teamMeta.value
  const inputs: PowerTeamInput[] = s.map((x) => {
    const m = meta[x.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0 }
    return { teamKey: x.teamKey, teamName: m.name, teamLogo: m.logo, strength: x.strength, wins: m.wins, losses: m.losses, ties: m.ties, managerless: isEspn.value ? false : /manager-?less/i.test(m.name) }
  })
  return buildPowerRankings(inputs)
})

const pointsRankings = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !pointsMyTeamKey.value) return null
  const wl = trajectory.weeksLeft.value
  const model = buildPointsTeam(pool.value, fgByKey.value, scoring.weights.value, pointsMyTeamKey.value, rosterSlots.value, {
    basis: wl > 0 ? 'perWeek' : 'total',
    weeksLeft: wl,
  })
  const meta = pointsTeamMeta.value
  const inputs: PowerTeamInput[] = model.standings.map((s) => {
    const m = meta[s.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0, pointsFor: 0, managerless: false }
    return {
      teamKey: s.teamKey,
      teamName: m.name,
      teamLogo: m.logo,
      strength: s.startingPoints,
      wins: m.wins,
      losses: m.losses,
      ties: m.ties,
      pointsFor: m.pointsFor,
      managerless: m.managerless,
    }
  })
  return buildPowerRankings(inputs)
})

// Unified rankings (drives both Standings + Landscape regardless of scoring type).
const rankings = computed(() => (isCategory.value ? catRankings.value : pointsRankings.value))

// Unified myTeamKey for standings.
const activeMyTeamKey = computed(() => (isCategory.value ? cat.myTeamKey.value : pointsMyTeamKey.value))

// ── STAKES + STANDINGS (shared) ───────────────────────────────────────────────

const stakesMap = computed(() => {
  const out = new Map<string, StakesTag>()
  const rows = rankings.value?.rows ?? []
  const spots = trajectory.playoffSpots.value
  const wl = trajectory.weeksLeft.value
  if (!spots || !wl || !rows.length) return out
  for (const r of rows) {
    const sk = seasonStakes({ rank: r.recordRank, leagueSize: rows.length, weeksLeft: wl, playoffSpots: spots })
    if (sk.coastKind === 'clinched') out.set(r.teamKey, 'clinched')
    else if (sk.coastKind === 'eliminated') out.set(r.teamKey, 'eliminated')
    else if (sk.mode === 'must-win') out.set(r.teamKey, 'bubble')
  }
  return out
})

const standings = computed(() =>
  rankings.value ? buildLeagueStandings(rankings.value.rows, stakesMap.value, activeMyTeamKey.value) : [],
)

// ── Strength bar: min-anchored (same pattern as PowerRankingsRedesignView) ──────

const strengthBounds = computed(() => {
  const vals = rankings.value?.rows.map((r) => r.strength) ?? [1]
  return { min: Math.min(...vals), max: Math.max(...vals) }
})
const barPct = (s: number) => {
  const { min, max } = strengthBounds.value
  if (max <= min) return 100
  return 14 + 86 * ((s - min) / (max - min))
}

// ── CATEGORY LANDSCAPE ────────────────────────────────────────────────────────

const { view: landscapeView } = useLeagueLandscape({
  pool: cat.pool,
  fgByKey: cat.fgByKey,
  catSpecs: cat.catSpecs,
  landscape: computed<Landscape>(() => cat.engine.value?.landscape ?? new Map()),
  roleValueByKey: computed(() => cat.engine.value?.roleValueByKey ?? new Map<string, number>()),
  myTeamKey: cat.myTeamKey,
  teamNameByKey: cat.teamNameByKey,
  labelOf: cat.labelOf,
})

// ── POINTS LANDSCAPE ──────────────────────────────────────────────────────────

// Ordered team keys: YOU first, then remaining teams by standings rank (record-sorted).
// This makes YOU the leftmost column in the position grid so it's pinned/prominent.
const pointsOrderedTeamKeys = computed<string[]>(() => {
  const myKey = activeMyTeamKey.value
  // standings is already sorted by recordRank ascending
  const rankOrdered = standings.value.map((r) => r.teamKey)
  if (!myKey) return rankOrdered
  const withoutMe = rankOrdered.filter((k) => k !== myKey)
  return [myKey, ...withoutMe]
})

const pointsPositional = computed(() => {
  if (!pool.value.length) return null
  return buildPointsPositional(pool.value, fgByKey.value, scoring.weights.value, pointsOrderedTeamKeys.value)
})

// ── LOADING ───────────────────────────────────────────────────────────────────

const loading = computed(() =>
  isCategory.value
    ? cat.loading.value
    : isEspn.value
      ? espnPoints.loading.value
      : yahooLeague.loading.value,
)

// ── SHARED HELPERS ────────────────────────────────────────────────────────────

// Theme `primary` var has no alpha slot so bg-primary/NN renders nothing — use color-mix.
const primaryTint = (pct: number) => `color-mix(in srgb, var(--color-primary, #C6FF3A) ${pct}%, transparent)`

// Steepened heat scale: gamma-like curve (pct²) so top cells pop and the bottom third
// nearly disappears — much more readable than a linear 0–70% spread.
const heatBg = (pctOrNull: number | null) =>
  pctOrNull == null
    ? 'transparent'
    : `color-mix(in srgb, var(--color-primary, #C6FF3A) ${Math.round(8 + pctOrNull * pctOrNull * 82)}%, transparent)`

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ── EDGE / EXPOSED READOUT ────────────────────────────────────────────────────

/** From a list of labelled ranks, returns which positions YOU dominate (rank ≤ 2)
 *  and which expose you (rank in the bottom third). */
function edgeExposed(
  myRanks: { label: string; rank: number | null }[],
  numTeams: number,
): { edge: string[]; exposed: string[] } {
  const exposedThreshold = numTeams - Math.floor(numTeams / 3) + 1
  const edge: string[] = []
  const exposed: string[] = []
  for (const { label, rank } of myRanks) {
    if (rank == null) continue
    if (rank <= 2) edge.push(label)
    else if (rank >= exposedThreshold) exposed.push(label)
  }
  return { edge, exposed }
}

// Points grid: gather MY ranks per position from the ordered grid.
const pointsEdgeExposed = computed(() => {
  if (!pointsPositional.value) return { edge: [], exposed: [] }
  const myKey = activeMyTeamKey.value
  const numTeams = pointsOrderedTeamKeys.value.length
  const myRanks = pointsPositional.value.positions.map((row) => {
    const cell = row.cells.find((c) => c.teamKey === myKey)
    return { label: row.position, rank: cell?.rank ?? null }
  })
  return edgeExposed(myRanks, numTeams)
})

// MY ranks per category, from the landscape's category rows (transposed: category × team).
const catEdgeExposed = computed(() => {
  const lv = landscapeView.value
  if (!lv) return { edge: [], exposed: [] }
  const myIdx = lv.teams.findIndex((t) => t.isMe)
  if (myIdx < 0) return { edge: [], exposed: [] }
  const myRanks = lv.categoryRows.map((row) => ({ label: row.label, rank: row.ranks[myIdx] ?? null }))
  return edgeExposed(myRanks, lv.numTeams)
})

// Category branch ROSTER-POSITION edge/exposed (from the landscape position grid), so
// the position view of the matrix toggle is as actionable as the category view.
const catPositionEdgeExposed = computed(() => {
  const lv = landscapeView.value
  if (!lv) return { edge: [], exposed: [] }
  const myIdx = lv.teams.findIndex((t) => t.isMe)
  if (myIdx < 0) return { edge: [], exposed: [] }
  const myRanks = lv.positionRows.map((row) => ({ label: row.label, rank: row.ranks[myIdx] ?? null }))
  return edgeExposed(myRanks, lv.numTeams)
})

// Matrix toggle for category leagues: show categories OR roster positions, one at a time.
// Both render the SAME transposed grid (teams as columns, the metric as rows) so columns
// stay aligned regardless of team-name length — only the row source differs.
const catMatrixView = ref<'category' | 'position'>('category')

const activeMatrixRows = computed(() => {
  const lv = landscapeView.value
  if (!lv) return []
  return catMatrixView.value === 'category' ? lv.categoryRows : lv.positionRows
})

const activeMatrixEdge = computed(() =>
  catMatrixView.value === 'category' ? catEdgeExposed.value : catPositionEdgeExposed.value,
)

// ── HOT / COLD (last 3 weeks) ─────────────────────────────────────────────────

const hotCold = computed(() => {
  const rows = rankings.value?.rows ?? []
  const meta = rows.map((r) => ({ teamKey: r.teamKey, teamName: r.teamName, isMe: r.teamKey === activeMyTeamKey.value, teamLogo: r.teamLogo }))
  // Category leagues rank by net categories won; points leagues by points scored.
  return buildHotCold(trajectory.outcomes.value, meta, 3, isCategory.value ? 'cats' : 'points')
})

// ── "THE RACE" TRAJECTORY CHART ───────────────────────────────────────────────

const trajectoryView = computed(() => {
  const rows = rankings.value?.rows ?? []
  if (!rows.length) return null
  const meta = rows.map((r) => ({ teamKey: r.teamKey, teamName: r.teamName, isMe: r.teamKey === activeMyTeamKey.value, teamLogo: r.teamLogo }))
  return buildTrajectory(trajectory.outcomes.value, [], meta) // [] = no talent overlay; League shows just the standings race
})

// ── PLAYOFF ODDS ──────────────────────────────────────────────────────────────

const leagueTeamCount = computed(() => rankings.value?.rows.length ?? 0)

const oddsByKey = computed(() => new Map((playoffOdds.value?.results ?? []).map((r) => [r.teamKey, r])))

const playoffSpotsOverride = ref<number | null>(null)
const playoffSpots = computed(() =>
  playoffSpotsOverride.value ?? (trajectory.playoffSpots.value || Math.max(2, Math.round(leagueTeamCount.value / 2))),
)

const oddsTeams = computed<OddsTeam[]>(() => {
  const rows = rankings.value?.rows ?? []
  const pmeta = pointsTeamMeta.value
  return rows.map((r) => ({
    teamKey: r.teamKey,
    strength: r.strength,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    pointsFor: isCategory.value ? r.strength : (pmeta[r.teamKey]?.pointsFor ?? r.strength),
  }))
})

const playoffOdds = computed(() => {
  const sched = trajectory.remainingSchedule.value
  if (!oddsTeams.value.length || !sched.length || !playoffSpots.value) return null
  return simulatePlayoffOdds(oddsTeams.value, sched, { playoffSpots: playoffSpots.value, sims: 5000 })
})

// teamKey -> {name, logo, isMe} for rendering odds rows (from rankings).
const teamInfo = computed(() => {
  const m = new Map<string, { name: string; logo?: string; isMe: boolean }>()
  for (const r of rankings.value?.rows ?? []) m.set(r.teamKey, { name: r.teamName, logo: r.teamLogo, isMe: r.teamKey === activeMyTeamKey.value })
  return m
})

// Your remaining strength-of-schedule + its league rank (1 = easiest).
const sosRank = computed(() => {
  const sched = trajectory.remainingSchedule.value
  const rows = rankings.value?.rows ?? []
  if (!sched.length || !rows.length) return null
  const sOf = new Map(rows.map((r) => [r.teamKey, r.strength]))
  const opps = new Map<string, number[]>()
  for (const r of rows) opps.set(r.teamKey, [])
  for (const wk of sched) for (const [a, b] of wk.matchups) {
    opps.get(a)?.push(sOf.get(b) ?? 0)
    opps.get(b)?.push(sOf.get(a) ?? 0)
  }
  const avg = rows
    .map((r) => ({ k: r.teamKey, sos: (opps.get(r.teamKey) ?? []).reduce((x, y) => x + y, 0) / Math.max(1, (opps.get(r.teamKey) ?? []).length), n: (opps.get(r.teamKey) ?? []).length }))
    .filter((x) => x.n > 0)
    .sort((x, y) => x.sos - y.sos) // ascending: easiest first
  const myIdx = avg.findIndex((x) => x.k === activeMyTeamKey.value)
  if (myIdx < 0) return null
  return { rank: myIdx + 1, total: avg.length } // 1 = easiest remaining slate
})

// ── YOUR PLAYOFF PATH (leverage + who you're racing) ───────────────────────────

// Regular-season weeks YOU have left, taken from the actual undecided schedule (not
// end_week math, which on Yahoo overcounts by including playoff weeks). This keeps the
// headline consistent with the projected record, since the sim only plays these weeks.
const myRemainingWeeks = computed(() => {
  const myKey = activeMyTeamKey.value
  if (!myKey) return 0
  let n = 0
  for (const wk of trajectory.remainingSchedule.value) {
    if (wk.matchups.some(([a, b]) => a === myKey || b === myKey)) n++
  }
  return n
})

const myOdds = computed(() => {
  const k = activeMyTeamKey.value
  return k ? (oddsByKey.value.get(k) ?? null) : null
})

// Per-game playoff-odds swing for each of YOUR remaining matchups, sorted by leverage.
// Skipped once your fate is sealed (>99% / <1%) — the sim would be wasted work.
const leverage = computed<GameLeverage[]>(() => {
  const sched = trajectory.remainingSchedule.value
  const myKey = activeMyTeamKey.value
  if (!oddsTeams.value.length || !sched.length || !playoffSpots.value || !myKey) return []
  const od = oddsByKey.value.get(myKey)
  if (od && (od.playoffPct > 0.995 || od.playoffPct < 0.005)) return []
  return buildLeverage(oddsTeams.value, sched, { playoffSpots: playoffSpots.value, sims: 1500 }, myKey)
})

const topGame = computed(() => leverage.value[0] ?? null)

const pathVerdict = computed<{ label: string; tone: 'good' | 'warn' | 'bad' } | null>(() => {
  const p = myOdds.value?.playoffPct
  if (p == null) return null
  if (p >= 0.99) return { label: 'Effectively clinched', tone: 'good' }
  if (p >= 0.7) return { label: 'In control', tone: 'good' }
  if (p >= 0.4) return { label: 'On the bubble', tone: 'warn' }
  if (p >= 0.1) return { label: 'Need a run', tone: 'warn' }
  return { label: 'Long shot', tone: 'bad' }
})

// The genuine bubble: teams whose spot is still live (odds in a contested band),
// not the ones near your own number. Picked by how much of a toss-up they are, then
// shown in odds order. These are the teams actually fighting for the cut line.
const racingRivals = computed(() => {
  const myKey = activeMyTeamKey.value
  const results = playoffOdds.value?.results ?? []
  return results
    .filter((r) => r.teamKey !== myKey && r.playoffPct >= 0.15 && r.playoffPct <= 0.85)
    .sort((a, b) => Math.abs(a.playoffPct - 0.5) - Math.abs(b.playoffPct - 0.5)) // most uncertain first
    .slice(0, 3)
    .sort((a, b) => b.playoffPct - a.playoffPct) // display in odds order
    .map((r) => ({
      teamKey: r.teamKey,
      name: teamInfo.value.get(r.teamKey)?.name ?? 'Team',
      logo: teamInfo.value.get(r.teamKey)?.logo,
      playoffPct: r.playoffPct,
      projWins: r.projWins,
      projLosses: r.projLosses,
    }))
})

// When you've effectively clinched it's not your race — relabel to neutral league context.
const racingLabel = computed(() =>
  (myOdds.value?.playoffPct ?? 0) >= 0.99
    ? 'The bubble — fighting for the final spots'
    : `Who you're racing for the ${playoffSpots.value} spots`,
)

// These odds only render mid-season (the sim needs a remaining schedule), so a sim
// result of exactly 0 isn't "mathematically eliminated" — it just never happened in
// 5000 tries. Floor it to "<1%" rather than a hard "0%" that reads as "give up".
const fmtPct = (p: number) => (p > 0.995 ? '>99%' : p < 0.005 ? '<1%' : Math.round(p * 100) + '%')
const oddsColor = (p: number) => (p >= 0.5 ? 'text-primary' : p > 0 ? 'text-[#e69a4a]' : 'text-dark-textMuted')
const oppName = (k: string) => teamInfo.value.get(k)?.name ?? 'Opponent'
const teamLogoOf = (k: string) => teamInfo.value.get(k)?.logo
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-6">
      <h1 class="font-display text-2xl font-bold text-dark-text">League</h1>
      <p class="font-mono text-xs text-dark-textMuted">How you stack up — and where to act.</p>
    </header>

    <!-- ── LOADING / EMPTY STATES ─────────────────────────────────────────── -->
    <div v-if="loading && !rankings" class="py-16 text-center text-dark-textMuted">Sizing up the league…</div>
    <div v-else-if="!loading && !rankings" class="py-16 text-center text-dark-textMuted">Couldn't assemble the league yet. Try a refresh.</div>

    <template v-else>
    <!-- ── STANDINGS (shared; includes playoff odds when schedule is available) ── -->
    <section class="mb-8">
      <!-- Section header row -->
      <div class="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 class="font-display text-lg font-bold text-dark-text">Standings</h2>
          <template v-if="playoffOdds">
            <p class="font-mono text-xs text-dark-textMuted">
              rest-of-season playoff odds · top {{ playoffSpots }} make the bracket
            </p>
          </template>
        </div>
        <!-- Playoff spots stepper (only when odds are available) -->
        <div v-if="playoffOdds" class="flex shrink-0 items-center gap-2 rounded-lg border border-dark-border px-2 py-1 font-mono text-xs text-dark-textMuted">
          <span class="text-[10px] uppercase tracking-wider text-dark-textMuted font-mono">Playoff spots</span>
          <button
            class="w-5 text-center leading-none hover:text-dark-text transition-colors"
            :disabled="playoffSpots <= 1"
            @click="playoffSpotsOverride = Math.max(1, playoffSpots - 1)"
          >−</button>
          <span class="w-5 text-center text-dark-text">{{ playoffSpots }}</span>
          <button
            class="w-5 text-center leading-none hover:text-dark-text transition-colors"
            :disabled="playoffSpots >= leagueTeamCount"
            @click="playoffSpotsOverride = Math.min(leagueTeamCount, playoffSpots + 1)"
          >+</button>
        </div>
      </div>

      <div v-if="!standings.length" class="py-10 text-center font-mono text-xs text-dark-textMuted">
        Loading standings…
      </div>
      <div v-else class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <!-- Column header row -->
        <div class="px-4 py-1 flex items-center gap-3 border-b border-dark-border/40">
          <!-- spacer: position number -->
          <span class="w-6 shrink-0" />
          <!-- spacer: logo -->
          <span class="h-8 w-8 shrink-0" />
          <!-- spacer: name column -->
          <span class="min-w-0 flex-1" />
          <!-- label over text cluster -->
          <span class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">
            <template v-if="playoffOdds">REC · TALENT · PROJ</template>
            <template v-else>REC · TALENT</template>
          </span>
          <!-- label over bar/% column -->
          <template v-if="playoffOdds">
            <span class="shrink-0 w-28 text-right font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">PLAYOFF ODDS</span>
          </template>
          <template v-else>
            <span class="hidden sm:block shrink-0 w-36 text-right font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">ROSTER TALENT</span>
          </template>
        </div>
        <div
          v-for="(r, i) in standings"
          :key="r.teamKey"
          class="px-4 py-2.5 flex items-center gap-3"
          :style="r.isMe ? { backgroundColor: primaryTint(6) } : {}"
        >
          <!-- Position -->
          <span class="w-6 shrink-0 text-center font-mono text-sm text-dark-textMuted">{{ i + 1 }}</span>

          <!-- Logo -->
          <img
            v-if="r.teamLogo"
            :src="r.teamLogo"
            alt=""
            class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover"
            @error="($event.target as HTMLElement).style.display = 'none'"
          />
          <span v-else class="h-8 w-8 shrink-0 rounded-full bg-dark-border" />

          <!-- Name + YOU badge + stakes -->
          <span class="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
            <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
            <span
              v-if="r.isMe"
              class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary"
              :style="{ backgroundColor: primaryTint(16) }"
            >you</span>
            <span
              v-if="r.stakes === 'clinched'"
              class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary"
            >clinched</span>
            <span
              v-else-if="r.stakes === 'eliminated'"
              class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted"
            >eliminated</span>
            <span
              v-else-if="r.stakes === 'bubble'"
              class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#e69a4a]"
            >bubble</span>
          </span>

          <!-- Text cluster: record · talent rank + luck arrow · proj record (when odds) -->
          <span class="shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-dark-textMuted">
            {{ r.wins }}-{{ r.losses }}{{ r.ties ? '-' + r.ties : '' }}
            <span class="hidden sm:inline text-dark-border/60">·</span>
            <span class="hidden sm:inline">talent {{ ord(r.talentRank) }}</span>
            <span v-if="r.luck === 'sleeper'" class="hidden sm:inline text-primary">▲</span>
            <span v-else-if="r.luck === 'pretender'" class="hidden sm:inline text-[#e69a4a]">▼</span>
            <template v-if="oddsByKey.get(r.teamKey) as any">
              <span class="hidden sm:inline text-dark-border/60">·</span>
              <span class="hidden sm:inline font-mono text-[11px] text-dark-textMuted">
                proj {{ Math.round((oddsByKey.get(r.teamKey)!).projWins) }}-{{ Math.round((oddsByKey.get(r.teamKey)!).projLosses) }}{{ (oddsByKey.get(r.teamKey)!).projTies ? '-' + Math.round((oddsByKey.get(r.teamKey)!).projTies) : '' }}
              </span>
            </template>
          </span>

          <!-- Right anchor: playoff % bar when odds exist, talent bar as fallback -->
          <template v-if="oddsByKey.get(r.teamKey) as any">
            <!-- Playoff % bar + label -->
            <div class="shrink-0 flex items-center gap-2 w-28">
              <div class="flex-1 relative h-1.5 overflow-hidden rounded-full" :style="{ backgroundColor: 'rgba(255,255,255,0.08)' }">
                <div
                  class="absolute inset-y-0 left-0 rounded-full transition-all"
                  :style="{
                    width: ((oddsByKey.get(r.teamKey)!).playoffPct * 100) + '%',
                    backgroundColor: (oddsByKey.get(r.teamKey)!).playoffPct >= 0.5
                      ? 'var(--color-primary, #C6FF3A)'
                      : (oddsByKey.get(r.teamKey)!).playoffPct > 0
                        ? '#e69a4a'
                        : 'rgba(255,255,255,0.15)'
                  }"
                />
              </div>
              <span class="w-9 text-right font-mono text-[11px]"
                :class="(oddsByKey.get(r.teamKey)!).playoffPct >= 0.5 ? 'text-primary' : (oddsByKey.get(r.teamKey)!).playoffPct > 0 ? 'text-[#e69a4a]' : 'text-dark-textMuted'"
              >
                {{ fmtPct((oddsByKey.get(r.teamKey)!).playoffPct) }}
              </span>
            </div>
          </template>
          <template v-else>
            <!-- Talent bar + value fallback (no schedule) -->
            <div class="hidden sm:flex w-36 shrink-0 flex-col gap-0.5">
              <div class="relative h-1.5 overflow-hidden rounded-full" :style="{ backgroundColor: 'rgba(255,255,255,0.08)' }">
                <div
                  class="absolute inset-y-0 left-0 rounded-full"
                  :style="{ width: barPct(r.strength) + '%', backgroundColor: 'var(--color-primary, #C6FF3A)' }"
                />
              </div>
              <div class="text-right font-mono text-[9px] text-dark-textMuted">
                <template v-if="isCategory">{{ r.strength.toFixed(1) }} cats/wk</template>
                <template v-else>{{ Math.round(r.strength / 10) * 10 }} pts/wk</template>
              </div>
            </div>
          </template>
        </div>
      </div>
      <p class="mt-2 font-mono text-[10px] text-dark-textMuted">
        <template v-if="playoffOdds">proj = projected final record · % = playoff odds (rest-of-season sim)</template>
        <template v-else>bar = roster talent · short bar near top = riding luck · long bar near bottom = due to climb</template>
      </p>

      <!-- Hot / Cold callout (last 3 weeks) -->
      <div
        v-if="hotCold.hottest && hotCold.coldest"
        class="mt-3 rounded-xl border border-dark-border bg-dark-card px-4 py-2.5 font-mono text-[11px] space-y-1.5"
      >
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-primary">Hottest</span>
          <span class="shrink-0 text-dark-textMuted">last {{ hotCold.weeks }} wks</span>
          <img
            v-if="hotCold.hottest.teamLogo"
            :src="hotCold.hottest.teamLogo"
            alt=""
            class="h-4 w-4 shrink-0 rounded-full bg-dark-border object-cover"
            @error="($event.target as HTMLElement).style.display = 'none'"
          />
          <span class="min-w-0 truncate text-dark-text">{{ hotCold.hottest.teamName }}</span>
          <span v-if="hotCold.hottest.isMe" class="shrink-0 text-primary text-[9px] uppercase">YOU</span>
          <span class="ml-auto shrink-0 text-dark-textMuted">
            <template v-if="hotCold.basis === 'points'">{{ Math.round(hotCold.hottest.points).toLocaleString() }} pts</template>
            <template v-else-if="hotCold.basis === 'cats'">{{ hotCold.hottest.catWins }}-{{ hotCold.hottest.catLosses }}{{ hotCold.hottest.catTies ? '-' + hotCold.hottest.catTies : '' }} cats</template>
            <template v-else>{{ hotCold.hottest.wins }}-{{ hotCold.hottest.losses }}{{ hotCold.hottest.ties ? '-' + hotCold.hottest.ties : '' }}</template>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-[#e69a4a]">Coldest</span>
          <span class="shrink-0 text-dark-textMuted">last {{ hotCold.weeks }} wks</span>
          <img
            v-if="hotCold.coldest.teamLogo"
            :src="hotCold.coldest.teamLogo"
            alt=""
            class="h-4 w-4 shrink-0 rounded-full bg-dark-border object-cover"
            @error="($event.target as HTMLElement).style.display = 'none'"
          />
          <span class="min-w-0 truncate text-dark-text">{{ hotCold.coldest.teamName }}</span>
          <span v-if="hotCold.coldest.isMe" class="shrink-0 text-[#e69a4a] text-[9px] uppercase">YOU</span>
          <span class="ml-auto shrink-0 text-dark-textMuted">
            <template v-if="hotCold.basis === 'points'">{{ Math.round(hotCold.coldest.points).toLocaleString() }} pts</template>
            <template v-else-if="hotCold.basis === 'cats'">{{ hotCold.coldest.catWins }}-{{ hotCold.coldest.catLosses }}{{ hotCold.coldest.catTies ? '-' + hotCold.coldest.catTies : '' }} cats</template>
            <template v-else>{{ hotCold.coldest.wins }}-{{ hotCold.coldest.losses }}{{ hotCold.coldest.ties ? '-' + hotCold.coldest.ties : '' }}</template>
          </span>
        </div>
      </div>
    </section>

    <!-- ── YOUR PLAYOFF PATH (leverage + who you're racing) ──────────────────── -->
    <section v-if="playoffOdds && myOdds" class="mb-8">
      <div class="mb-2 flex items-baseline justify-between gap-3">
        <h2 class="font-display text-lg font-bold text-dark-text">Your playoff path</h2>
        <span
          v-if="pathVerdict"
          class="font-mono text-xs"
          :class="pathVerdict.tone === 'good' ? 'text-primary' : pathVerdict.tone === 'warn' ? 'text-[#e69a4a]' : 'text-dark-textMuted'"
        >{{ pathVerdict.label }}</span>
      </div>
      <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <!-- Odds headline + projected finish -->
        <div class="px-4 py-3 flex items-center gap-4">
          <div class="shrink-0 text-center">
            <div class="font-display text-3xl font-bold leading-none" :class="oddsColor(myOdds.playoffPct)">{{ fmtPct(myOdds.playoffPct) }}</div>
            <div class="mt-1 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">playoff odds</div>
          </div>
          <div class="min-w-0 flex-1 font-mono text-[11px] leading-relaxed text-dark-textMuted">
            Projected to finish
            <span class="text-dark-text">{{ Math.round(myOdds.projWins) }}-{{ Math.round(myOdds.projLosses) }}{{ myOdds.projTies ? '-' + Math.round(myOdds.projTies) : '' }}</span>
            with <span class="text-dark-text">{{ myRemainingWeeks }} {{ myRemainingWeeks === 1 ? 'week' : 'weeks' }} left</span>.
            <template v-if="sosRank"> Your remaining slate is the <span class="text-dark-text">{{ ord(sosRank.rank) }}-easiest</span> of {{ sosRank.total }}.</template>
          </div>
        </div>

        <!-- The game that matters most -->
        <div v-if="topGame" class="px-4 py-3">
          <div class="mb-1 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">The game that matters most</div>
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2 font-mono text-[12px] text-dark-text">
              <span class="shrink-0 text-dark-textMuted">Wk {{ topGame.week }} vs</span>
              <img
                v-if="teamLogoOf(topGame.opponentKey)"
                :src="teamLogoOf(topGame.opponentKey)"
                alt=""
                class="h-4 w-4 shrink-0 rounded-full bg-dark-border object-cover"
                @error="($event.target as HTMLElement).style.display = 'none'"
              />
              <span class="truncate">{{ oppName(topGame.opponentKey) }}</span>
            </div>
            <div class="shrink-0 font-mono text-[11px]">
              <span class="text-primary">{{ fmtPct(topGame.oddsIfWin) }}</span>
              <span class="text-dark-textMuted"> win · </span>
              <span class="text-[#e69a4a]">{{ fmtPct(topGame.oddsIfLose) }}</span>
              <span class="text-dark-textMuted"> lose</span>
            </div>
          </div>
          <div class="mt-1 font-mono text-[10px] text-dark-textMuted">
            a <span class="text-dark-text">{{ Math.round(topGame.leverage * 100) }}-point</span> swing — your highest-leverage matchup left
          </div>
        </div>

        <!-- Who you're racing -->
        <div v-if="racingRivals.length" class="px-4 py-3">
          <div class="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">{{ racingLabel }}</div>
          <div class="space-y-1.5">
            <div v-for="rv in racingRivals" :key="rv.teamKey" class="flex items-center gap-2">
              <img
                v-if="rv.logo"
                :src="rv.logo"
                alt=""
                class="h-5 w-5 shrink-0 rounded-full bg-dark-border object-cover"
                @error="($event.target as HTMLElement).style.display = 'none'"
              />
              <span v-else class="h-5 w-5 shrink-0 rounded-full bg-dark-border" />
              <span class="min-w-0 flex-1 truncate font-mono text-[12px] text-dark-text">{{ rv.name }}</span>
              <span class="shrink-0 font-mono text-[10px] text-dark-textMuted">proj {{ Math.round(rv.projWins) }}-{{ Math.round(rv.projLosses) }}</span>
              <span class="shrink-0 w-9 text-right font-mono text-[11px]" :class="oddsColor(rv.playoffPct)">{{ fmtPct(rv.playoffPct) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── "THE RACE" standings line graph ───────────────────────────────────── -->
    <section v-if="trajectoryView && trajectoryView.weeks.length >= 2" class="mb-8">
      <h2 class="font-display text-lg font-bold text-dark-text">The race</h2>
      <p class="mb-3 font-mono text-xs text-dark-textMuted">
        Standings rank, week by week — rank 1 up top.
      </p>
      <div class="rounded-xl border border-dark-border bg-dark-card p-3">
        <PowerTrajectoryChart :trajectory="trajectoryView" />
      </div>
    </section>

    <!-- ── CATEGORY landscape (toggled: category matrix ⇄ roster positions) ─── -->
    <template v-if="isCategory">
      <section
        v-if="landscapeView && (landscapeView.categoryRows.length || landscapeView.positionRows.length)"
        class="mb-8"
      >
        <!-- Header + matrix toggle -->
        <div class="mb-1 flex items-center justify-between gap-3">
          <h2 class="font-display text-lg font-bold text-dark-text">Where you stack up</h2>
          <div class="flex shrink-0 items-center gap-0.5 rounded-lg border border-dark-border p-0.5 font-mono text-[10px]">
            <button
              class="rounded-md px-2.5 py-1 uppercase tracking-wider transition-colors"
              :class="catMatrixView === 'category' ? 'font-bold' : 'text-dark-textMuted hover:text-dark-text'"
              :style="catMatrixView === 'category' ? { backgroundColor: 'var(--color-primary, #C6FF3A)', color: '#10130a' } : {}"
              @click="catMatrixView = 'category'"
            >Categories</button>
            <button
              class="rounded-md px-2.5 py-1 uppercase tracking-wider transition-colors"
              :class="catMatrixView === 'position' ? 'font-bold' : 'text-dark-textMuted hover:text-dark-text'"
              :style="catMatrixView === 'position' ? { backgroundColor: 'var(--color-primary, #C6FF3A)', color: '#10130a' } : {}"
              @click="catMatrixView = 'position'"
            >Positions</button>
          </div>
        </div>
        <p class="mb-2 font-mono text-[10px] text-dark-textMuted">
          <template v-if="catMatrixView === 'category'">rank in each scoring category across the league · brighter = stronger · you're the ringed column</template>
          <template v-else>rank by best eligible player at each roster position · brighter = stronger · you're the ringed column</template>
        </p>

        <!-- Edge / exposed readout (swaps with the active view) -->
        <div
          v-if="activeMatrixEdge.edge.length || activeMatrixEdge.exposed.length"
          class="mb-3 rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] leading-snug space-y-0.5"
        >
          <div v-if="activeMatrixEdge.edge.length">
            <span class="text-primary">Your edge: </span><span class="text-dark-text">{{ activeMatrixEdge.edge.join(', ') }}</span>
          </div>
          <div v-if="activeMatrixEdge.exposed.length">
            <span class="text-[#e69a4a]">Exposed: </span><span class="text-dark-textMuted">{{ activeMatrixEdge.exposed.join(', ') }} — your upgrade targets</span>
          </div>
        </div>

        <!-- Unified transposed matrix: teams as columns (logos on top), metric as rows.
             Fixed-width columns keep numbers aligned regardless of team-name length. -->
        <div v-if="landscapeView && activeMatrixRows.length" class="rounded-xl border border-dark-border bg-dark-card overflow-x-auto">
          <!-- Header: team logos (YOU ringed + first) -->
          <div class="flex border-b border-dark-border/40">
            <div class="min-w-[3.5rem] shrink-0" />
            <div
              v-for="team in landscapeView.teams"
              :key="team.key"
              class="w-10 shrink-0 py-1.5 flex items-center justify-center"
              :title="team.name"
            >
              <img
                v-if="teamLogoOf(team.key)"
                :src="teamLogoOf(team.key)"
                :alt="team.name"
                class="h-[18px] w-[18px] rounded-full object-cover"
                :class="team.isMe ? 'ring-1 ring-primary ring-offset-[1px] ring-offset-dark-card' : 'opacity-70'"
                @error="($event.target as HTMLElement).style.display = 'none'"
              />
              <span
                v-else
                class="font-mono text-[7px] uppercase leading-none"
                :class="team.isMe ? 'text-primary font-bold' : 'text-dark-textMuted'"
              >
                {{ team.isMe ? 'YOU' : team.label }}
              </span>
            </div>
          </div>

          <!-- Rows: one per category / position -->
          <div
            v-for="row in activeMatrixRows"
            :key="row.key"
            class="flex items-center border-b border-dark-border/20 last:border-0"
          >
            <div class="min-w-[3.5rem] shrink-0 px-3 py-1.5 font-mono text-[10px] text-dark-textSecondary uppercase tracking-wider">
              {{ row.label }}
            </div>

            <div
              v-for="(rank, ti) in row.ranks"
              :key="ti"
              class="w-10 shrink-0 py-1.5 text-center font-mono text-[10px] text-dark-text leading-none"
              :style="{
                backgroundColor: rank == null
                  ? 'transparent'
                  : heatBg(landscapeView.numTeams <= 1 ? 0.5 : (landscapeView.numTeams - rank) / (landscapeView.numTeams - 1))
              }"
            >
              {{ rank ?? '' }}
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- ── POINTS landscape ───────────────────────────────────────────────── -->
    <template v-else>
      <!-- Position strength grid (points): YOU first, then teams by standing rank -->
      <section
        v-if="pointsPositional && pointsPositional.positions.length"
        class="mb-8"
      >
        <h2 class="mb-1 font-display text-lg font-bold text-dark-text">Position Strength</h2>
        <p class="mb-2 font-mono text-[10px] text-dark-textMuted">
          best startable player per position, ranked across the league · brighter = stronger
        </p>

        <!-- Edge / exposed readout for points positions -->
        <div
          v-if="pointsEdgeExposed.edge.length || pointsEdgeExposed.exposed.length"
          class="mb-3 rounded-lg border border-dark-border/50 bg-dark-card px-3 py-2 font-mono text-[11px] leading-snug space-y-0.5"
        >
          <div v-if="pointsEdgeExposed.edge.length">
            <span class="text-primary">Your edge: </span><span class="text-dark-text">{{ pointsEdgeExposed.edge.join(', ') }}</span>
          </div>
          <div v-if="pointsEdgeExposed.exposed.length">
            <span class="text-[#e69a4a]">Exposed: </span><span class="text-dark-textMuted">{{ pointsEdgeExposed.exposed.join(', ') }} — your upgrade targets</span>
          </div>
        </div>

        <div class="rounded-xl border border-dark-border bg-dark-card overflow-x-auto">
          <!-- Header: YOU first (logo+ring), then teams by standing rank (logos) -->
          <div class="flex border-b border-dark-border/40">
            <div class="min-w-[3.5rem] shrink-0" />
            <div
              v-for="tk in pointsOrderedTeamKeys"
              :key="tk"
              class="w-10 shrink-0 py-1.5 flex items-center justify-center"
              :title="pointsTeamMeta[tk]?.name ?? tk"
            >
              <!-- Logo (circular, ~18px), ring highlight for YOU -->
              <img
                v-if="pointsTeamMeta[tk]?.logo"
                :src="pointsTeamMeta[tk].logo"
                :alt="pointsTeamMeta[tk]?.name ?? tk"
                class="h-[18px] w-[18px] rounded-full object-cover"
                :class="tk === activeMyTeamKey
                  ? 'ring-1 ring-primary ring-offset-[1px] ring-offset-dark-card'
                  : 'opacity-70'"
                @error="($event.target as HTMLElement).style.display = 'none'"
              />
              <!-- Fallback: initials or YOU label -->
              <span
                v-else
                class="font-mono text-[7px] uppercase leading-none"
                :class="tk === activeMyTeamKey ? 'text-primary font-bold' : 'text-dark-textMuted'"
              >
                {{ tk === activeMyTeamKey ? 'YOU' : (pointsTeamMeta[tk]?.name ?? tk).slice(0, 3) }}
              </span>
            </div>
          </div>

          <!-- Position rows -->
          <div
            v-for="posRow in pointsPositional.positions"
            :key="posRow.position"
            class="flex items-center border-b border-dark-border/20 last:border-0"
          >
            <div class="min-w-[3.5rem] shrink-0 px-3 py-1.5 font-mono text-[10px] text-dark-textSecondary uppercase tracking-wider">
              {{ posRow.position }}
            </div>
            <div
              v-for="cell in posRow.cells"
              :key="cell.teamKey"
              class="w-10 shrink-0 py-1.5 text-center font-mono text-[10px] text-dark-text leading-none"
              :style="{
                backgroundColor: cell.rank == null
                  ? 'transparent'
                  : heatBg(
                      (() => {
                        const tc = pointsOrderedTeamKeys.length
                        return tc <= 1 ? 0.5 : (tc - cell.rank) / (tc - 1)
                      })()
                    )
              }"
            >
              {{ cell.rank ?? '' }}
            </div>
          </div>
        </div>
      </section>
    </template>
    </template><!-- /v-else (rankings ready) -->
  </div>
</template>
