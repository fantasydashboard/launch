<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { useCategoryStrength } from '@/composables/useCategoryStrength'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { buildPowerRankings, type PowerTeamInput } from '@/league/powerRankings'
import { seasonStakes } from '@/myteam/seasonStakes'
import { buildTrajectory, type TalentSnapshot } from '@/league/powerTrajectory'
import { readTalentSnapshots, recordTalentSnapshot } from '@/league/talentSnapshots'
import PowerTrajectoryChart from '@/components/league/PowerTrajectoryChart.vue'

// Scoring dialect: 'points' = projected optimal-lineup points; 'category' = expected
// categories won per week (ECW) from projected roster output. Branches ONLY the strength
// source, team-meta source, and unit labels — everything downstream is shared.
const props = withDefaults(defineProps<{ scoring?: 'points' | 'category' }>(), { scoring: 'points' })
const isCategory = computed(() => props.scoring === 'category')

const leagueStore = useLeagueStore()
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const scoring = useLeagueScoring()
const trajectory = usePowerTrajectory()
const catStrength = useCategoryStrength()
const snapshots = ref<TalentSnapshot[]>([])

function loadAll() {
  snapshots.value = readTalentSnapshots(leagueStore.activeLeagueId ?? '')
  trajectory.load()
  if (isCategory.value) {
    catStrength.load()
    return
  }
  scoring.load()
  if (isEspn.value) espnPoints.load()
  else yahooLeague.load()
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const pool = computed<PointsPoolPlayer[]>(() =>
  (isEspn.value ? espnPoints.pool.value : yahooLeague.pool.value) as PointsPoolPlayer[],
)
const fgByKey = computed(() => (isEspn.value ? espnPoints.fgByKey.value : yahooLeague.fgByKey.value))
const rosterSlots = computed(() => (isEspn.value ? espnPoints.rosterSlots.value : yahooLeague.rosterSlots.value))
const loading = computed(() =>
  isCategory.value
    ? catStrength.loading.value
    : isEspn.value
      ? espnPoints.loading.value
      : yahooLeague.loading.value,
)
const myTeamKey = computed<string>(() => {
  if (isCategory.value) return catStrength.myTeamKey.value
  if (isEspn.value) return espnPoints.myTeamId.value ?? ''
  const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
  return me ? String(me.team_key) : ''
})

// Abandoned-team detection. Yahoo auto-renames an unowned team to the literal
// "Manager-less Team N" — a reliable signal that nobody's setting its lineup, so
// its paper talent won't be realized. (ESPN doesn't expose an equivalent cheaply.)
function detectManagerless(t: any): boolean {
  return /manager-?less/i.test(String(t?.name ?? ''))
}

// teamKey → {name, logo, wins, losses, ties, pointsFor, managerless} for both platforms.
interface Meta { name: string; logo: string; wins: number; losses: number; ties: number; pointsFor: number; managerless: boolean }
const teamMeta = computed<Record<string, Meta>>(() => {
  if (isEspn.value) {
    const names = espnPoints.teamNames.value
    const logos = espnPoints.teamLogos.value
    const recs = espnPoints.teamRecords.value
    const out: Record<string, Meta> = {}
    for (const k of Object.keys(names)) {
      const r = recs[k] ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0 }
      out[k] = { name: names[k] || 'Team', logo: logos[k] || '', wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor, managerless: false }
    }
    return out
  }
  const out: Record<string, Meta> = {}
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

// CATEGORY strength = expected categories won per week (ECW) from the projected roster
// output. Same Yahoo "Manager-less Team N" abandoned read as points; ESPN has no equivalent.
const categoryRankings = computed(() => {
  const strengths = catStrength.strengths.value
  if (!strengths.length || !myTeamKey.value) return null
  const meta = catStrength.teamMeta.value
  const inputs: PowerTeamInput[] = strengths.map((s) => {
    const m = meta[s.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0 }
    return {
      teamKey: s.teamKey,
      teamName: m.name,
      teamLogo: m.logo,
      strength: s.strength,
      wins: m.wins,
      losses: m.losses,
      ties: m.ties,
      managerless: isEspn.value ? false : /manager-?less/i.test(m.name),
    }
  })
  return buildPowerRankings(inputs)
})

// Roster STRENGTH per team = projected optimal-lineup points (points-league basis).
const pointsRankings = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  // Rank on a schedule-neutral weekly rate once we know weeks-left, so a late-season
  // two-start week can't inflate a roster's strength. Falls back to season totals
  // until weeks-left resolves (same order mid-season anyway).
  const wl = trajectory.weeksLeft.value
  const model = buildPointsTeam(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, rosterSlots.value, {
    basis: wl > 0 ? 'perWeek' : 'total',
    weeksLeft: wl,
  })
  const meta = teamMeta.value
  const inputs: PowerTeamInput[] = model.standings.map((s) => {
    const m = meta[s.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0, pointsFor: 0, managerless: false }
    return { teamKey: s.teamKey, teamName: m.name, teamLogo: m.logo, strength: s.startingPoints, wins: m.wins, losses: m.losses, ties: m.ties, pointsFor: m.pointsFor, managerless: m.managerless }
  })
  return buildPowerRankings(inputs)
})

const rankings = computed(() => (isCategory.value ? categoryRankings.value : pointsRankings.value))

// Number of scored categories — gives "X.X cats/wk" its denominator context.
const catCount = computed(() => catStrength.catCount.value)

// Capture this week's talent (power) ranks once the board is ready, so the dashed
// talent line accrues week over week. Overwrites the current week as rosters change.
watch(
  () => [rankings.value, trajectory.currentWeek.value] as const,
  ([rk, week]) => {
    const leagueId = leagueStore.activeLeagueId
    if (!rk || !leagueId || !week) return
    const ranks: Record<string, number> = {}
    for (const r of rk.rows) ranks[r.teamKey] = r.strengthRank
    snapshots.value = recordTalentSnapshot(leagueId, week, ranks)
  },
  { immediate: true },
)

// The race over time: standings (solid) reconstructed from results + talent (dashed)
// from the accruing snapshots, teams ordered by current power rank to match the board.
const trajectoryView = computed(() => {
  if (!rankings.value) return null
  const meta = rankings.value.rows.map((r) => ({ teamKey: r.teamKey, teamName: r.teamName, isMe: r.teamKey === myTeamKey.value, teamLogo: r.teamLogo }))
  return buildTrajectory(trajectory.outcomes.value, snapshots.value, meta)
})

// Bars are MIN-anchored, not zero-anchored: rest-of-season projections cluster
// tightly (the bottom team still fields a full lineup), so a zero baseline makes
// every bar look maxed. Anchoring at the league min — with a 14% floor so last
// place stays visible — exposes the real separation between rosters.
const strengthBounds = computed(() => {
  const vals = rankings.value?.rows.map((r) => r.strength) ?? [1]
  return { min: Math.min(...vals), max: Math.max(...vals) }
})
const barPct = (s: number) => {
  const { min, max } = strengthBounds.value
  if (max <= min) return 100
  return 14 + 86 * ((s - min) / (max - min))
}

// The bar keeps ONE job — length = strength, so the leader pops. Abandoned teams
// get a hatched fill so "inactive" reads as intentional, not an unrendered bar.
const barStyle = (r: { strength: number; managerless: boolean }) => {
  const width = barPct(r.strength) + '%'
  if (r.managerless) {
    return {
      width,
      backgroundColor: 'rgba(148,163,184,0.18)',
      backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.6) 0, rgba(148,163,184,0.6) 3px, transparent 3px, transparent 6px)',
    }
  }
  return { width, backgroundColor: 'var(--color-primary, #C6FF3A)' }
}

// The FORECAST rides a small arrow beside the bar — green ▲ due to rise, amber ▼
// due to fall — matching the callout boxes and the green/amber luck text in the row.
const forecastArrow = (r: { luck: string; managerless: boolean }) => {
  if (r.managerless) return { glyph: '', color: '' }
  if (r.luck === 'sleeper') return { glyph: '▲', color: 'var(--color-primary, #C6FF3A)' }
  if (r.luck === 'pretender') return { glyph: '▼', color: '#e69a4a' }
  return { glyph: '', color: '' }
}
// Strength display. Points: round to the nearest 10 (the raw figure carries false precision).
// Category (ECW): a small ~0–N figure, so show one decimal — rounding to 10 would zero it out.
const fmtStrength = (n: number) => (isCategory.value ? n.toFixed(1) : String(Math.round(n / 10) * 10))
const perWeekBasis = computed(() => isCategory.value || trajectory.weeksLeft.value > 0)
// Category strength is intrinsically per-week (ECW); points strength is per-week only once
// weeks-left resolves. Leader unit + gap unit follow suit.
const leaderUnit = computed(() =>
  isCategory.value
    ? catCount.value ? `of ${catCount.value} cats/wk` : 'cats/wk'
    : trajectory.weeksLeft.value > 0 ? 'proj pts/wk' : 'proj pts',
)
const gapSuffix = computed(() =>
  isCategory.value ? ' cats vs #1' : trajectory.weeksLeft.value > 0 ? '/wk vs #1' : ' vs #1',
)
// Per-week strengths cluster tightly, so rounded absolutes manufacture fake ties
// (three teams reading "380" at ranks 6/7/8). Show the leader in full and everyone
// else as the gap behind #1 — a tight pack then reads honestly as "all ~30 back".
// Playoff stakes from STANDINGS position (record rank) vs the bracket cut — flags a
// team that's clinched, eliminated, or on the bubble. ESPN only (Yahoo doesn't expose
// the bracket size reliably, so playoffSpots stays 0 and no badges show).
const rowStakes = computed(() => {
  const out = new Map<string, { label: string; cls: string }>()
  const spots = trajectory.playoffSpots.value
  const wl = trajectory.weeksLeft.value
  const rows = rankings.value?.rows ?? []
  if (!spots || !wl || !rows.length) return out
  for (const r of rows) {
    const s = seasonStakes({ rank: r.recordRank, leagueSize: rows.length, weeksLeft: wl, playoffSpots: spots })
    if (s.coastKind === 'clinched') out.set(r.teamKey, { label: 'clinched', cls: 'text-primary' })
    else if (s.coastKind === 'eliminated') out.set(r.teamKey, { label: 'eliminated', cls: 'text-dark-textMuted' })
    else if (s.mode === 'must-win') out.set(r.teamKey, { label: 'bubble', cls: 'text-[#e69a4a]' })
  }
  return out
})

const leaderStrength = computed(() => {
  const rows = rankings.value?.rows ?? []
  return rows.length ? Math.max(...rows.map((r) => r.strength)) : 0
})
const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
const isMe = (key: string) => key === myTeamKey.value
const recordStr = (r: { wins: number; losses: number; ties: number }) => `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ''}`
const tierClass = (tier: string) =>
  tier === 'Contender' ? 'text-primary' : tier === 'Rebuilder' ? 'text-dark-textMuted' : 'text-dark-textSecondary'

// The theme's `primary` is a bare CSS var with no <alpha-value> slot, so Tailwind's
// `/opacity` modifier silently produces invalid CSS (dead bars, invisible YOU tint).
// Mix the var manually instead, which honours per-league theming.
const primaryTint = (pct: number) => `color-mix(in srgb, var(--color-primary, #C6FF3A) ${pct}%, transparent)`

// When only one callout type is present, it should span full width — no dead column.
const calloutCols = computed(() =>
  rankings.value && rankings.value.pretenders.length && rankings.value.sleepers.length ? 'sm:grid-cols-2' : 'sm:grid-cols-1',
)

// Methodology disclosure — explains the model and, honestly, its current limits.
const showHow = ref(false)
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 pt-6 pb-20">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">Power Rankings</h1>
      <p class="font-mono text-xs text-dark-textMuted">Who's actually good — ranked by roster talent, not record.</p>
      <button
        class="mt-2 font-mono text-[11px] text-dark-textSecondary transition-colors hover:text-dark-text"
        @click="showHow = !showHow"
      >
        {{ showHow ? '▾' : '▸' }} How these rankings work
      </button>
    </header>

    <!-- Methodology — what the rank is, and (honestly) what it doesn't do yet. -->
    <div v-if="showHow" class="mb-5 space-y-3 rounded-xl border border-dark-border bg-dark-card p-4 font-mono text-[11px] leading-relaxed text-dark-textMuted">
      <div>
        <p class="mb-1 text-[10px] uppercase tracking-widest text-dark-textSecondary">The rank</p>
        <template v-if="isCategory">
          <p>Teams are ranked by <span class="text-dark-text">roster talent</span>, not record. We take every rostered player's <span class="text-dark-text">rest-of-season projection</span>, total each team's output in <span class="text-dark-text">your league's categories</span>, and rank the league category by category. A team's strength is its <span class="text-dark-text">expected categories won per week</span> — how many of the league's categories<template v-if="catCount"> ({{ catCount }} of them)</template> its roster should win against an average opponent. Higher means a better roster.</p>
          <p class="mt-1">The leader shows its full rate (categories won per week); every other team shows how many <span class="text-dark-text">fewer</span> it'd win — so a tight cluster means a close field.</p>
        </template>
        <template v-else>
          <p>Teams are ranked by <span class="text-dark-text">roster talent</span>, not record. We take every rostered player's <span class="text-dark-text">rest-of-season projection</span>, score it by <span class="text-dark-text">your league's exact settings</span>, and slot each team into its best legal lineup. The combined projection of those starters is the team's strength — higher means a better roster.</p>
          <p class="mt-1">Strength is measured as a <span class="text-dark-text">per-week rate</span>, so late in the season a favorable two-start week doesn't inflate a roster past its true talent.</p>
        </template>
      </div>
      <div>
        <p class="mb-1 text-[10px] uppercase tracking-widest text-dark-textSecondary">Where luck comes in</p>
        <p>Your win-loss record isn't part of the rank. It's used only to spot luck: when a team's talent rank and its standings rank disagree, that gap forecasts movement — a record running ahead of the roster is <span class="text-[#e69a4a]">due to fall</span>, a roster the standings haven't caught up to is <span class="text-primary">due to rise</span>.</p>
      </div>
      <div>
        <p class="mb-1 text-[10px] uppercase tracking-widest text-dark-textSecondary">Tiers &amp; abandoned teams</p>
        <p>Contender / Bubble / Rebuilder come from where a roster's talent lands — top third, middle, bottom third. A team with no manager is flagged <span class="text-dark-text">abandoned</span> and held out of the due-to-rise list: the talent's there, but nobody's setting the lineup, so it won't be realized.</p>
      </div>
      <div>
        <p class="mb-1 text-[10px] uppercase tracking-widest text-[#e69a4a]">What it doesn't account for yet</p>
        <ul class="list-disc space-y-1 pl-4">
          <li>It doesn't weight <span class="text-dark-text">playoff stakes</span> — a team that's eliminated can still rank high on pure roster talent even when it no longer matters. Playoff-aware context is coming.</li>
          <li>Rise / fall forecasts assume there are weeks left to play out; near the end of the season there's less room for a team to regress to its talent.</li>
        </ul>
      </div>
    </div>

    <div v-if="loading && !rankings" class="py-16 text-center text-dark-textMuted">Sizing up the league…</div>
    <div v-else-if="!rankings" class="py-16 text-center text-dark-textMuted">Couldn't assemble the league yet. Try a refresh.</div>

    <template v-else>
      <!-- The triage shortlist — who to act on, and the move. -->
      <div v-if="rankings.pretenders.length || rankings.sleepers.length" class="mb-5 grid items-start gap-3" :class="calloutCols">
        <div v-if="rankings.pretenders.length" class="rounded-xl border border-[#e69a4a]/30 bg-dark-card p-4">
          <p class="font-mono text-[10px] uppercase tracking-widest text-[#e69a4a]">▼ Record due to fall</p>
          <p class="mb-2 font-mono text-[9px] text-dark-textMuted">record's outrunning the roster — expect their record to slide back</p>
          <div v-for="r in rankings.pretenders.slice(0, 3)" :key="r.teamKey" class="border-t border-dark-border/40 py-2 first:border-0">
            <p class="truncate text-sm text-dark-text">{{ r.teamName }}</p>
            <p class="font-mono text-[11px] text-dark-textMuted">
              {{ recordStr(r) }} record, but only <span class="text-[#e69a4a]">{{ ord(r.strengthRank) }} in talent</span> ({{ Math.abs(r.luckDelta) }} spots of luck)
            </p>
          </div>
        </div>
        <div v-if="rankings.sleepers.length" class="rounded-xl border bg-dark-card p-4" :style="{ borderColor: primaryTint(35) }">
          <p class="font-mono text-[10px] uppercase tracking-widest text-primary">▲ Record due to rise</p>
          <p class="mb-2 font-mono text-[9px] text-dark-textMuted">roster the standings haven't caught up to — expect their record to climb</p>
          <div v-for="r in rankings.sleepers.slice(0, 3)" :key="r.teamKey" class="border-t border-dark-border/40 py-2 first:border-0">
            <p class="truncate text-sm text-dark-text">{{ r.teamName }}</p>
            <p class="font-mono text-[11px] text-dark-textMuted">
              {{ recordStr(r) }} record, but <span class="text-primary">{{ ord(r.strengthRank) }} in talent</span> ({{ Math.abs(r.luckDelta) }} spots unlucky)
            </p>
          </div>
        </div>
      </div>

      <!-- The board -->
      <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <div v-for="r in rankings.rows" :key="r.teamKey" class="px-4 py-3" :style="isMe(r.teamKey) ? { backgroundColor: primaryTint(6) } : {}">
          <div class="flex items-center gap-3">
            <span class="w-6 shrink-0 text-center font-mono text-sm font-bold text-dark-textMuted">{{ r.strengthRank }}</span>
            <img v-if="r.teamLogo" :src="r.teamLogo" alt="" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="h-8 w-8 shrink-0 rounded-full bg-dark-border" />
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
                <span v-if="isMe(r.teamKey)" class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary" :style="{ backgroundColor: primaryTint(16) }">you</span>
                <span v-if="r.managerless" class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">abandoned</span>
                <span v-else class="shrink-0 font-mono text-[9px] uppercase tracking-wider" :class="tierClass(r.tier)">{{ r.tier }}</span>
                <span v-if="rowStakes.get(r.teamKey)" class="shrink-0 font-mono text-[9px] uppercase tracking-wider" :class="rowStakes.get(r.teamKey)?.cls">· {{ rowStakes.get(r.teamKey)?.label }}</span>
              </span>
              <span class="flex items-center gap-2 font-mono text-[11px] text-dark-textMuted">
                {{ recordStr(r) }}
                <span v-if="r.managerless" class="text-dark-textMuted">· no manager — talent stranded</span>
                <span v-else-if="r.luck === 'pretender'" class="text-[#e69a4a]">· lucky (record {{ Math.abs(r.luckDelta) }} ahead of talent)</span>
                <span v-else-if="r.luck === 'sleeper'" class="text-primary">· unlucky (talent {{ Math.abs(r.luckDelta) }} ahead of record)</span>
              </span>
            </span>
            <!-- Strength bar (length = strength) + forecast arrow (rise/fall) -->
            <div class="hidden w-32 shrink-0 sm:block">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 shrink-0 text-center font-mono text-[10px] leading-none" :style="{ color: forecastArrow(r).color }" :title="r.luck === 'sleeper' ? 'Due to rise' : r.luck === 'pretender' ? 'Due to fall' : ''">{{ forecastArrow(r).glyph }}</span>
                <div class="relative h-2 flex-1 overflow-hidden rounded-full" :style="{ backgroundColor: 'rgba(255,255,255,0.08)' }">
                  <div class="absolute inset-y-0 left-0 rounded-full" :style="barStyle(r)" />
                </div>
              </div>
              <div class="mt-0.5 text-right font-mono text-[9px] text-dark-textMuted" :title="`${fmtStrength(r.strength)} ${leaderUnit}`">
                <template v-if="r.strengthRank === 1">{{ fmtStrength(r.strength) }} {{ leaderUnit }}</template>
                <template v-else>−{{ fmtStrength(leaderStrength - r.strength) }}{{ gapSuffix }}</template>
              </div>
            </div>
          </div>
          <p class="mt-1.5 pl-9 font-mono text-[11px] leading-snug text-dark-textMuted">{{ r.blurb }}</p>
        </div>
      </div>

      <p class="mt-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
        rank = roster strength
        ({{ isCategory ? 'expected categories won per week' : `projected optimal-lineup points${perWeekBasis ? ' per week' : ''}` }})
        · leader shown in full, the rest as their gap behind #1 · the standings can lie — a lucky team regresses, an unlucky one climbs
      </p>
      <p class="mt-1.5 font-mono text-[10px] leading-relaxed text-dark-textMuted">
        bar length = talent (stable) · the arrow forecasts their <span class="text-dark-textSecondary">record</span>: <span class="text-primary">▲ due to rise</span> · <span class="text-[#e69a4a]">▼ due to fall</span> · hatched bar = abandoned
      </p>

      <!-- The race over time -->
      <section v-if="trajectoryView && trajectoryView.weeks.length >= 2" class="mt-8">
        <h2 class="font-display text-lg font-bold text-dark-text">The race</h2>
        <p class="mb-3 font-mono text-xs text-dark-textMuted">
          Standings rank, week by week. Rank 1 is up top — a line climbing means a team's been heating up.
        </p>
        <div class="rounded-xl border border-dark-border bg-dark-card p-3">
          <PowerTrajectoryChart :trajectory="trajectoryView" />
          <p class="px-1 pt-2 font-mono text-[10px] leading-relaxed text-dark-textMuted">
            Logos mark where each team sits now · your line is <span class="text-[#5ec8e6]">cyan</span> · hover a line to isolate it.
            <template v-if="trajectoryView.hasTalentHistory"> The <span class="text-[#5ec8e6]">dashed</span> line is your talent (power) rank — where the roster says you should sit; the gap is your luck.</template>
            <template v-else> Your <span class="text-[#5ec8e6]">talent</span> line starts charting from this week and fills in as the season goes.</template>
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
