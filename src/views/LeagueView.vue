<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useCategoryStrength } from '@/composables/useCategoryStrength'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { buildPowerRankings, type PowerTeamInput } from '@/league/powerRankings'
import { buildCategoryStandings } from '@/league/categoryStandings'
import { buildAllPlay, formatAllPlay } from '@/league/allPlay'
import { buildLeagueStandings, BOARD_SORTS, type StakesTag, type BoardSort } from '@/league/leagueStandings'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { usePointsValue } from '@/composables/usePointsValue'
import { seasonStakes } from '@/myteam/seasonStakes'
import { buildTrajectory } from '@/league/powerTrajectory'
import { simulatePlayoffOdds, buildLeverage, type OddsTeam, type GameLeverage } from '@/league/playoffOdds'
import { buildHotCold } from '@/league/hotCold'
import { buildStrengthOfSchedule } from '@/league/strengthOfSchedule'
import PowerTrajectoryChart from '@/components/league/PowerTrajectoryChart.vue'
import TeamAvatar from '@/components/league/TeamAvatar.vue'

const props = withDefaults(defineProps<{ scoring?: 'points' | 'category' }>(), { scoring: 'points' })
const isCategory = computed(() => props.scoring === 'category')

const leagueStore = useLeagueStore()
// isEspn is still needed by the category-strength managerless detection below (ESPN
// has no equivalent "unowned team" signal, unlike Yahoo's "Manager-less Team N" name).
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

const cat = useCategoryStrength()
const source = useActivePointsSource()
const scoring = useLeagueScoring()
const trajectory = usePowerTrajectory()

function loadAll() {
  trajectory.load({ categoryForm: isCategory.value })
  if (isCategory.value) {
    cat.load()
  } else {
    scoring.load()
    source.load()
  }
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

// ── POINTS branch data ────────────────────────────────────────────────────────

const pool = computed<PointsPoolPlayer[]>(() => source.pool.value as PointsPoolPlayer[])
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots

const pointsMyTeamKey = computed<string>(() => source.myTeamKey.value)

// Precomputed player value (baseball from FG, football from Sleeper) — the points engine's input.
const season = computed(() => '') // useFootballProjections falls back to Sleeper NFL state season
const { poolValueByKey: valueByKey } = usePointsValue({ pool, fgByKey, sport: computed(() => leagueStore.activeSport), season, leagueId: computed(() => String(leagueStore.activeLeagueId ?? '')) })

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
  const names = source.teamNames.value
  const logos = source.teamLogos.value
  const stats = source.teamMeta.value
  const out: Record<string, PointsMeta> = {}
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
 * All-play — what your record would be if you played everyone every week. Computed before
 * the rankings because the résumé sort is built from it, and keyed off the league's own team
 * list rather than off the rankings (which would be circular).
 *
 * Passed through only once a week has actually been scored. An absent signal must contribute
 * nothing rather than a zero, so before kickoff the résumé sort simply is the standings.
 */
const allPlayKeys = computed(() => {
  const catKeys = Object.keys(cat.teamMeta.value ?? {})
  return isCategory.value && catKeys.length ? catKeys : Object.keys(pointsTeamMeta.value)
})
const allPlay = computed(() => buildAllPlay(trajectory.outcomes.value, allPlayKeys.value))
const allPlayReadable = computed(() => allPlay.value.weeksCounted > 0)
const allPlayPctFor = (teamKey: string): number | undefined =>
  allPlayReadable.value ? allPlay.value.byTeam.get(teamKey)?.pct : undefined
const allPlayFor = (teamKey: string) =>
  allPlayReadable.value ? allPlay.value.byTeam.get(teamKey) ?? null : null

// ── RANKINGS: category or points ─────────────────────────────────────────────

const catRankings = computed(() => {
  const s = cat.strengths.value
  if (!s.length || !cat.myTeamKey.value) return null
  const meta = cat.teamMeta.value
  const inputs: PowerTeamInput[] = s.map((x) => {
    const m = meta[x.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0 }
    return { teamKey: x.teamKey, teamName: m.name, teamLogo: m.logo, strength: x.strength, wins: m.wins, losses: m.losses, ties: m.ties, managerless: isEspn.value ? false : /manager-?less/i.test(m.name), allPlayPct: allPlayPctFor(x.teamKey) }
  })
  return buildPowerRankings(inputs)
})

/*
 * EVERY CATEGORY, RANKED — the question a category league is actually decided by.
 *
 * The board above gives one strength number per team. That is the right summary and the wrong
 * tool for this league type: "4th of twelve" says nothing about WHERE, and a category season is
 * entirely about where. A points manager can read a single total because his league has an
 * exchange rate between columns; a category manager cannot, because his does not.
 *
 * Built from the same engine totals the strength number comes from, so the two cannot disagree.
 */
const categoryBoard = computed(() => {
  if (!isCategory.value) return null
  const e: any = cat.engine.value
  const specs = cat.catSpecs.value
  if (!e?.teamCatTotals?.length || !specs?.length || !cat.myTeamKey.value) return null
  return buildCategoryStandings(
    e.teamCatTotals,
    specs.map((x: any) => ({ statId: x.statId, lowerIsBetter: !!x.lowerIsBetter, side: x.side, isRatio: !!x.isRatio })),
    cat.myTeamKey.value,
  )
})
/* Ratios want decimals and counting stats do not — printing 1,467.00 hits is noise. */
const catValue = (v: number) => (Math.abs(v) < 10 ? v.toFixed(3).replace(/^0/, '') : Math.round(v).toLocaleString())
const teamShort = (key: string) => (cat.teamNameByKey.value.get(key) ?? 'Team').slice(0, 14)

const pointsRankings = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !pointsMyTeamKey.value) return null
  const wl = trajectory.weeksLeft.value
  const model = buildPointsTeam(pool.value, valueByKey.value, pointsMyTeamKey.value, rosterSlots.value, {
    basis: wl > 0 ? 'perWeek' : 'total',
    weeksLeft: wl,
    sport: leagueStore.activeSport,
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
      allPlayPct: allPlayPctFor(s.teamKey),
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

/* Default to Record. This page opens on "where do I sit", and the two other readings are a
   click away rather than a page away — which is the whole point of merging them. */
/*
 * Record is the right default once a game has been played, and a dead page before that.
 *
 * At 0-0 every team ties on record, so the standings rendered ten rows each numbered 1 — a
 * ranked list that ranks nothing, above a toggle whose other option separates all ten. The
 * default follows the data: talent until there is a record worth reading, then record.
 */
const boardSort = ref<BoardSort>('talent')
/* Once the reader picks a sort, the default stops overriding them. */
let sortTouched = false
const pickSort = (key: BoardSort) => { sortTouched = true; boardSort.value = key }
const boardHeading = computed(() =>
  boardSort.value === 'talent' ? 'Power Rankings' : boardSort.value === 'allplay' ? 'All-play' : 'Standings')
watch(allPlayReadable, (readable) => {
  if (readable && !sortTouched) boardSort.value = 'record'
}, { immediate: true })
const calloutsOpen = ref(false)
const standings = computed(() =>
  rankings.value
    ? buildLeagueStandings(rankings.value.rows, stakesMap.value, activeMyTeamKey.value, boardSort.value)
    : [],
)

/* luckDelta split into the two things it was hiding, because they want different responses:
   a roster scoring under its own talent has something to fix, while a roster out-scoring the
   league and still losing has a schedule to wait out. Under two spots is noise in a ten-team
   league and not worth a sentence. */
const GAP_MIN = 2
const gapNotes = (r: { executionDelta: number; scheduleDelta: number; managerless: boolean }) => {
  if (!allPlayReadable.value || r.managerless) return [] as { text: string; cls: string }[]
  const out: { text: string; cls: string }[] = []
  if (Math.abs(r.executionDelta) >= GAP_MIN)
    out.push(r.executionDelta < 0
      ? { text: `scoring ${Math.abs(r.executionDelta)} under the roster`, cls: 'text-[#e69a4a]' }
      : { text: `outscoring the roster by ${r.executionDelta}`, cls: 'text-primary' })
  if (Math.abs(r.scheduleDelta) >= GAP_MIN)
    out.push(r.scheduleDelta > 0
      ? { text: `schedule worth ${r.scheduleDelta}`, cls: 'text-[#e69a4a]' }
      : { text: `schedule cost ${Math.abs(r.scheduleDelta)}`, cls: 'text-primary' })
  return out
}
/*
 * The rank you are NOT sorted by, so switching never hides a reading.
 *
 * Two things were wrong with it before a week has been scored.
 *
 * It labelled the talent view's second column "résumé" — a word whose own toggle is hidden
 * until all-play is readable, so the page introduced a third vocabulary item for a concept
 * the reader had no control over and no definition for. Record and talent were already two
 * ideas competing for one reader's attention; résumé made it three.
 *
 * And every cross-rank collapses at 0-0. Record ranks all ten teams first because nobody has
 * played, so the talent view printed "résumé 1st" ten times down the page, which reads as a
 * broken column rather than as a tie. A rank that cannot separate anybody is not a reading,
 * so it is simply absent until it means something.
 */
const crossRank = (r: { talentRank: number; allPlayRank: number; recordRank: number }) => {
  if (boardSort.value !== 'talent') return { label: 'talent', n: r.talentRank }
  /* Sorted by talent, so show the other side of the same question. All-play once it exists —
     it is the honest version of "how has the season actually gone" — and nothing before that,
     when every record is level and the column would print the same rank ten times. */
  if (!allPlayReadable.value) return null
  return { label: 'all-play', n: r.allPlayRank }
}

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


// ── POINTS LANDSCAPE ──────────────────────────────────────────────────────────


// ── LOADING ───────────────────────────────────────────────────────────────────

const loading = computed(() => (isCategory.value ? cat.loading.value : source.loading.value))

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

/*
 * MOVEMENT SINCE LAST WEEK, from the standings race we already draw.
 *
 * `trajectoryView` carries each team's record rank for every completed week, so last week is
 * the point before the last one. Positive means CLIMBED — rank 1 is best, so a team going 3rd
 * to 1st moves +2 while the number falls, and printing the raw difference would show an arrow
 * pointing the wrong way.
 *
 * This is standings movement in both board modes. Power-rank movement would need a weekly
 * snapshot of roster strength, which we do not keep — strength is recomputed from today's
 * rosters every time, so there is no "last week's power rank" to difference against. Worth
 * building, and not worth faking from a number that does not exist.
 */
const moveByKey = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {}
  const tv = trajectoryView.value
  if (!tv) return out
  for (const t of tv.teams) {
    const pts = t.standings
    if (pts.length < 2) continue
    out[t.teamKey] = pts[pts.length - 2].rank - pts[pts.length - 1].rank
  }
  return out
})

/*
 * SORTING THE TABLE ITSELF, which retires a toggle.
 *
 * "Rank by" offered Standings / Power Rankings / All-play, and all-play was there because the
 * column could not be sorted any other way. Columns that sort make that a property of the
 * table rather than a third mode to explain — so all-play comes out of the toggle and stays as
 * a column you can click. The two that remain are genuinely different BOARDS: what you banked
 * against what you own, which is the distinction the page exists to draw.
 */
type SortKey = 'rank' | 'record' | 'allplay' | 'talent' | 'resume' | 'proj' | 'playoff' | 'title'
const sortKey = ref<SortKey>('rank')
const sortDesc = ref(true)
function toggleSort(k: SortKey) {
  if (sortKey.value === k) { sortDesc.value = !sortDesc.value; return }
  sortKey.value = k
  /* Best-first on the way in, whichever direction that happens to be for the column. */
  sortDesc.value = k !== 'rank'
}
/* Reverting to 'rank' follows whichever board the reader is on, so the toggle still means
   something after a column sort. */
watch(() => boardSort.value, () => { sortKey.value = 'rank' })

const sortedStandings = computed(() => {
  const rows = standings.value
  if (sortKey.value === 'rank') return rows
  const odds = (k: string) => oddsByKey.value.get(k)
  const val = (r: typeof rows[number]): number => {
    switch (sortKey.value) {
      case 'record': return r.wins + 0.5 * r.ties
      case 'allplay': { const a = allPlayFor(r.teamKey); return a ? a.wins + 0.5 * (a.ties ?? 0) : -1 }
      case 'talent': return r.strength
      case 'resume': return -r.resumeRank          // rank 1 is best, so invert for a desc sort
      case 'proj': return odds(r.teamKey)?.projWins ?? -1
      case 'playoff': return odds(r.teamKey)?.playoffPct ?? -1
      case 'title': return odds(r.teamKey)?.titlePct ?? -1
      default: return 0
    }
  }
  return [...rows].sort((a, b) => (sortDesc.value ? val(b) - val(a) : val(a) - val(b)))
})

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

// Remaining strength-of-schedule for every team (easiest road = rank 1), with fade/surge
// flags where schedule luck contradicts current standing.
const leagueSos = computed(() => {
  const sched = trajectory.remainingSchedule.value
  const rows = standings.value
  if (!sched.length || !rows.length) return []
  const teams = rows.map((r, i) => ({ teamKey: r.teamKey, teamName: r.teamName, strength: r.strength, standingRank: i + 1 }))
  return buildStrengthOfSchedule(teams, sched.map((w) => ({ matchups: w.matchups })))
})

// Your own remaining-SOS rank (drives the playoff-path headline).
const sosRank = computed(() => {
  const me = leagueSos.value.find((r) => r.teamKey === activeMyTeamKey.value)
  return me ? { rank: me.sosRank, total: me.total } : null
})

// Teams the schedule is about to move (sorted easiest road first), for the outlook list.
const sosMovers = computed(() => leagueSos.value.filter((r) => r.trend))

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

// SOS difficulty bar colour by road tier (independent of standing): easy=green, hard=orange.
const sosBarColor = (sosRank: number, total: number) => {
  const easy = Math.max(1, Math.ceil(total / 3))
  const hard = total - Math.max(1, Math.floor(total / 3)) + 1
  if (sosRank <= easy) return 'var(--color-primary, #C6FF3A)'
  if (sosRank >= hard) return '#e69a4a'
  return 'rgba(255,255,255,0.25)'
}
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
          <!-- The heading follows the toggle. It read "Standings" while the reader was
               ranking by talent, so the page named the table one thing and sorted it by
               another — the same disagreement the labels themselves had. -->
          <h2 class="font-display text-lg font-bold text-dark-text">{{ boardHeading }}</h2>
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

      <!--
        The triage shortlist — who to act on, and the move. Actionable only: abandoned teams
        and bottom-tier "sleepers" are held out, because a thin roster is not a real buy-low.
        Folded, with the count visible, so it cannot push the board off the screen.
      -->
      <section v-if="rankings && (rankings.pretenders.length || rankings.sleepers.length)"
               class="mb-4 rounded-xl border bg-dark-card"
               :style="{ borderColor: primaryTint(35) }">
        <button class="flex w-full items-center justify-between gap-3 p-4" @click="calloutsOpen = !calloutsOpen">
          <span class="min-w-0 text-left">
            <span class="font-display text-xs font-semibold uppercase tracking-wide text-primary">
              ★ {{ rankings.sleepers.length + rankings.pretenders.length }} team{{ rankings.sleepers.length + rankings.pretenders.length > 1 ? 's' : '' }} due to move
            </span>
            <span class="mt-0.5 block font-mono text-[10px] text-dark-textMuted/70">
              {{ rankings.sleepers.length }} due to rise &middot; {{ rankings.pretenders.length }} due to fall
            </span>
          </span>
          <span class="shrink-0 font-mono text-dark-textMuted">{{ calloutsOpen ? '&minus;' : '+' }}</span>
        </button>
        <div v-if="calloutsOpen" class="grid gap-3 border-t border-dark-border/40 px-4 pb-4 pt-3 sm:grid-cols-2">
          <div v-if="rankings.sleepers.length">
            <p class="font-mono text-[10px] uppercase tracking-widest text-primary">&#9650; Record due to rise</p>
            <p class="mb-2 font-mono text-[9px] text-dark-textMuted">roster the standings haven't caught up to</p>
            <div v-for="r in rankings.sleepers.slice(0, 3)" :key="'sl-' + r.teamKey" class="border-t border-dark-border/40 py-2 first:border-0">
              <p class="truncate text-sm text-dark-text">{{ r.teamName }}</p>
              <p class="font-mono text-[11px] text-dark-textMuted">
                {{ r.wins }}-{{ r.losses }} record, but <span class="text-primary">{{ ord(r.strengthRank) }} in talent</span>
              </p>
            </div>
          </div>
          <div v-if="rankings.pretenders.length">
            <p class="font-mono text-[10px] uppercase tracking-widest text-[#e69a4a]">&#9660; Record due to fall</p>
            <p class="mb-2 font-mono text-[9px] text-dark-textMuted">the standings are flattering them</p>
            <div v-for="r in rankings.pretenders.slice(0, 3)" :key="'pr-' + r.teamKey" class="border-t border-dark-border/40 py-2 first:border-0">
              <p class="truncate text-sm text-dark-text">{{ r.teamName }}</p>
              <p class="font-mono text-[11px] text-dark-textMuted">
                {{ r.wins }}-{{ r.losses }} record, but only <span class="text-[#e69a4a]">{{ ord(r.strengthRank) }} in talent</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Three readings of the same ten rows. Résumé only appears once a week has been
           scored: before that it IS the record, and a control that changes nothing is worse
           than no control. -->
      <div v-if="standings.length" class="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px]">
        <span class="uppercase tracking-widest text-dark-textMuted">rank by</span>
        <div class="flex items-center gap-0.5 rounded-lg border border-dark-border p-0.5">
          <button
            v-for="sortOpt in BOARD_SORTS"
            :key="sortOpt.key"
            v-show="sortOpt.key !== 'allplay' || allPlayReadable"
            class="rounded-md px-2.5 py-1 uppercase tracking-wider transition-colors"
            :class="boardSort === sortOpt.key ? 'font-bold text-dark-text' : 'text-dark-textMuted hover:text-dark-text'"
            :style="boardSort === sortOpt.key ? { backgroundColor: primaryTint(14) } : {}"
            @click="pickSort(sortOpt.key)"
          >{{ sortOpt.label }}</button>
        </div>
        <!--
          Both readings, always, rather than the hint for whichever button is pressed.
          "Record" and "talent" are the same ten teams answering two different questions, and
          showing one definition at a time asked the reader to hold the other in their head —
          which is exactly the confusion the toggle was supposed to resolve.
        -->
        <span class="text-dark-textMuted/70">
          <span :class="boardSort === 'record' ? 'text-dark-textSecondary' : ''">standings = what you've banked</span>
          <span class="text-dark-border/60"> &middot; </span>
          <span :class="boardSort === 'talent' ? 'text-dark-textSecondary' : ''">power rankings = the roster you own from here</span>
          <template v-if="allPlayReadable">
            <span class="text-dark-border/60"> &middot; </span>
          </template>
        </span>
      </div>

      <!--
        Ten rows all numbered 1 is a correct tie that reads as a broken column. Say which it
        is, rather than leaving the reader to work out whether the page is wrong.
      -->
      <p v-if="standings.length && boardSort === 'record' && !allPlayReadable"
         class="mb-2 font-mono text-[10px] text-dark-textMuted/70">
        <!-- Not "alphabetical", which I wrote first and the screenshot disproved. recordRank
             is winPct plus points-for, both zero at 0-0, so every team genuinely ties and the
             rows fall through to the order they arrived in. -->
        Nothing has been played, so all ten records are 0-0 — every team is tied for 1st and
        this is not yet a ranking.
        <button class="text-primary underline-offset-2 hover:underline" @click="pickSort('talent')">Rank by talent</button>
        to separate them.
      </p>

      <div v-if="!standings.length" class="py-10 text-center font-mono text-xs text-dark-textMuted">
        Loading standings…
      </div>
      <div v-else class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <!-- Column header row -->
        <div class="px-4 py-1 flex items-center gap-3 border-b border-dark-border/40">
          <!--
            One spacer per fixed column in the row below, in the same order and at the same
            width. The movement column was added to the row and not to this header, so every
            label sat one column to the left of the numbers it named — which is worse than no
            header, because it reads as a header that works.
          -->
          <!-- spacer: position number -->
          <span class="w-6 shrink-0" />
          <!-- spacer: movement arrow -->
          <span class="w-7 shrink-0" />
          <!-- spacer: logo -->
          <span class="h-8 w-8 shrink-0" />
          <!-- spacer: name column -->
          <span class="min-w-0 flex-1" />
          <!--
            REAL COLUMNS, because the old row was not one.

            Record, all-play, talent rank, the two luck notes and the projected record were a
            run-on sentence of mono text at variable positions, so nothing lined up down the
            page and comparing two teams meant reading two paragraphs. Every fact now owns a
            column at a fixed width, which is the whole reason a table beats a list.

            The headers sort. That is what retires the third "rank by" option: all-play was a
            mode only because the column could not be clicked.
          -->
          <button type="button" class="w-14 shrink-0 text-right font-mono text-[9px] uppercase tracking-wider transition-colors hover:text-dark-text"
                  :class="sortKey === 'record' ? 'text-primary' : 'text-dark-textMuted'" @click="toggleSort('record')">rec</button>
          <button type="button" class="hidden w-16 shrink-0 text-right font-mono text-[9px] uppercase tracking-wider transition-colors hover:text-dark-text sm:block"
                  :class="sortKey === 'allplay' ? 'text-primary' : 'text-dark-textMuted'" @click="toggleSort('allplay')">all-play</button>
          <button type="button" class="w-20 shrink-0 text-right font-mono text-[9px] uppercase tracking-wider transition-colors hover:text-dark-text"
                  :class="sortKey === 'talent' ? 'text-primary' : 'text-dark-textMuted'" @click="toggleSort('talent')">talent</button>
          <template v-if="playoffOdds">
            <!--
              THE COLUMN THAT CHANGES WITH THE BOARD.

              Power Rankings used to reorder the same ten rows and show nothing new, which made
              it look like a sort rather than a second reading. The ranking has components the
              table never exposed — this swaps the projected record, which is a standings
              number, for the résumé rank, which is the power ranking's own input: all-play
              weighted with the actual record, i.e. the season you have really had.
            -->
            <button v-if="boardSort === 'talent'" type="button"
                    class="hidden w-14 shrink-0 text-right font-mono text-[9px] uppercase tracking-wider transition-colors hover:text-dark-text md:block"
                    :class="sortKey === 'resume' ? 'text-primary' : 'text-dark-textMuted'" @click="toggleSort('resume')">résumé</button>
            <button v-else type="button" class="hidden w-14 shrink-0 text-right font-mono text-[9px] uppercase tracking-wider transition-colors hover:text-dark-text md:block"
                    :class="sortKey === 'proj' ? 'text-primary' : 'text-dark-textMuted'" @click="toggleSort('proj')">proj</button>
            <button type="button" class="w-24 shrink-0 text-right font-mono text-[9px] uppercase tracking-wider transition-colors hover:text-dark-text"
                    :class="sortKey === 'playoff' ? 'text-primary' : 'text-dark-textMuted'" @click="toggleSort('playoff')">playoff</button>
            <button type="button" class="hidden w-10 shrink-0 text-right font-mono text-[9px] uppercase tracking-wider transition-colors hover:text-dark-text sm:block"
                    :class="sortKey === 'title' ? 'text-primary' : 'text-dark-textMuted'" @click="toggleSort('title')">title</button>
          </template>
        </div>
        <div
          v-for="(r, i) in sortedStandings"
          :key="r.teamKey"
          class="px-4 py-2.5 flex items-center gap-3"
          :style="r.isMe ? { backgroundColor: primaryTint(6) } : {}"
        >
          <!-- Position -->
          <span class="w-6 shrink-0 text-center font-mono text-sm text-dark-textMuted">{{ r.rank }}</span>

          <!-- Which way they moved since last week. Positive is a CLIMB; rank 1 being best
               means the raw difference points the wrong way. -->
          <span class="w-7 shrink-0 text-center font-mono text-[10px]"
                :class="(moveByKey[r.teamKey] ?? 0) > 0 ? 'text-primary' : (moveByKey[r.teamKey] ?? 0) < 0 ? 'text-[#FF5C5C]' : 'text-dark-textMuted/30'"
                :title="moveByKey[r.teamKey] ? `${Math.abs(moveByKey[r.teamKey])} place${Math.abs(moveByKey[r.teamKey]) === 1 ? '' : 's'} ${moveByKey[r.teamKey] > 0 ? 'up' : 'down'} since last week` : 'no change since last week'">
            <template v-if="(moveByKey[r.teamKey] ?? 0) > 0">▲{{ moveByKey[r.teamKey] }}</template>
            <template v-else-if="(moveByKey[r.teamKey] ?? 0) < 0">▼{{ -moveByKey[r.teamKey] }}</template>
            <template v-else>&middot;</template>
          </span>

          <!-- Logo (falls back to initials) -->
          <TeamAvatar :name="r.teamName" :logo="r.teamLogo" :size="32" />

          <!-- Name + YOU badge + stakes -->
          <span class="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
            <span class="truncate text-sm font-semibold text-dark-text">{{ r.teamName }}</span>
            <span v-if="r.isMe" class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary"
                  :style="{ backgroundColor: primaryTint(16) }">you</span>
            <span v-if="r.stakes === 'clinched'" class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary">clinched</span>
            <span v-else-if="r.stakes === 'eliminated'" class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted">eliminated</span>
            <span v-else-if="r.stakes === 'bubble'" class="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#e69a4a]">bubble</span>
            <!-- The luck read keeps its place beside the name: it is a sentence about this
                 team, not a measurement, and it has no column it belongs in. -->
            <span v-if="r.luck === 'sleeper'" class="hidden shrink-0 text-primary lg:inline" title="Due to rise">▲</span>
            <span v-else-if="r.luck === 'pretender'" class="hidden shrink-0 text-[#e69a4a] lg:inline" title="Due to fall">▼</span>
            <span v-for="g in gapNotes(r)" :key="g.text" class="hidden shrink-0 font-mono text-[10px] xl:inline" :class="g.cls">{{ g.text }}</span>
          </span>

          <!-- REC -->
          <span class="w-14 shrink-0 text-right font-mono text-[11px] text-dark-textSecondary">
            {{ r.wins }}-{{ r.losses }}{{ r.ties ? '-' + r.ties : '' }}
          </span>
          <!-- ALL-PLAY: the record with the coin flip taken out. -->
          <span class="hidden w-16 shrink-0 text-right font-mono text-[11px] text-dark-textMuted sm:block"
                :title="allPlayFor(r.teamKey) ? `Scored against every team every week, over ${allPlay.weeksCounted} week${allPlay.weeksCounted === 1 ? '' : 's'}. Schedule luck removed.` : ''">
            {{ allPlayFor(r.teamKey) ? formatAllPlay(allPlayFor(r.teamKey)!) : '—' }}
          </span>
          <!-- TALENT: the number and its rank, which is the pair that means something. -->
          <span class="w-20 shrink-0 text-right font-mono text-[11px] text-dark-textSecondary">
            {{ Math.round(r.strength) }}<span class="ml-1 text-[9px] text-dark-textMuted">{{ ord(r.talentRank) }}</span>
          </span>
          <template v-if="playoffOdds">
            <span v-if="boardSort === 'talent'" class="hidden w-14 shrink-0 text-right font-mono text-[11px] text-dark-textMuted md:block"
                  title="All-play weighted with the actual record — the season you have really had, which is what the power ranking is built on.">
              {{ ord(r.resumeRank) }}
            </span>
            <span v-else class="hidden w-14 shrink-0 text-right font-mono text-[11px] text-dark-textMuted md:block">
              <template v-if="oddsByKey.get(r.teamKey)">
                {{ Math.round((oddsByKey.get(r.teamKey)!).projWins) }}-{{ Math.round((oddsByKey.get(r.teamKey)!).projLosses) }}
              </template>
              <template v-else>&mdash;</template>
            </span>
          </template>

          <!-- Right anchor: playoff % bar when odds exist, talent bar as fallback -->
          <template v-if="oddsByKey.get(r.teamKey) as any">
            <!-- Playoff % bar + label -->
            <!--
              NO BAR. It shared this cell with the number and the title, and in the width a
              column leaves it rendered as a dot — a bar you cannot read the length of is
              decoration charging rent. The figure is right there and the header sorts on it,
              which is what the bar was approximating.
            -->
            <!--
              TWO CELLS, because the header is two columns. Nesting the title inside the
              playoff cell made the data row one column shorter than its own header, and the
              flex name column absorbed the difference — so every label sat 52px left of the
              figures it named. A header that is merely NEAR the right column is worse than
              none; it reads as working.
            -->
            <div class="shrink-0 flex items-center justify-end w-24">
              <span class="w-full text-right font-mono text-[11px]"
                :class="(oddsByKey.get(r.teamKey)!).playoffPct >= 0.5 ? 'text-primary' : (oddsByKey.get(r.teamKey)!).playoffPct > 0 ? 'text-[#e69a4a]' : 'text-dark-textMuted'"
              >
                {{ fmtPct((oddsByKey.get(r.teamKey)!).playoffPct) }}
              </span>
              <!--
                AND THE TITLE, which is a different question with a frequently opposite answer.
                The last seed in reaches the bracket far more often than it wins it, so a column
                of playoff odds alone tells a bubble team and a juggernaut nearly the same
                story. Quieter than the odds beside it because making the bracket is the nearer
                decision; this is the one that says whether the season is worth pushing for.
              -->
            </div>
            <span class="hidden w-10 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/70 sm:block">
              {{ fmtPct((oddsByKey.get(r.teamKey)!).titlePct) }}
            </span>
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
                <!-- Rounding to the nearest 10 flattened ten teams into "150" and "140": the bars
                     differed, the numbers didn't, and the column stopped carrying any ordering. -->
                <template v-else>{{ r.strength.toFixed(1) }} pts/wk</template>
              </div>
            </div>
          </template>
        </div>
      </div>
      <p class="mt-2 font-mono text-[10px] text-dark-textMuted">
        <template v-if="playoffOdds">proj = projected final record · % = playoff odds (rest-of-season sim)</template>
        <!-- Riding luck and being due to climb are both statements about results. Before a
             game has been scored there are none, and the line described a mid-season read of
             a week-one page. -->
        <template v-else-if="allPlayReadable">bar = roster talent · short bar near top = riding luck · long bar near bottom = due to climb</template>
        <template v-else>bar = roster talent, projected points per week · nothing has been played yet, so every record is level</template>
      </p>

      <!-- Hot / Cold callout (last 3 weeks) -->
      <div
        v-if="hotCold.hottest && hotCold.coldest"
        class="mt-3 rounded-xl border border-dark-border bg-dark-card px-4 py-2.5 font-mono text-[11px] space-y-1.5"
      >
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-primary">Hottest</span>
          <span class="shrink-0 text-dark-textMuted">last {{ hotCold.weeks }} wks</span>
          <TeamAvatar :name="hotCold.hottest.teamName" :logo="hotCold.hottest.teamLogo" :size="16" />
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
          <TeamAvatar :name="hotCold.coldest.teamName" :logo="hotCold.coldest.teamLogo" :size="16" />
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
    <!--
      EVERY CATEGORY, for the league type that is decided by them.

      A tile per column: where you stand, and the whole league underneath it. The rank alone
      would be cheaper and much less useful — 8th in average is a different problem when the
      seven above you are bunched inside two points than when they are strung out, and only the
      column shows which. The gap to the place above is printed in the category's own units for
      the same reason: a tenth of a point of average is a waiver claim, half a run of ERA is not.
    -->
    <section v-if="categoryBoard && categoryBoard.columns.length" class="mb-8">
      <div class="mb-3">
        <h2 class="font-display text-lg font-bold text-dark-text">Every category</h2>
        <p class="font-mono text-[11px] text-dark-textMuted">
          where you stand in each column &middot; projected rest-of-season output
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="col in categoryBoard.columns" :key="'cat-' + col.statId"
             class="rounded-xl border border-dark-border bg-dark-card p-3">
          <div class="mb-2 flex items-baseline justify-between gap-2">
            <span class="font-mono text-[11px] uppercase tracking-widest text-dark-textMuted">
              {{ cat.labelOf(col.statId) }}
            </span>
            <span class="font-display text-lg font-bold tabular-nums"
                  :class="categoryBoard.strong.includes(col.statId) ? 'text-[#7ee787]'
                        : categoryBoard.weak.includes(col.statId) ? 'text-[#FF5C5C]' : 'text-dark-text'">
              {{ ord(col.myRank) }}
            </span>
          </div>
          <!-- A column nobody has scored in yet is not a ranking, and calling it one is how a
               preseason board tells ten teams they are each in first. -->
          <p v-if="col.gapToNext === null && col.gapToPrev === null"
             class="mb-2 font-mono text-[9px] text-dark-textMuted/50">nothing separates the league here yet</p>
          <p v-else-if="col.gapToNext !== null" class="mb-2 font-mono text-[9px] text-dark-textMuted/70">
            {{ catValue(col.gapToNext) }} behind {{ ord(col.myRank - 1) }}
          </p>
          <p v-else class="mb-2 font-mono text-[9px] text-[#7ee787]/70">top of the league</p>
          <div class="space-y-0.5">
            <div v-for="row in col.rows" :key="col.statId + row.teamKey"
                 class="flex items-baseline justify-between gap-2 rounded px-1 py-0.5 font-mono text-[10px]"
                 :class="row.teamKey === activeMyTeamKey ? 'bg-primary/10 text-primary' : 'text-dark-textMuted'">
              <span class="min-w-0 truncate">{{ teamShort(row.teamKey) }}</span>
              <span class="shrink-0 tabular-nums">{{ catValue(row.value) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

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
              <TeamAvatar :name="oppName(topGame.opponentKey)" :logo="teamLogoOf(topGame.opponentKey)" :size="16" />
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
              <TeamAvatar :name="rv.name" :logo="rv.logo" :size="20" />
              <span class="min-w-0 flex-1 truncate font-mono text-[12px] text-dark-text">{{ rv.name }}</span>
              <span class="shrink-0 font-mono text-[10px] text-dark-textMuted">proj {{ Math.round(rv.projWins) }}-{{ Math.round(rv.projLosses) }}</span>
              <span class="shrink-0 w-9 text-right font-mono text-[11px]" :class="oddsColor(rv.playoffPct)">{{ fmtPct(rv.playoffPct) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── SCHEDULE OUTLOOK (full-league remaining SOS) ──────────────────────── -->
    <section v-if="leagueSos.length >= 3" class="mb-8">
      <div class="mb-2 flex items-baseline justify-between gap-3">
        <h2 class="font-display text-lg font-bold text-dark-text">Schedule outlook</h2>
        <span v-if="sosMovers.length" class="font-mono text-xs text-dark-textMuted">{{ sosMovers.length }} on the move</span>
      </div>
      <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
        remaining road, easiest to hardest · <span class="text-primary">▲ soft finish</span> (may rise) · <span class="text-[#e69a4a]">⚠ tough finish</span> (may fade)
      </p>
      <div class="rounded-xl border border-dark-border bg-dark-card divide-y divide-dark-border/40">
        <div
          v-for="r in leagueSos"
          :key="r.teamKey"
          class="px-4 py-2 flex items-center gap-3"
          :style="r.teamKey === activeMyTeamKey ? { backgroundColor: primaryTint(6) } : {}"
        >
          <span class="w-5 shrink-0 text-center font-mono text-[11px] text-dark-textMuted">{{ r.sosRank }}</span>
          <TeamAvatar :name="r.teamName" :logo="teamLogoOf(r.teamKey)" :size="20" />
          <span class="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
            <span class="truncate font-mono text-[12px] text-dark-text">{{ r.teamName }}</span>
            <span
              v-if="r.teamKey === activeMyTeamKey"
              class="shrink-0 rounded px-1 font-mono text-[9px] uppercase text-primary"
              :style="{ backgroundColor: primaryTint(16) }"
            >you</span>
          </span>
          <span class="shrink-0 font-mono text-[10px] text-dark-textMuted">{{ ord(r.standingRank) }}</span>
          <!-- difficulty bar: longer = harder road -->
          <div class="shrink-0 w-16 h-1.5 relative overflow-hidden rounded-full" :style="{ backgroundColor: 'rgba(255,255,255,0.08)' }">
            <div
              class="absolute inset-y-0 left-0 rounded-full"
              :style="{ width: (r.sosRank / r.total * 100) + '%', backgroundColor: sosBarColor(r.sosRank, r.total) }"
            />
          </div>
          <span
            class="shrink-0 w-24 text-right font-mono text-[10px]"
            :class="r.trend === 'fade' ? 'text-[#e69a4a]' : r.trend === 'surge' ? 'text-primary' : 'text-dark-textMuted'"
          >
            <template v-if="r.trend === 'surge'">▲ soft road</template>
            <template v-else-if="r.trend === 'fade'">⚠ tough road</template>
            <template v-else>—</template>
          </span>
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

    <!--
      Trade radar, Position Strength and "Where you stack up" lived here and were all three
      the Trades page, rebuilt. Worse than duplicated: they were SEPARATE implementations —
      league/tradeFit.ts and league/pointsPositional.ts and composables/useLeagueLandscape.ts
      against myteam/pointsTradeLandscape.ts — free to disagree about who your best partner
      is depending on which tab you were looking at. tradeFit's own docstring conceded the
      point ("the actual player-for-player engine lives on the Trades page"), and
      useLeagueLandscape calls itself "the Trades league landscape" in its first line.

      One answer, on the page that can attach players to it.
    -->
    <section class="mb-8">
      <div class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Where to deal</h2>
        <p class="font-mono text-[10px] text-dark-textMuted">
          Who is strong where you are thin, who wants what you are sitting on, and the deal
          itself — scored for both sides.
        </p>
        <router-link to="/trades" class="mt-2 inline-block font-mono text-[11px] text-primary hover:underline">
          Open Trades &rarr;
        </router-link>
      </div>
    </section>
    </template><!-- /v-else (rankings ready) -->
  </div>
</template>
