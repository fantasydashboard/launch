<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { buildPointsWire, type Swap } from '@/myteam/pointsWire'
import { buildPointsTeam } from '@/myteam/pointsTeam'
import { usePointsValue } from '@/composables/usePointsValue'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'
import { nflTeamLogo } from '@/players/nflTeamLogo'
import { nhlTeamLogo } from '@/players/nhlTeamLogo'
import { wordsFor } from '@/lib/sportWords'
import { useFootballWire } from '@/composables/useFootballWire'
import RankingPicker from '@/components/RankingPicker.vue'
import { getWeeklyUsage, type UsageByKey } from '@/services/playerUsage'
import { buildWaiverTargets } from '@/football/waiverTargets'
import { getSeasonLines } from '@/services/playerUsage'
import { useDynastyValues } from '@/composables/useDynastyValues'
import SeasonPassGate from '@/components/SeasonPassGate.vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { publicWeeksLeft } from '@/composables/usePublicRankings'

const leagueStore = useLeagueStore()
/* The waiver call is one of the four the Season Pass sells, and it was fully readable by
   anyone who had not signed in — the Draft Room was honouring the wall on its own. */
const { hasFullAccess, accessKnown, accessCheckFailed } = useFeatureAccess()
const isFootball = computed(() => leagueStore.activeSport === 'football')
const isHockey = computed(() => leagueStore.activeSport === 'hockey')
const words = computed(() => wordsFor(leagueStore.activeSport))
const titleCase = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
/* Three sports now, so the binary had to go: hockey was falling through to the MLB map and
   asking the CDN for a baseball logo named COL or DAL. Some of those exist, which is worse
   than none — a hockey board would have shown the Rockies beside Nathan MacKinnon. */
const teamLogo = (abbr?: string) =>
  isFootball.value ? nflTeamLogo(abbr) : isHockey.value ? nhlTeamLogo(abbr) : mlbTeamLogo(abbr)

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
/* Needed so a rostered player on the board can say which team holds him. */
const teamNames = source.teamNames

/*
 * The waiver board: whose role changed last week, and whether you can have him.
 *
 * Distinct from Best Available directly below it, which ranks free agents by rest-of-season
 * value — "who is the best player nobody owns". A waiver claim asks something narrower: whose
 * workload just changed. Those diverge constantly, and only the second is worth a bid.
 *
 * Snap share comes from Sleeper's stats for the completed week; the bid comes from what the
 * pickup does to THIS lineup, which is the half a published FAAB range structurally cannot
 * know.
 */
/* Declared before anything that reads them: lastCompletedWeek derives from seasonLines, and
   its watcher runs immediately — reading a ref that had not been initialised yet is a
   dead-zone crash on page load, not a lint nit. */
const seasonLines = ref<Awaited<ReturnType<typeof getSeasonLines>>>([])
const seasonYear = computed(() => new Date().getFullYear())

const usage = ref<UsageByKey>({})
/*
 * The most recent week that actually produced points.
 *
 * Not `currentWeek - 1`, which was the first guess and is wrong in the window that matters: a
 * league stays on a week until the next opens, so on the Tuesday after week one that
 * expression is zero and every column depending on it renders blank — exactly when the data
 * has just arrived and is most wanted.
 *
 * Read off the lines instead, which drop unplayed weeks, so this is self-correcting and needs
 * no guess about when a week ends.
 */
const lastCompletedWeek = computed(() =>
  Math.max(0, ...seasonLines.value.map((l) => l.week)))

watch([lastCompletedWeek, () => leagueStore.activeSport], async () => {
  if (!isFootball.value || lastCompletedWeek.value < 1) { usage.value = {}; return }
  usage.value = await getWeeklyUsage(new Date().getFullYear(), lastCompletedWeek.value)
}, { immediate: true })

/* What each add would do to your starting lineup, reusing the swap the Wire already solves. */
const gainByKey = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {}
  for (const u of fbWire.value?.upgrades ?? []) {
    const k = u.add.player.playerKey ?? `fa:${u.add.player.name}`
    out[k] = Math.max(out[k] ?? 0, u.marginal)
  }
  return out
})
watch([() => leagueStore.currentWeek, () => leagueStore.activeSport], async () => {
  if (!isFootball.value) { seasonLines.value = []; return }
  /* Through the CURRENT week, not the one before it — a league stays on a week until the next
     opens, so week one's results are only reachable by asking for week one. Unplayed weeks
     come back empty and are dropped by the fetch. */
  seasonLines.value = await getSeasonLines(seasonYear.value, leagueStore.currentWeek ?? 1)
}, { immediate: true })

const weeksLeft = computed(() => publicWeeksLeft(leagueStore.currentWeek ?? 1))
const waiverTargets = computed(() => {
  if (!Object.keys(usage.value).length) return []
  /* Every player the league can see, so a pickup that has already gone can still be named. */
  const rows = Object.values(fbWire.value?.board ?? {}).flat()
  const seen = new Set<string>()
  const players = rows.filter((r) => (seen.has(r.playerKey) ? false : seen.add(r.playerKey)))
  return buildWaiverTargets({
    players: players.map((r) => ({
      playerKey: r.playerKey, name: r.name, position: r.position, team: r.team,
      headshot: r.headshot, vorRos: r.vorRos, owned: r.owned, free: r.free,
      ownerName: r.ownerName,
    })),
    usage: usage.value,
    gainByKey: gainByKey.value,
    weeksLeft: weeksLeft.value,
    limit: 10,
  })
})

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
  leagueId: computed(() => String(leagueStore.activeLeagueId ?? '')),
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
  weeksLeft,
  teamNames,
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
  /* Out for the next game, not the season — its own badge, because it now carries its own
     meaning: he still holds his seat in every rest-of-season number on the page. */
  : injury === 'out' ? { label: 'OUT', cls: 'bg-[#FF5C5C]/15 text-[#FF5C5C]' }
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
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">two-start {{ words.goalies }} and full-slate {{ words.skaters }} — the volume native apps don't flag</p>

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

        <div v-if="wire.hotBats.length" class="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Full-slate {{ words.skaters }}</div>
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

      <!--
        The waiver board. Sits above Best Available because it answers the more urgent
        question: Best Available ranks free agents by rest-of-season value — who is the best
        player nobody owns — while this asks whose ROLE changed last week, which is what a
        waiver claim is actually a bet on.

        Taken players are kept and greyed rather than filtered out. The week's best pickup
        going to the team you are chasing is a trade target, and a board that silently omits
        him leaves the reader wondering whether we missed him.
      -->
      <section v-if="waiverTargets.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Waiver board
          <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
            &middot; who took over in week {{ lastCompletedWeek }}
          </span>
        </h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          snap share, not points &mdash; a big game on four touches does not repeat, a starter's workload does
        </p>

        <template v-for="t in waiverTargets" :key="'wt-' + t.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0"
               :class="t.availability === 'free' ? '' : 'opacity-45'">
            <img v-if="t.headshot" :src="t.headshot" :alt="t.name" loading="lazy" @error="onLogoErr"
                 class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover"
                 :class="t.availability === 'free' ? '' : 'grayscale'" />
            <span v-else class="h-8 w-8 shrink-0 rounded-full bg-dark-border" />
            <img v-if="t.team" :src="teamLogo(t.team)" alt="" @error="onLogoErr"
                 class="hidden h-3.5 w-3.5 shrink-0 object-contain sm:block" />

            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold"
                    :class="t.availability === 'free' ? 'text-dark-text' : 'text-dark-textMuted'">
                {{ t.name }}
                <span v-if="t.availability === 'mine'"
                      class="ml-1 font-mono text-[9px] uppercase text-primary">yours</span>
              </span>
              <span class="block font-mono text-[10px] text-dark-textMuted">
                {{ t.position }}<template v-if="t.snapShare !== null"> &middot; {{ Math.round(t.snapShare * 100) }}% snaps</template>
                &middot; {{ t.touches }} touches &middot; {{ round(t.points) }} pts
              </span>
            </span>

            <!-- The bid, and why. A bare percentage is what every published table already
                 prints; the reason is what makes it this reader's number. -->
            <span class="w-32 shrink-0 text-right">
              <span v-if="t.availability === 'free' && t.bidPct > 0"
                    class="block font-mono text-sm font-bold text-primary">bid {{ t.bidPct }}%</span>
              <span v-else-if="t.availability === 'taken'"
                    class="block font-mono text-[10px] text-[#e69a4a]">{{ t.ownerName || 'rostered' }}</span>
              <span v-else class="block font-mono text-[10px] text-dark-textMuted/70">&mdash;</span>
              <span class="block font-mono text-[9px] leading-tight text-dark-textMuted/70">{{ t.bidReason }}</span>
            </span>
          </div>
        </template>

        <p class="mt-3 font-mono text-[9px] leading-relaxed text-dark-textMuted">
          Bid is a share of a season FAAB budget, from what he would add to <em>your</em> starting
          lineup &mdash; so the same player is worth real money to one manager and nothing to another.
          It is what he is worth to you, not what he will cost.
        </p>
      </section>

      <!-- 2. BEST AVAILABLE — rest-of-season value -->
      <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Best available <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· projected rest-of-season points</span>
        </h2>
        <template v-for="group in [{ label: titleCase(words.skaters), rows: wire.topHitters }, { label: titleCase(words.goalies), rows: wire.topPitchers }]" :key="group.label">
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
        <!--
          THE FULL BOARD MOVED TO /rankings, AND THE POINTER TO IT IS FREE.

          It was a reference work living on a transaction page. Every other block here is a
          player you can act on today — yours to drop, or a free agent to add — and the board
          was a league-wide ranked list including players nobody can have, which is a
          different job. It is free there, and open to people without an account — which this
          card has to say before the paywall below decides whether the reader sees anything
          else, not after, or only a subscriber ever hears the board is free.
        -->
        <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
          <RouterLink to="/rankings" class="flex w-full items-center justify-between">
            <span class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
              Full board
              <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
                &middot; every player, ranked and tiered
              </span>
            </span>
            <span class="font-mono text-[11px] text-primary">Rankings &rarr;</span>
          </RouterLink>
        </section>

        <div v-if="fbLoading && !fbWire" class="py-10 text-center text-sm text-dark-textMuted">Loading league values…</div>
        <div v-else-if="!fbWire" class="py-10 text-center text-dark-textMuted">No free agents available right now.</div>

        <div v-else-if="!accessKnown" class="py-10 text-center text-sm text-dark-textMuted">
          {{ accessCheckFailed ? 'Could not check your subscription just now — reload to try again.' : 'Checking your access…' }}
        </div>

        <SeasonPassGate
          v-else-if="accessKnown && !hasFullAccess"
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

              <!--
                The wire's top, inside the same fold as the verdict about it, because the
                verdict IS about this list.
                
                It was not. The </div> closing this fold sat immediately above, so the list
                rendered as a sibling and showed whether the panel was open or shut — the
                header promised "best available" behind a +, and the best available was already
                spread down the page beneath it.
              -->
              <div class="mt-4 border-t border-dark-border/40 pt-3">
            <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
                Best available
              </h2>

              <!--
                The two controls that say which ranking you are reading, together, on the card
                whose caption below announces one of them drives the page. They used to sit in
                the full board's legend; the board moved to /rankings and these did not follow
                it, because they govern this page — the picker re-seats every add/drop verdict
                above, and the toggle re-sorts the list immediately below.
              -->
              <span class="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wide">
                <span v-if="dynasty.ready.value" class="flex items-center gap-0.5 rounded-lg border border-dark-border p-0.5">
                  <button v-for="opt in WIRE_SORTS" :key="'ba-' + opt.key"
                          class="rounded-md px-2 py-0.5 uppercase tracking-wider transition-colors"
                          :class="wireSort === opt.key ? 'bg-primary/15 font-bold text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                          :title="opt.hint"
                          @click="wireSort = opt.key">{{ opt.label }}</button>
                </span>
                <RankingPicker :kind="wireSort === 'dynasty' ? 'dynasty' : 'ros'" />
              </span>
            </div>
            <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
              <!-- Say the scope out loud: the list drives this card, the board below it and the
                   add/drop verdict above it, so naming only this card would understate it. -->
              <template v-if="dynasty.ready.value && wireSort === 'dynasty'">{{ dynasty.sourceName.value === 'UFD' ? 'dynasty market order' : dynasty.sourceName.value + "'s dynasty order" }} · our season points still shown at right</template>
              <template v-else-if="rosSource !== 'UFD'">{{ rosSource }}'s order, our points — drives this page</template>
              <template v-else>value over replacement (season)</template>
            </p>
            <template v-for="(r, i) in sortedBest.slice(0, 15)" :key="'fbba-' + (r.player.playerKey ?? r.player.name)">
              <!--
                Where the list stops being "best available" and starts being "everyone else".
                Thirteen of the fifteen rows under that heading were below replacement — worse
                than a body you could have for nothing — which is not a shortlist, it is the
                wire in descending order wearing a shortlist's title. The header already says
                how many clear the bar; this is where the reader can see it.
              -->
              <div v-if="r.vorRos < 0 && (i === 0 || sortedBest[i - 1].vorRos >= 0)"
                   class="flex items-center gap-2 pt-3 pb-1">
                <span class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/60">below replacement</span>
                <span class="h-px flex-1 bg-dark-border/40" />
              </div>
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
            </div>
          </section>
        </template>
      </template>
    </template>
  </div>
</template>
