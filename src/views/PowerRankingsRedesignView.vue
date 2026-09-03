<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { buildAllPlay, buildAllPlayForm, formatAllPlay } from '@/league/allPlay'
import { buildStrengthOfSchedule } from '@/league/strengthOfSchedule'
import { buildSituations, type SituationInput } from '@/league/situations'
import { useCategoryStrength } from '@/composables/useCategoryStrength'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { usePointsValue } from '@/composables/usePointsValue'
import { buildPowerRankings, RESUME_ALLPLAY_WEIGHT, type PowerTeamInput, type PowerRow } from '@/league/powerRankings'
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
// isEspn is still needed by the category-strength managerless detection below (ESPN
// has no equivalent "unowned team" signal, unlike Yahoo's "Manager-less Team N" name).
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const source = useActivePointsSource()
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
  source.load()
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const pool = computed<PointsPoolPlayer[]>(() => source.pool.value as PointsPoolPlayer[])
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const loading = computed(() => (isCategory.value ? catStrength.loading.value : source.loading.value))
const myTeamKey = computed<string>(() => (isCategory.value ? catStrength.myTeamKey.value : source.myTeamKey.value))

// Precomputed player value (baseball from FG, football from Sleeper) — the points engine's input.
const season = computed(() => '') // useFootballProjections falls back to Sleeper NFL state season
const { valueByKey } = usePointsValue({ pool, fgByKey, sport: computed(() => leagueStore.activeSport), season })

// Abandoned-team detection. Yahoo auto-renames an unowned team to the literal
// "Manager-less Team N" — a reliable signal that nobody's setting its lineup, so
// its paper talent won't be realized. (ESPN doesn't expose an equivalent cheaply.)
function detectManagerless(t: any): boolean {
  return /manager-?less/i.test(String(t?.name ?? ''))
}

// teamKey → {name, logo, wins, losses, ties, pointsFor, managerless} for all platforms.
interface Meta { name: string; logo: string; wins: number; losses: number; ties: number; pointsFor: number; managerless: boolean }
const teamMeta = computed<Record<string, Meta>>(() => {
  const names = source.teamNames.value
  const logos = source.teamLogos.value
  const stats = source.teamMeta.value
  const out: Record<string, Meta> = {}
  for (const k of Object.keys(names)) {
    const s = stats[k] ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0 }
    out[k] = {
      name: names[k] || 'Team',
      logo: logos[k] || '',
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      pointsFor: s.pointsFor,
      managerless: isEspn.value ? false : detectManagerless({ name: names[k] }),
    }
  }
  return out
})

/*
 * All-play, computed BEFORE the rankings because the rankings now consume it. Sourcing the
 * team list from the rankings (as this used to) would be circular once résumé is part of
 * the board — so it comes from the league's own team list instead.
 *
 * Passed through only when the season is long enough to read. An absent signal has to
 * contribute nothing rather than a zero: the résumé rank falls back to the standings, which
 * is what a two-week-old season honestly supports.
 */
const allPlayKeys = computed(() => {
  const cat = Object.keys(catStrength.teamMeta.value ?? {})
  return isCategory.value && cat.length ? cat : Object.keys(teamMeta.value)
})
const allPlayPctFor = (teamKey: string): number | undefined =>
  allPlay.value.weeksCounted > 0 ? allPlay.value.byTeam.get(teamKey)?.pct : undefined

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
      allPlayPct: allPlayPctFor(s.teamKey),
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
  const model = buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, {
    basis: wl > 0 ? 'perWeek' : 'total',
    weeksLeft: wl,
  })
  const meta = teamMeta.value
  const inputs: PowerTeamInput[] = model.standings.map((s) => {
    const m = meta[s.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0, pointsFor: 0, managerless: false }
    return { teamKey: s.teamKey, teamName: m.name, teamLogo: m.logo, strength: s.startingPoints, wins: m.wins, losses: m.losses, ties: m.ties, pointsFor: m.pointsFor, managerless: m.managerless, allPlayPct: allPlayPctFor(s.teamKey) }
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
/* The GAP gets its own formatter. Rounding a gap to the nearest 10 — the treatment that
   suits a ~150 absolute — turns a 4-point deficit into "−0", which tells the reader the
   second-best roster is level with the first, and buckets six genuinely different teams
   into an identical "−10". That is the same manufactured tie the absolute figure was
   switched away from, reintroduced one line below the comment explaining why. A gap is a
   small number and wants small-number precision. */
const fmtGap = (n: number) => {
  if (isCategory.value) return n.toFixed(1)
  const v = Math.max(0, n)
  return v < 10 ? v.toFixed(1) : String(Math.round(v))
}
const perWeekBasis = computed(() => isCategory.value || trajectory.weeksLeft.value > 0)
// Category strength is intrinsically per-week (ECW); points strength is per-week only once
// weeks-left resolves. Leader unit + gap unit follow suit.
const hasAbandoned = computed(() => (rankings.value?.rows ?? []).some((r) => r.managerless))

/* All-play: how many teams you would have beaten each week, not just the one the schedule
   handed you. Points-for answers "how much did they score", which is only half the
   question — a big week is worth nothing if the league went big with you. This answers the
   same question the standings ask, with the schedule luck taken out, so a 3-6 team sitting
   at 30-24 in all-play reads as what it is: a good team that keeps drawing the high scorer.
   Costs nothing to compute — the per-week points are already loaded for the chart. */
const allPlay = computed(() => buildAllPlay(trajectory.outcomes.value, allPlayKeys.value))
/*
 * Two ranks, one board. Talent asks who is best going forward; résumé asks who has actually
 * had the season. Blending them into a single number was the alternative and it fails twice:
 * the units do not match without normalising (a win rate against points-per-week), and
 * folding record into talent collapses the luck read, which is exactly the gap between these
 * two ranks. Keeping them separate is what makes the disagreement legible.
 */
type RankMode = 'talent' | 'resume'
const rankMode = ref<RankMode>('talent')
const rankOf = (r: PowerRow) => (rankMode.value === 'talent' ? r.strengthRank : r.resumeRank)
const otherRankOf = (r: PowerRow) => (rankMode.value === 'talent' ? r.resumeRank : r.strengthRank)
const orderedRows = computed(() => {
  const rows = rankings.value?.rows ?? []
  return rankMode.value === 'talent' ? rows : [...rows].sort((a, b) => a.resumeRank - b.resumeRank)
})

/*
 * luckDelta split into the two things it was hiding. They want different responses: a roster
 * scoring below its own talent has a problem it can act on, while a roster out-scoring the
 * league and still losing has a schedule it can only wait out. One number could not say
 * which, so the page said "unlucky" to both.
 *
 * A gap under two spots is inside the noise of a ten-team league and is not worth a sentence.
 */
const GAP_MIN = 2
const gapNotes = (r: PowerRow): { text: string; cls: string }[] => {
  if (!rankings.value?.resumeReadable || r.managerless) return []
  const out: { text: string; cls: string }[] = []
  if (Math.abs(r.executionDelta) >= GAP_MIN) {
    out.push(r.executionDelta < 0
      ? { text: `scoring ${Math.abs(r.executionDelta)} below the roster`, cls: 'text-[#e69a4a]' }
      : { text: `outscoring the roster by ${r.executionDelta}`, cls: 'text-primary' })
  }
  if (Math.abs(r.scheduleDelta) >= GAP_MIN) {
    out.push(r.scheduleDelta > 0
      ? { text: `schedule worth ${r.scheduleDelta} spots`, cls: 'text-[#e69a4a]' }
      : { text: `schedule cost ${Math.abs(r.scheduleDelta)} spots`, cls: 'text-primary' })
  }
  return out
}

const allPlayFor = (teamKey: string) => (allPlay.value.weeksCounted > 0 ? allPlay.value.byTeam.get(teamKey) ?? null : null)

/* Form = the same all-play question over the last three weeks, against their own season.
   Only shown once the window is a genuine subset of the season, otherwise every team reads
   exactly 0.0 — a whole column of nothing that looks like a finding. A move of less than a
   tenth is inside the noise of a three-week sample and is not worth a badge. */
/* Remaining opponent difficulty, from the module LeagueView already uses. Reusing it keeps
   one definition of "hard schedule" across the app instead of two that drift apart. */
const sos = computed(() => {
  const rows = rankings.value?.rows ?? []
  const sched = trajectory.remainingSchedule.value ?? []
  if (!rows.length || !sched.length) return new Map<string, number>()
  const built = buildStrengthOfSchedule(
    rows.map((r) => ({ teamKey: r.teamKey, teamName: r.teamName, strength: r.strength, standingRank: r.recordRank })),
    sched.map((w) => ({ matchups: w.matchups })),
  )
  return new Map(built.map((r) => [r.teamKey, r.sosRank]))
})

/* The cheat code: not a blended score, but the places two honest signals disagree. Each
   input is passed only when it is READABLE — an absent signal contributes nothing rather
   than a zero, which is the whole lesson of the 0-0 bug. */
const situations = computed(() => {
  const rows = rankings.value?.rows ?? []
  if (!rows.length) return []
  const apReadable = allPlay.value.weeksCounted > 0
  const sosMap = sos.value
  const inputs: SituationInput[] = rows.map((r) => ({
    teamKey: r.teamKey,
    n: rows.length,
    talentRank: r.strengthRank,
    recordRank: r.recordRank,
    allPlayRank: apReadable ? allPlay.value.byTeam.get(r.teamKey)?.rank : undefined,
    formDelta: allPlayForm.value.readable ? allPlayForm.value.byTeam.get(r.teamKey)?.delta : undefined,
    sosRank: sosMap.get(r.teamKey),
    managerless: r.managerless,
  }))
  return buildSituations(inputs)
})
const situationFor = (teamKey: string) => situations.value.find((s) => s.teamKey === teamKey) ?? null
const SITUATION_CLASS: Record<string, string> = {
  'sell-high': 'text-[#e69a4a]',
  'buy-low': 'text-primary',
  'schedule-turns': 'text-primary',
  gauntlet: 'text-[#e69a4a]',
  'real-deal': 'text-dark-textSecondary',
  stranded: 'text-dark-textMuted',
}

const FORM_WINDOW = 3
const FORM_MIN_DELTA = 0.10
const allPlayForm = computed(() =>
  buildAllPlayForm(trajectory.outcomes.value, allPlayKeys.value, FORM_WINDOW),
)
const formFor = (teamKey: string) => {
  if (!allPlayForm.value.readable) return null
  const f = allPlayForm.value.byTeam.get(teamKey)
  if (!f || Math.abs(f.delta) < FORM_MIN_DELTA) return null
  return {
    hot: f.delta > 0,
    pts: Math.round(Math.abs(f.delta) * 100),
    recent: Math.round(f.recentPct * 100),
    season: Math.round(f.seasonPct * 100),
  }
}
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
        <p class="mb-1 text-[10px] uppercase tracking-widest text-dark-textSecondary">Tiers</p>
        <p>Contender / Bubble / Rebuilder come from where a roster's talent lands — top third, middle, bottom third.<!--
          The abandoned rule only earns its space in a league that actually has one. Explaining
          a rule that fires for nobody is clutter, and it was the first thing on the page a
          reader had to work out was irrelevant to them.
        --><template v-if="hasAbandoned"> A team with no manager is flagged <span class="text-dark-text">abandoned</span> and held out of the due-to-rise list: the talent's there, but nobody's setting the lineup, so it won't be realized.</template></p>
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

      <!-- Rank switch. Only offered once all-play is readable — before that the résumé rank
           is just the standings, and a toggle between "talent" and "the standings you can
           already see" is a control that does nothing. -->
      <div v-if="rankings.resumeReadable" class="mb-2 flex items-center gap-2 font-mono text-[10px]">
        <span class="uppercase tracking-widest text-dark-textMuted">rank by</span>
        <div class="flex items-center gap-0.5 rounded-lg border border-dark-border p-0.5">
          <button v-for="m in (['talent', 'resume'] as const)" :key="m"
                  class="rounded-md px-2.5 py-1 uppercase tracking-wider transition-colors"
                  :class="rankMode === m ? 'font-bold text-dark-text' : 'text-dark-textMuted hover:text-dark-text'"
                  :style="rankMode === m ? { backgroundColor: primaryTint(14) } : {}"
                  @click="rankMode = m">{{ m === 'talent' ? 'Talent' : 'Résumé' }}</button>
        </div>
        <span class="text-dark-textMuted/70">
          <template v-if="rankMode === 'talent'">the roster you own, going forward</template>
          <template v-else>the season you have had — {{ Math.round(RESUME_ALLPLAY_WEIGHT * 100) }}% all-play, {{ Math.round((1 - RESUME_ALLPLAY_WEIGHT) * 100) }}% record</template>
        </span>
      </div>

      <!-- The board -->
      <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <div v-for="r in orderedRows" :key="r.teamKey" class="px-4 py-3" :style="isMe(r.teamKey) ? { backgroundColor: primaryTint(6) } : {}">
          <div class="flex items-center gap-3">
            <span class="w-6 shrink-0 text-center font-mono text-sm font-bold text-dark-textMuted">{{ rankOf(r) }}</span>
            <img v-if="r.teamLogo" :src="r.teamLogo" alt="" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="h-8 w-8 shrink-0 rounded-full bg-dark-border" />
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
                <span v-if="isMe(r.teamKey)" class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary" :style="{ backgroundColor: primaryTint(16) }">you</span>
                <span v-if="r.managerless" class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">abandoned</span>
                <span v-else class="shrink-0 font-mono text-[9px] uppercase tracking-wider" :class="tierClass(r.tier)">{{ r.tier }}</span>
                <span v-if="rowStakes.get(r.teamKey)" class="shrink-0 font-mono text-[9px] uppercase tracking-wider" :class="rowStakes.get(r.teamKey)?.cls">· {{ rowStakes.get(r.teamKey)?.label }}</span>
                <!--
                  One verdict per row, and only where two signals genuinely disagree. The
                  detail names both of them, so the claim is checkable against this same row
                  rather than being something the page merely asserts.
                -->
                <span v-if="situationFor(r.teamKey)" class="shrink-0 font-mono text-[9px] uppercase tracking-wider"
                      :class="SITUATION_CLASS[situationFor(r.teamKey)!.kind]"
                      :title="situationFor(r.teamKey)!.detail">· {{ situationFor(r.teamKey)!.label }}</span>
              </span>
              <span class="flex items-center gap-2 font-mono text-[11px] text-dark-textMuted">
                {{ recordStr(r) }}
                <!--
                  All-play sits right beside the real record on purpose: the two disagreeing
                  IS the read. Hidden until a week has actually been scored, so it can never
                  print 0-0 next to a verdict, which is the failure this page just had.
                -->
                <span v-if="allPlayFor(r.teamKey)" class="text-dark-textSecondary"
                      :title="`Scored against every team every week: ${formatAllPlay(allPlayFor(r.teamKey)!)} over ${allPlay.weeksCounted} week${allPlay.weeksCounted === 1 ? '' : 's'}. Schedule luck removed.`">
                  · {{ formatAllPlay(allPlayFor(r.teamKey)!) }} all-play
                </span>
                <!-- Form rides beside all-play because it is the same measure, windowed. -->
                <span v-if="formFor(r.teamKey)" :class="formFor(r.teamKey)!.hot ? 'text-primary' : 'text-[#e69a4a]'"
                      :title="`Last ${FORM_WINDOW} weeks they have beaten ${formFor(r.teamKey)!.recent}% of the league, against ${formFor(r.teamKey)!.season}% across the season.`">
                  · {{ formFor(r.teamKey)!.hot ? 'heating up' : 'cooling off' }} {{ formFor(r.teamKey)!.hot ? '+' : '−' }}{{ formFor(r.teamKey)!.pts }}
                </span>
                <!-- The rank you are NOT sorted by, so both readings are on every row and the
                     one you switched away from never disappears. -->
                <span v-if="rankings.resumeReadable" class="text-dark-textSecondary"
                      :title="rankMode === 'talent' ? 'Where the season they have actually had ranks them' : 'Where the roster they own ranks them'">
                  · {{ ord(otherRankOf(r)) }} by {{ rankMode === 'talent' ? 'résumé' : 'talent' }}
                </span>
                <span v-if="r.managerless" class="text-dark-textMuted">· no manager — talent stranded</span>
                <!-- Luck, split. Which half it is decides whether there is anything to do
                     about it, and the old single line could not say. -->
                <template v-else-if="gapNotes(r).length">
                  <span v-for="g in gapNotes(r)" :key="g.text" :class="g.cls">· {{ g.text }}</span>
                </template>
                <span v-else-if="!rankings.resumeReadable && r.luck === 'pretender'" class="text-[#e69a4a]">· lucky (record {{ Math.abs(r.luckDelta) }} ahead of talent)</span>
                <span v-else-if="!rankings.resumeReadable && r.luck === 'sleeper'" class="text-primary">· unlucky (talent {{ Math.abs(r.luckDelta) }} ahead of record)</span>
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
                <template v-else>−{{ fmtGap(leaderStrength - r.strength) }}{{ gapSuffix }}</template>
              </div>
            </div>
          </div>
          <p class="mt-1.5 pl-9 font-mono text-[11px] leading-snug text-dark-textMuted">{{ r.blurb }}</p>
        </div>
      </div>

      <p v-if="rankings.resumeReadable" class="mt-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
        two readings, kept apart on purpose · <span class="text-dark-textSecondary">talent</span> = the roster, <span class="text-dark-textSecondary">résumé</span> = the season · where they disagree, the gap splits into
        <span class="text-dark-textSecondary">scoring</span> (what you did with the roster — actionable) and
        <span class="text-dark-textSecondary">schedule</span> (who you drew — nobody's fault)
      </p>
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
