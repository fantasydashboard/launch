<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsWire, type Swap } from '@/myteam/pointsWire'
import { buildPointsTeam } from '@/myteam/pointsTeam'
import { usePointsValue } from '@/composables/usePointsValue'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'
import { nflTeamLogo } from '@/players/nflTeamLogo'
import { useFootballWire } from '@/composables/useFootballWire'
import RankingPicker from '@/components/RankingPicker.vue'
import { useDynastyValues } from '@/composables/useDynastyValues'
import { readAge, AGE_TONE } from '@/football/positionalAge'
import SeasonPassGate from '@/components/SeasonPassGate.vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const leagueStore = useLeagueStore()
/* The waiver call is one of the four the Season Pass sells, and it was fully readable by
   anyone who had not signed in — the Draft Room was honouring the wall on its own. */
const { hasFullAccess } = useFeatureAccess()
const isFootball = computed(() => leagueStore.activeSport === 'football')
const teamLogo = (abbr?: string) => (isFootball.value ? nflTeamLogo(abbr) : mlbTeamLogo(abbr))

const source = useActivePointsSource()
const scoring = useLeagueScoring()
const schedule = ref<WeekSchedule>({ gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} })

async function loadSchedule() {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const end = new Date(today)
  end.setDate(today.getDate() + ((7 - today.getDay()) % 7))
  schedule.value = await getWeekSchedule(fmt(today), fmt(end))
}

function loadAll() {
  scoring.load()
  loadSchedule()
  source.load()
  source.loadFreeAgents(200)
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const pool = source.pool
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const myTeamKey = source.myTeamKey
const leagueSize = source.leagueSize

// Free agents minus anyone already rostered (the platform FA feed leaks rostered players).
const freeAgents = computed(() => {
  const rostered = new Set(pool.value.map((p) => p.playerKey))
  const guard = pool.value.length > 0
  return source.freeAgents.value.filter((fa) => !guard || !rostered.has(fa.playerKey))
})

// Precomputed player value (baseball from FG, football from Sleeper) — the points engine's input.
// Free agents are fed in too so football FAs (not in the rostered pool) resolve through valueOf.
const season = computed(() => '') // useFootballProjections falls back to Sleeper NFL state season
const { valueByKey, valueOf, loading: valueLoading } = usePointsValue({
  pool,
  fgByKey,
  sport: computed(() => leagueStore.activeSport),
  season,
  freeAgents,
})

// Football Wire runs off the VOR engine (separate from the baseball wire brain above).
/* Folded by default. Whether there is a move to make is the headline; the rows behind it are
   the working, and they were pushing the board — the thing you actually browse — off-screen. */
const movesOpen = ref(false)

/*
 * Dynasty rides ALONGSIDE the rest-of-season number, never replacing it. A dynasty manager
 * still has to decide this week, and a win-now contender still has to know what an ageing
 * asset costs long term — showing one horizon means picking the wrong one for half the users
 * half the time. Both columns, and where they disagree is the read.
 *
 * Only fetched for actual dynasty leagues; a redraft manager never spends the request.
 */
const dynasty = useDynastyValues({
  rosterSlots: source.rosterSlots,
  leagueSize: source.leagueSize,
  scoring: computed(() => scoring.weights.value as Record<string, number>),
  enabled: isFootball,
  /* Roster and wire together, so an uploaded list can be matched against every body the
     board can show rather than only the ones you already own. */
  players: computed(() => [
    ...pool.value.map((p) => ({ playerKey: p.playerKey, name: p.name, position: p.position })),
    ...freeAgents.value.map((f) => ({ playerKey: f.playerKey ?? `fa:${f.name}`, name: f.name, position: f.position })),
  ]),
})
const dynRow = (key?: string) => (key ? dynasty.rows.value[key] ?? null : null)

/*
 * Which clock the page is ordered by. Both numbers were already on every row, but the ORDER
 * was always this season's — so the dynasty column could tell you a 22-year-old was RB4 and
 * still bury him forty rows down behind bodies that score more this year. Reading a ranking
 * you cannot sort by is most of the way to not having it.
 *
 * Players the market never priced sink to the bottom of a dynasty sort rather than to the
 * top: absent is not "best available", and an unpriced player must never outrank a priced one.
 */
type WireSort = 'season' | 'dynasty'
const wireSort = ref<WireSort>('season')
const WIRE_SORTS: { key: WireSort; label: string; hint: string }[] = [
  { key: 'season', label: 'This season', hint: 'value over replacement, rest of season' },
  { key: 'dynasty', label: 'Dynasty', hint: 'the long-term market, ours untouched' },
]
/*
 * THE COMPARISON, which is the point and was the thing missing.
 *
 * Both rankings were on the page and the gap between them never was — so finding a buy-low
 * meant holding "Henry is DYN RB17" in your head, flipping the sort, hunting for him again
 * and subtracting by eye. Worse, the board printed a dynasty RANK beside a season POINT
 * total, which are not comparable quantities at all.
 *
 * So each row now carries its season position rank as well, and the signed distance between
 * the two. A player the long-term market rates well above his rest-of-season points is
 * someone you can buy while his current production hides him; the reverse is someone to sell
 * while this year's box score still flatters him.
 */
const seasonRankByKey = computed(() => {
  const m = new Map<string, number>()
  const rows = fbWire.value?.board[boardPos.value] ?? []
  // The board arrives sorted by rest-of-season value, so position in that list IS the rank.
  rows.forEach((r, i) => m.set(r.playerKey, i + 1))
  return m
})
/* Under this many places the two rankings agree closely enough that a badge would be noise;
   in a position pool of forty-plus bodies a handful of spots is inside the disagreement you
   would expect between any two honest sources. */
const RANK_GAP_MIN = 8
const rankGap = (key: string) => {
  const d = dynRow(key)
  const season = seasonRankByKey.value.get(key)
  if (!d || !season) return null
  // Positive = the long-term market likes him more than this season does.
  const delta = season - d.positionRank
  let tag = delta >= RANK_GAP_MIN ? 'buy-low' : delta <= -RANK_GAP_MIN ? 'sell-high' : ''
  /*
   * A gap the market has JUST created is not a mispricing.
   *
   * "Buy low" claims the market is asleep on a player. When it has cut him a quarter of his
   * value inside a month, the market is not asleep — it is early, and our season projection
   * is the thing lagging. Josh Jacobs is why: exempt list, biggest 30-day faller in the feed,
   * and Sleeper still carrying him Active with an 18-game projection and a fourth-round ADP.
   * The old rule would have told someone to trade for a player who may never play again.
   *
   * Only the matching direction is suppressed. A falling player can still be a genuine
   * sell-high — that reading agrees with the move rather than arguing with it.
   */
  if (tag === 'buy-low' && d.momentum === 'falling') tag = ''
  if (tag === 'sell-high' && d.momentum === 'rising') tag = ''
  return { season, dyn: d.positionRank, delta, tag, momentum: d.momentum }
}
const GAP_CLS: Record<string, string> = {
  'buy-low': 'text-[#7ee787]',
  'sell-high': 'text-[#e69a4a]',
}
/* Shown INSTEAD of a buy/sell read, not beside it — the point is that the market moving is a
   different fact from the market being wrong. */
const MOMENTUM_CLS: Record<string, string> = {
  falling: 'text-[#f85149]',
  rising: 'text-[#7ee787]',
  steady: '',
}

const byDynasty = (ka?: string, kb?: string) => {
  const a = dynRow(ka), b = dynRow(kb)
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.overallRank - b.overallRank
}
/* How many free agents are genuinely better than a replacement body. Counting them is what
   lets the collapsed header say something true: on a barren wire the honest headline is that
   nothing clears your roster, not a ranked list of players you would never add. */
const bestAboveReplacement = computed(() =>
  (fbWire.value?.bestAvailable ?? []).filter((r) => r.vorRos > 0).length,
)
const bestTopValue = computed(() => fbWire.value?.bestAvailable?.[0]?.vorRos ?? 0)

const sortedBest = computed(() => {
  const rows = fbWire.value?.bestAvailable ?? []
  if (wireSort.value === 'season' || !dynasty.ready.value) return rows
  return [...rows].sort((x, y) => byDynasty(x.player.playerKey, y.player.playerKey))
})
const sortedBoard = computed(() => {
  const rows = fbWire.value?.board[boardPos.value] ?? []
  if (wireSort.value === 'season' || !dynasty.ready.value) return rows
  return [...rows].sort((x, y) => byDynasty(x.playerKey, y.playerKey))
})
/* Position rank among players the market has priced, toned on the same scale as everything
   else on the page. Absent = "—", never a zero that would read as a verdict. */
const dynTone = (r: { positionRank: number } | null) =>
  !r ? 'text-dark-textMuted/40'
    : r.positionRank <= 12 ? 'text-[#7ee787]'
    : r.positionRank <= 24 ? 'text-[#3fb950]'
    : r.positionRank <= 48 ? 'text-dark-textMuted'
    : 'text-[#d29922]'
const LEAN_LABEL: Record<string, { text: string; cls: string }> = {
  'future': { text: 'future', cls: 'text-[#7ee787]' },
  'win-now': { text: 'win-now', cls: 'text-[#e69a4a]' },
  'level': { text: '', cls: '' },
}

const { wire: fbWire, loading: fbLoading, rosSource } = useFootballWire({
  pool,
  freeAgents,
  slots: rosterSlots,
  teams: leagueSize,
  myTeamKey,
  season,
  enabled: isFootball,
})
/**
 * Your most droppable bodies: lowest value-over-replacement among players you own.
 * "Who do I cut for this?" is the second half of every waiver decision, and the page only
 * ever answered it inside a concrete upgrade — so when no upgrade cleared the bar, the
 * question went unanswered entirely.
 */
const cutCandidates = computed(() => {
  const b = fbWire.value?.board
  if (!b) return []
  const mine = Object.values(b).flat().filter((r) => r.owned)
  return [...mine].sort((a, b2) => a.vorRos - b2.vorRos).slice(0, 3)
})

/* Open by default. This board is the product's rest-of-season ranked list — your roster and
   the wire in one order — and it was collapsed behind a "+" on a page framed as a waiver
   feed, so the most complete thing here was also the least likely to be seen. */
const boardOpen = ref(true)
// Canonical order only — which of these actually appear is decided by the league's own
// roster_positions inside buildFootballWire, so a league with no K/DEF slot never sees them.
const boardPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const boardPos = ref('RB') // which position the Full Board shows (one at a time)
// Positions that actually have players, in canonical order — drives the picker pills.
const boardPositionsWithRows = computed(() =>
  fbWire.value ? boardPositions.filter((p) => fbWire.value!.board[p]?.length) : [],
)
// Keep the selected pill on a position this league actually has — otherwise switching to a
// league without the current selection leaves the board rendering nothing.
watch(boardPositionsWithRows, (available) => {
  if (available.length && !available.includes(boardPos.value)) boardPos.value = available[0]
})

const teamModel = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value)
})
const rosterBodies = computed(() =>
  (teamModel.value?.rosterRows ?? []).map((r) => ({
    name: r.player.name, position: r.player.position, points: r.points, perGame: r.perGame, side: r.side, onIL: r.player.onIL,
  })),
)
const wire = computed(() => {
  if (!freeAgents.value.length) return null
  return buildPointsWire(freeAgents.value, valueOf.value, schedule.value, rosterBodies.value)
})

// Drop candidates: your weakest rostered bodies (lowest projected points).
const drops = computed(() => [...(teamModel.value?.rosterRows ?? [])].sort((a, b) => a.points - b.points).slice(0, 5))

const round = (n: number) => Math.round(n)
// Football's currency is per-week; baseball's is rest-of-season. Both the drop's
// points and the swap's upgrade need the same basis so the two stay comparable.
const dropDisplay = (s: Swap) => (isFootball.value ? s.dropPerGame : s.dropPoints)
const upgradeDisplay = (s: Swap) => (isFootball.value ? s.add.perGame - s.dropPerGame : s.upgrade)
// Injury badge (health) — separate from the onIL reserve-slot mechanic below, so a discounted
// but still-active injured body (DTD / status-only IL) isn't captioned as merely "lowest projected".
const injuryBadge = (injury: string) =>
  injury === 'il' ? { label: 'IL', cls: 'bg-[#FF5C5C]/15 text-[#FF5C5C]' }
  : injury === 'dtd' ? { label: 'DTD', cls: 'bg-amber-500/15 text-amber-400' }
  : null
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
// OR in usePointsValue's own loading (baseball's matchFG lands async, after the
// pool/free-agent fetch resolves) — otherwise the wire can flash empty for a beat.
const loading = computed(() => source.loading.value || source.freeAgentsLoading.value || valueLoading.value)
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">The Wire</h1>
      <p class="font-mono text-xs text-dark-textMuted">Your roster vs the wire &middot; rest of season</p>
    </header>

    <div v-if="loading && !wire" class="py-16 text-center text-dark-textMuted">Loading the wire…</div>
    <div v-else-if="!wire" class="py-16 text-center text-dark-textMuted">No free agents available right now.</div>

    <template v-else>
      <template v-if="!isFootball">
      <!-- 1. BEST UPGRADES — concrete add→drop swaps, the headline move -->
      <section v-if="wire.swaps.length" class="mb-5 rounded-xl border border-primary/40 bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-primary">★ Best upgrades</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">add a free agent, cut your weakest body — the points you'd gain</p>
        <template v-for="(s, i) in wire.swaps" :key="'sw-' + i">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
            <img v-if="s.add.player.headshot" :src="s.add.player.headshot" :alt="s.add.player.name" loading="lazy" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ s.add.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="text-sm text-dark-text">
                <span class="font-mono text-[10px] uppercase text-primary">add</span> <span class="font-semibold">{{ s.add.player.name }}</span>
                <span class="text-[11px] text-dark-textMuted"> {{ s.add.player.position }} · {{ s.add.player.team }}</span>
              </span>
              <span class="block text-xs text-dark-textMuted">
                <span class="font-mono text-[10px] uppercase">drop</span> {{ s.dropName }} <span class="opacity-60">({{ round(dropDisplay(s)) }})</span>
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="font-mono text-sm font-bold text-primary">+{{ round(upgradeDisplay(s)) }}</span>
              <span class="block font-mono text-[9px] uppercase text-dark-textMuted">{{ isFootball ? 'pts/wk' : 'pts ROS' }}</span>
            </span>
          </div>
        </template>
        <p class="mt-2 font-mono text-[9px] text-dark-textMuted">you'd make ONE of these · upgrade = add's projected points − the body you cut</p>
      </section>

      <!-- 2. STREAM THIS WEEK — the timely volume edge (baseball two-start/full-slate volume;
           meaningless for football's weekly schedule, so hidden there) -->
      <section v-if="!isFootball && (wire.twoStart.length || wire.hotBats.length)" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Stream this week</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">two-start arms and full-slate bats — the volume native apps don't flag</p>

        <div v-if="wire.twoStart.length" class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Two-start arms</div>
        <template v-for="r in wire.twoStart" :key="'ts-' + r.player.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">{{ r.player.name }}</span>
              <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                {{ r.player.position }} · <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
              </span>
            </span>
            <span class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ r.startsThisWeek }} starts</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(isFootball ? r.perGame : r.points) }}</span>
          </div>
        </template>

        <div v-if="wire.hotBats.length" class="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Full-slate bats</div>
        <template v-for="r in wire.hotBats" :key="'hb-' + r.player.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">{{ r.player.name }}</span>
              <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                {{ r.player.position }} · <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
              </span>
            </span>
            <span v-for="c in r.chips" :key="c" class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ c }}</span>
            <span class="shrink-0 rounded bg-dark-border/50 px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted">{{ r.gamesThisWeek }} games</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(isFootball ? r.perGame : r.points) }}</span>
          </div>
        </template>
      </section>

      <!-- 2. BEST AVAILABLE — rest-of-season value -->
      <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Best available <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· projected rest-of-season points</span>
        </h2>
        <template v-for="group in [{ label: 'Hitters', rows: wire.topHitters }, { label: 'Pitchers', rows: wire.topPitchers }]" :key="group.label">
          <div v-if="group.rows.length" class="mb-1 mt-3 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">{{ group.label }}</div>
          <template v-for="r in group.rows" :key="'ba-' + r.player.playerKey">
            <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
              <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
              <span class="min-w-0 flex-1">
                <span class="truncate text-sm font-semibold text-dark-text">{{ r.player.name }}</span>
                <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                  {{ r.player.position }} · <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 object-contain" /> {{ r.player.team }}
                </span>
              </span>
              <span v-for="c in r.chips" :key="c" class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ c }}</span>
              <span class="w-16 shrink-0 text-right">
                <span class="font-mono text-sm font-semibold text-dark-text">{{ round(isFootball ? r.perGame : r.points) }}</span>
                <span v-if="!isFootball" class="ml-1 font-mono text-[10px] text-dark-textMuted">{{ r.perGame.toFixed(1) }}/g</span>
                <span v-else class="ml-1 font-mono text-[10px] text-dark-textMuted">/wk</span>
              </span>
            </div>
          </template>
        </template>
      </section>

      <!-- 3. DROP TO MAKE ROOM -->
      <section v-if="drops.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Drop to make room</h2>
        <template v-for="r in drops" :key="'dr-' + r.player.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="min-w-0 flex-1 truncate text-sm text-dark-text">
              {{ r.player.name }}
              <span class="ml-1 text-[11px] text-dark-textMuted">{{ r.player.position }} · {{ r.player.proTeam }}</span>
              <span v-if="injuryBadge(r.injury)" class="ml-1 rounded px-1 py-0.5 font-mono text-[9px] uppercase" :class="injuryBadge(r.injury)!.cls">{{ injuryBadge(r.injury)!.label }}</span>
              <span class="ml-1 text-[11px] text-dark-textMuted/70">{{ r.player.onIL ? "won't free an active spot" : 'lowest projected' }}</span>
            </span>
            <span class="font-mono text-[10px] uppercase text-dark-textMuted">{{ r.tier }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-textMuted">{{ round(isFootball ? r.perGame : r.points) }}</span>
          </div>
        </template>
        <p class="mt-3 font-mono text-[10px] text-dark-textMuted">your lowest-projecting rostered bodies — cut one of these for an add above</p>
      </section>
      </template>

      <template v-if="isFootball">
        <div v-if="fbLoading && !fbWire" class="py-10 text-center text-sm text-dark-textMuted">Loading league values…</div>
        <div v-else-if="!fbWire" class="py-10 text-center text-dark-textMuted">No free agents available right now.</div>

        <SeasonPassGate
          v-else-if="!hasFullAccess"
          headline="Who to add, and who to cut"
          body="Standings, power rankings and your league history stay free for every league you're in. This is the waiver call: what clears your roster, what it costs you, and the body to drop for it."
          cta="Unlock the wire — $39"
        />

        <template v-else>
          <!--
            One card, folded, carrying the verdict either way — the same shape This Week gives
            start/sit. "No add worth a drop" is a real answer rather than an empty state to
            hide, so it keeps its own headline; what folds is the working behind it (the rows,
            or the who-to-cut chips). Both used to sit open above the board and pushed the
            thing you actually browse off the bottom of the page.
          -->
          <section class="mb-5 rounded-xl border bg-dark-card"
                   :class="fbWire.upgrades.length ? 'border-primary/40' : 'border-dark-border'">
            <button class="flex w-full items-center justify-between gap-3 p-4" @click="movesOpen = !movesOpen">
              <span class="min-w-0 text-left">
                <!-- One verdict. There were two cards here — "no add worth a drop" and
                     "nothing clears your roster" — the same finding stated twice, each behind
                     its own fold, leaving a reader to reconcile two headlines that could never
                     disagree with each other. -->
                <span v-if="fbWire.upgrades.length" class="font-display text-xs font-semibold uppercase tracking-wide text-primary">
                  ★ {{ fbWire.upgrades.length }} pickup{{ fbWire.upgrades.length > 1 ? 's' : '' }} worth making
                  <span class="font-mono text-[10px] normal-case text-dark-textMuted">
                    · +{{ round(fbWire.upgrades.reduce((t, s) => t + s.marginal, 0)) }} lineup pts on the table
                  </span>
                </span>
                <span v-else-if="bestAboveReplacement" class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textSecondary">
                  {{ bestAboveReplacement }} above replacement, none worth a drop
                  <span class="font-mono text-[10px] normal-case text-dark-textMuted">· best +{{ round(bestTopValue) }}</span>
                </span>
                <span v-else class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
                  ✓ Nothing on the wire clears your roster
                </span>
                <span class="mt-0.5 block font-mono text-[10px] text-dark-textMuted/70">
                  best available · what it would cost you<template v-if="cutCandidates.length"> · who to cut</template>
                </span>
              </span>
              <span class="shrink-0 font-mono text-dark-textMuted">{{ movesOpen ? '−' : '+' }}</span>
            </button>

            <div v-if="movesOpen" class="border-t border-dark-border/40 px-4 pb-4 pt-3">
              <template v-if="fbWire.upgrades.length">
                <div v-for="(s, i) in fbWire.upgrades" :key="'fbup-' + i"
                     class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
                  <img :src="teamLogo(s.add.player.team)" alt="" @error="onLogoErr" class="h-6 w-6 shrink-0 object-contain" />
                  <span class="min-w-0 flex-1">
                    <span class="text-sm text-dark-text">
                      <span class="font-mono text-[10px] uppercase text-primary">add</span> <span class="font-semibold">{{ s.add.player.name }}</span>
                      <span class="text-[11px] text-dark-textMuted"> {{ s.add.player.position }} · {{ s.add.player.team }}</span>
                    </span>
                    <span class="block text-xs text-dark-textMuted">
                      <span class="font-mono text-[10px] uppercase">drop</span> {{ s.dropName }}
                    </span>
                  </span>
                  <span class="shrink-0 text-right">
                    <span class="font-mono text-sm font-bold text-primary">+{{ round(s.marginal) }}</span>
                    <span class="block font-mono text-[9px] uppercase text-dark-textMuted">lineup pts</span>
                  </span>
                </div>
              </template>
              <template v-else-if="cutCandidates.length">
                <p class="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">If you add anyway, cut from here</p>
                <div class="flex flex-wrap gap-2">
                  <span v-for="c in cutCandidates" :key="'cut-' + c.playerKey"
                        class="rounded bg-dark-bg px-2 py-1 font-mono text-[11px] text-dark-textSecondary">
                    {{ c.name }} <span class="text-dark-textMuted/70">{{ c.position }} · {{ c.vorRos >= 0 ? '+' : '' }}{{ round(c.vorRos) }}</span>
                  </span>
                </div>
              </template>
              <p v-else class="font-mono text-[10px] text-dark-textMuted">
                Nothing available beats a body already in your lineup, so there's no cut to make this week.
              </p>
            </div>

              <!-- The wire's top, inside the same fold as the verdict about it, because the
                   verdict IS about this list. -->
              <div class="mt-4 border-t border-dark-border/40 pt-3">
            <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
                Best available
              </h2>

            </div>
            <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
              <!-- Say the scope out loud: the list drives this card, the board below it and the
                   add/drop verdict above it, so naming only this card would understate it. -->
              <template v-if="dynasty.ready.value && wireSort === 'dynasty'">{{ dynasty.sourceName.value === 'UFD' ? 'dynasty market order' : dynasty.sourceName.value + "'s dynasty order" }} · our season points still shown at right</template>
              <template v-else-if="rosSource !== 'UFD'">{{ rosSource }}'s order, our points — drives this page</template>
              <template v-else>value over replacement (season)</template>
            </p>
            <template v-for="r in sortedBest.slice(0, 15)" :key="'fbba-' + (r.player.playerKey ?? r.player.name)">
              <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
                <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
                <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
                <span class="min-w-0 flex-1">
                  <span class="truncate text-sm font-semibold text-dark-text">
                    {{ r.player.name }}
                    <span v-if="r.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400" title="Healthy backup — the starter ahead of him is injured">step-up</span>
                    <span v-if="r.confidence === 'low'" class="ml-1 font-mono text-[10px] text-amber-400" title="Thin or absent projection">⚠</span>
                  </span>
                  <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                    {{ r.player.position }} · <img :src="teamLogo(r.player.team)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ r.player.team }}
                  </span>
                </span>
                <!-- Where the two horizons disagree, say which way. A 22-year-old the market
                     likes and the projection does not is the entire dynasty waiver thesis. -->
                <span v-if="dynasty.ready.value" class="hidden w-24 shrink-0 text-right sm:block">
                  <span class="block font-mono text-[11px]" :class="dynTone(dynRow(r.player.playerKey))">
                    {{ dynRow(r.player.playerKey) ? 'DYN ' + r.player.position + dynRow(r.player.playerKey)!.positionRank : '—' }}
                  </span>
                  <span v-if="dynRow(r.player.playerKey) && LEAN_LABEL[dynRow(r.player.playerKey)!.lean].text"
                        class="block font-mono text-[9px] uppercase tracking-wide"
                        :class="LEAN_LABEL[dynRow(r.player.playerKey)!.lean].cls">
                    {{ LEAN_LABEL[dynRow(r.player.playerKey)!.lean].text }}<template v-if="dynRow(r.player.playerKey)!.age"> &middot; {{ Math.floor(dynRow(r.player.playerKey)!.age!) }}</template>
                  </span>
                </span>
                <span class="w-12 shrink-0 text-right font-mono text-sm font-semibold" :class="r.vorRos >= 0 ? 'text-dark-text' : 'text-dark-textMuted'">{{ r.vorRos >= 0 ? '+' : '' }}{{ round(r.vorRos) }}</span>
              </div>
            </template>
            </div>
          </section>

          <!-- 4. FULL BOARD — every player by position, VOR-ranked, yours highlighted -->
          <section class="rounded-xl border border-dark-border bg-dark-card p-4">
            <button class="flex w-full items-center justify-between font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted" @click="boardOpen = !boardOpen">
              <span>Full board <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· your roster vs the wire</span></span>
              <span class="font-mono">{{ boardOpen ? '−' : '+' }}</span>
            </button>
            <div v-if="boardOpen" class="mt-3">
              <!-- position picker -->
              <div class="mb-3 flex flex-wrap gap-1.5">
                <button
                  v-for="pos in boardPositionsWithRows"
                  :key="pos"
                  class="rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
                  :class="boardPos === pos ? 'bg-primary/20 text-primary' : 'bg-dark-bg text-dark-textMuted hover:text-dark-text'"
                  @click="boardPos = pos"
                >
                  {{ pos }}
                </button>
              </div>
              <!-- legend: the board mixes three states and only one of them used to be visible -->
              <div class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-wide text-dark-textMuted">
                <span><span class="text-primary">★</span> yours</span>
                <span><span class="text-[#4ade80]">●</span> free agent</span>
                <span><span class="text-dark-textMuted/50">●</span> rostered elsewhere</span>
                <span v-if="dynasty.ready.value" class="hidden sm:inline">
                  this season &middot; <span class="text-dark-textSecondary">dynasty</span> &middot;
                  <span class="text-[#7ee787]">buy-low</span>/<span class="text-[#e69a4a]">sell-high</span> when they disagree by {{ RANK_GAP_MIN }}+ &middot;
                  age <span class="text-[#7ee787]">rising</span>/<span class="text-[#d29922]">ageing</span>/<span class="text-[#f85149]">old</span> for the position &middot;
                  <span class="text-[#f85149]">falling</span> = the market just moved him, so the gap is news
                </span>
                <span v-if="dynasty.ready.value && wireSort === 'dynasty'" class="hidden text-dark-textMuted/50 sm:inline">
                  tier cliffs are season point drops — hidden in this order
                </span>
                <!-- Both controls together, once. They were two dropdowns in two cards that
                     from the reader's seat asked the same question — which ranking am I
                     looking at — and one of them lived inside a card that is folded shut. -->
                <span class="ml-auto flex items-center gap-2">
                  <span v-if="dynasty.ready.value" class="flex items-center gap-0.5 rounded-lg border border-dark-border p-0.5">
                    <button v-for="opt in WIRE_SORTS" :key="'bd-' + opt.key"
                            class="rounded-md px-2 py-0.5 uppercase tracking-wider transition-colors"
                            :class="wireSort === opt.key ? 'bg-primary/15 font-bold text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                            :title="opt.hint"
                            @click="wireSort = opt.key">{{ opt.label }}</button>
                  </span>
                  <RankingPicker :kind="wireSort === 'dynasty' ? 'dynasty' : 'ros'" />
                </span>
              </div>
              <!-- selected position only, top 25 by VOR -->
              <template v-for="row in sortedBoard.slice(0, 25)" :key="'fbbd-' + row.playerKey">
                <!-- tier cliff: the drop-off is the decision, so name it rather than leaving a flat list -->
                <div v-if="row.tierBreak && wireSort === 'season'" class="flex items-center gap-2 py-1.5">
                  <span class="h-px flex-1 bg-dark-border"></span>
                  <span class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">
                    tier {{ row.tier }} &middot; &minus;{{ round(row.tierDrop ?? 0) }} pts
                  </span>
                  <span class="h-px flex-1 bg-dark-border"></span>
                </div>
                <div class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm last:border-0" :class="row.owned ? 'text-primary' : row.free ? 'text-dark-text' : 'text-dark-textMuted'">
                  <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
                  <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
                  <span class="min-w-0 flex-1 truncate">
                    {{ row.owned ? '★ ' : '' }}{{ row.name }}
                    <!-- A season-long call still has to survive Sunday: don't cut a player who
                         is playing for one who is idle without seeing it. -->
                    <span v-if="row.bye" class="ml-1 font-mono text-[9px] uppercase text-[#FF5C5C]">bye</span>
                  </span>
                  <span
                    v-if="!row.owned"
                    class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                    :class="row.free ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-dark-bg text-dark-textMuted/60'"
                  >{{ row.free ? 'free' : 'rostered' }}</span>
                  <img v-if="row.team" :src="teamLogo(row.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
                  <!--
                    The second horizon. Only in dynasty leagues, and only for players the
                    market actually priced — an unpriced player shows an em dash, because a
                    zero here would sort a real body last and read as a verdict we never made.
                  -->
                  <template v-if="dynasty.ready.value">
                    <!-- Season rank, so the dynasty rank beside it is a like-for-like
                         comparison rather than a rank sitting next to a point total. -->
                    <span class="hidden w-9 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/70 sm:inline">
                      {{ seasonRankByKey.get(row.playerKey) ? row.position + seasonRankByKey.get(row.playerKey) : '' }}
                    </span>
                    <span class="hidden w-9 shrink-0 text-right font-mono text-[10px] sm:inline"
                          :class="dynTone(dynRow(row.playerKey))"
                          :title="dynRow(row.playerKey) ? `Dynasty market: ${row.position}${dynRow(row.playerKey)!.positionRank}, overall ${dynRow(row.playerKey)!.overallRank}` : 'Not priced by the dynasty market'">
                      {{ dynRow(row.playerKey) ? row.position + dynRow(row.playerKey)!.positionRank : '—' }}
                    </span>
                    <!-- The gap, named. This is the whole reason both rankings are here. -->
                    <span class="hidden w-16 shrink-0 text-right font-mono text-[9px] uppercase tracking-wide lg:inline"
                          :class="rankGap(row.playerKey)?.tag
                            ? GAP_CLS[rankGap(row.playerKey)!.tag]
                            : MOMENTUM_CLS[rankGap(row.playerKey)?.momentum ?? 'steady']"
                          :title="rankGap(row.playerKey)
                            ? (rankGap(row.playerKey)!.momentum !== 'steady'
                                ? `The dynasty market has moved him sharply in the last 30 days — this gap is news, not a mispricing.`
                                : `${row.position}${rankGap(row.playerKey)!.season} this season vs ${row.position}${rankGap(row.playerKey)!.dyn} in the dynasty market`)
                            : ''">
                      {{ rankGap(row.playerKey)?.tag
                         || (rankGap(row.playerKey)?.momentum !== 'steady' ? rankGap(row.playerKey)?.momentum : '') }}
                    </span>
                    <!-- Age, read against the position. 28 is late for a back and prime for
                         a receiver, and the board used to print both as "28". -->
                    <span class="hidden w-6 shrink-0 text-right font-mono text-[10px] md:inline"
                          :class="AGE_TONE[readAge(row.position, dynRow(row.playerKey)?.age)?.phase ?? 'prime']"
                          :title="readAge(row.position, dynRow(row.playerKey)?.age)?.detail ?? ''">
                      {{ dynRow(row.playerKey)?.age ? Math.floor(dynRow(row.playerKey)!.age!) : '' }}
                    </span>
                  </template>
                  <span v-if="row.unprojected" class="w-10 shrink-0 text-right font-mono text-[10px] italic text-dark-textMuted/50">no proj</span>
                  <span v-else class="w-10 shrink-0 text-right font-mono text-xs" :class="row.vorRos >= 0 ? '' : 'text-dark-textMuted'">{{ row.vorRos >= 0 ? '+' : '' }}{{ round(row.vorRos) }}</span>
                </div>
              </template>
              <p v-if="(fbWire.board[boardPos]?.length ?? 0) > 25" class="mt-2 font-mono text-[9px] text-dark-textMuted">
                top 25 of {{ fbWire.board[boardPos].length }} {{ boardPos }} — the rest are deep below replacement
              </p>
            </div>
          </section>
        </template>
      </template>
    </template>
  </div>
</template>
