<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useDraftRoom } from '@/composables/useDraftRoom'
import { UFD_LABEL } from '@/composables/useCustomRankings'
import { nflTeamLogo } from '@/players/nflTeamLogo'
import { startablePositions } from '@/draft/room/rosterNeed'
import { rankTone } from '@/draft/room/slotRanks'
import { tierCliffs } from '@/draft/room/tierCliffs'
import { positionBadge, positionCell } from '@/players/positionColors'

const {
  status, loading, board, recommendation, myPick, myNextPick, isMyTurn,
  currentOverallPick, hasHistory, myPicks, myLineup, starterSlots, slotUnknown,
  markDrafted, syncHealthy, refresh, shape,
  grid, teamNameForSlot, connectDraft, disconnectDraft, overrideDraftId, overrideError,
  customRankings, replay, recap, history, teamAvatarForSlot, slotRanks, rankIfDrafted, comparePool,
  draftedKeys, draftedRows, boardByRank, boardTierByKey, listRankByKey, effectiveSlots, mySlot,
} = useDraftRoom()

// Admin-only analyst override. Invisible to every other account.
const showRankings = ref(false)
const comparison = computed(() => customRankings.compare(comparePool.value))

type Tab = 'pick' | 'board' | 'grid' | 'roster' | 'recap' | 'replay' | 'history'
const tab = ref<Tab>('pick')
const TABS: { id: Tab; label: string }[] = [
  { id: 'pick', label: 'Pick' },
  { id: 'board', label: 'Board' },
  { id: 'grid', label: 'Draft Board' },
  { id: 'roster', label: 'Roster' },
]
/** Recap and Replay only mean anything once a draft is finished. */
const visibleTabs = computed(() => [
  ...TABS,
  ...(recap.value ? [{ id: 'recap' as Tab, label: 'Recap' }] : []),
  ...(replay.value ? [{ id: 'replay' as Tab, label: 'Replay' }] : []),
  ...(history.records.value.length ? [{ id: 'history' as Tab, label: 'History' }] : []),
])

/** Mocks and league nights are different rooms; the summary never mixes them. */
const historyKind = ref<'all' | 'league' | 'mock'>('all')
const historyRecords = computed(() =>
  historyKind.value === 'all' ? history.records.value : history.records.value.filter((r) => r.kind === historyKind.value),
)
const historySummary = computed(() =>
  history.summaryFor(historyKind.value === 'all' ? undefined : historyKind.value),
)
const historyCalibration = computed(() =>
  history.calibrationFor(historyKind.value === 'all' ? undefined : historyKind.value),
)
const shortDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
// The draft ending is the one moment worth moving the user for.
watch(() => !!recap.value, (done) => { if (done) tab.value = 'recap' })

const edgeRows = computed(() =>
  Object.entries(recap.value?.positionEdge ?? {})
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => Math.abs(v) >= 1),
)

// Connect any Sleeper draft by link or ID — mocks included.
const draftInput = ref('')
const showConnect = ref(false)
function submitConnect() {
  if (connectDraft(draftInput.value)) {
    draftInput.value = ''
    showConnect.value = false
  }
}

const gridEl = ref<HTMLElement | null>(null)
const myColEl = ref<HTMLElement | null>(null)
/** Your own column is the one you look at most; make sure it is on screen. */
function scrollToMySeat() {
  nextTick(() => {
    const col = myColEl.value
    const box = gridEl.value
    if (!col || !box) return
    box.scrollLeft = Math.max(0, col.offsetLeft - box.clientWidth / 2 + col.clientWidth / 2)
  })
}
watch(() => tab.value, (t) => { if (t === 'grid') scrollToMySeat() })
watch(() => mySlot.value, () => { if (tab.value === 'grid') scrollToMySeat() })

const round = (n: number) => Math.round(n)
// Clamped: a simulation that ran 600 times cannot honestly report 0% or 100%,
// and measurement showed players displayed at 0% lasting a tenth of the time.
const pct = (n: number) => `${Math.min(99, Math.max(1, Math.round(n * 100)))}%`
const teamLogo = (abbr?: string) => nflTeamLogo(abbr)
const onImgErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')

/** Pick label like 2.04 — how drafters actually refer to picks. */
const pickLabel = computed(() => {
  const p = myPick.value ?? currentOverallPick.value
  const teams = shape.value?.teams ?? 12
  const r = Math.ceil(p / teams)
  const inRound = ((p - 1) % teams) + 1
  return `${r}.${String(inRound).padStart(2, '0')}`
})

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'LAST'] as const
const posFilter = ref<(typeof POSITIONS)[number]>('ALL')
/**
 * Only positions this league actually starts. A tab full of kickers in a league
 * with no kicker slot is a page of players you cannot use.
 */
const visiblePositions = computed(() => {
  const startable = startablePositions(effectiveSlots.value ?? {})
  return POSITIONS.filter((p) => p === 'ALL' || p === 'LAST' || startable.has(p))
})
const filterLabel = (p: string) => (p === 'ALL' ? 'all' : p === 'LAST' ? "won't last" : p)

const posClass = positionBadge
const cellClass = positionCell

/** How deep the "players you'd realistically take here" cut runs. */
const CONTENDERS = 24

// The Board renders the active list in ITS order — the analyst's, or UFD's.
// Filtering by position keeps that order within the position.
/**
 * Drafted players are hidden by default — the board answers "who can I take".
 * Showing them is for the other question: where a run happened and what it cost
 * you, which you can only see with the gaps filled back in.
 */
const showDrafted = ref(false)
const visibleBoard = computed(() => {
  if (posFilter.value === 'LAST') {
    // Urgency is the one ordering the list's own order cannot express.
    //
    // Drawn only from players actually in contention for this pick. Ranked by
    // edge, everyone below that cut is someone you would not take at any price,
    // so warning that he is about to go is noise dressed as urgency.
    return board.value
      .slice(0, CONTENDERS)
      .filter((r) => SKILL.has(r.position) && r.survival < 0.7)
      .sort((a, b) => a.survival - b.survival)
  }
  const rows = posFilter.value === 'ALL'
    ? boardByRank.value
    : boardByRank.value.filter((r) => r.position === posFilter.value)
  if (!showDrafted.value) return rows.slice(0, 60)

  // Drafted players are slotted back in at their list rank, so the board reads
  // as it did before the run went through — that is the whole point of showing
  // them. They carry a `takenAt` so a row can render as spent.
  const taken = Object.values(draftedRows.value)
    .filter((d) => posFilter.value === 'ALL' || d.position === posFilter.value)
    .map((d) => ({
      ...d, value: d.projected, vona: 0, vonaPoints: 0, upside: 0, score: 0,
      needFactor: 1, survival: 0, tier: 0, overallTier: 0, flag: '' as const, adp: null,
      takenAt: d.overallPick,
    }))
  const rank = (key: string) => listRankByKey.value[key] ?? Number.MAX_SAFE_INTEGER
  return [...rows, ...taken]
    .sort((a, b) => rank(a.playerKey) - rank(b.playerKey))
    .slice(0, 90)
})
/**
 * Tier headers only make sense when the list is ordered by tier, which is the
 * position-filtered view. The unfiltered board is ordered by SCORE, so tier
 * headers there read 1, 2, 3, 6, 3 going down the page — repeating and going
 * backwards. There the tier belongs on the row instead.
 */
// The board is ordered by list rank now, so tier SECTIONS would cut across it
// arbitrarily. Tier rides on each row instead.
/**
 * A band wherever the tier changes going down the list. Only meaningful when the
 * list is in its own order — the won't-last lens is sorted by urgency, which cuts
 * across tiers arbitrarily.
 */
const tierOf = (key: string) => boardTierByKey.value[key]
function isTierHeader(i: number): boolean {
  if (posFilter.value === 'LAST') return false
  const rows = visibleBoard.value
  const cur = tierOf(rows[i].playerKey)
  if (cur === undefined) return false
  if (i === 0) return true
  return tierOf(rows[i - 1].playerKey) !== cur
}
function tierCount(i: number): number {
  const t = tierOf(visibleBoard.value[i].playerKey)
  return visibleBoard.value.filter((r) => tierOf(r.playerKey) === t).length
}

/**
 * Where the visible list breaks between tiers, and by how much. Computed over
 * the rows on screen, so it follows the position filter exactly as the tier
 * headers already do.
 */
const cliffByIndex = computed(() => {
  // The won't-last lens sorts by survival, not by tier — every row still has a
  // tier, so an ungated cliff would fire at nearly every row of a list where
  // tier order (and the points direction it implies) means nothing. Tier
  // headers are suppressed there for the same reason; match it.
  if (posFilter.value === 'LAST') return {}
  const rows = visibleBoard.value
  const list = tierCliffs(
    rows,
    (r) => tierOf(r.playerKey),
    (r) => ({ name: r.name, projected: r.projected }),
  )
  const out: Record<number, (typeof list)[number]> = {}
  // Keyed by the FIRST tiered row of the tier below — the same row the tier
  // header fires on. Rows the active list omits (or "show drafted" splices
  // back in) sit untiered between the break and afterIndex + 1; keying there
  // would detach the banner from its header and land it on one of them.
  for (const c of list) out[c.beforeIndex] = c
  return out
})

/**
 * Rounded, self-consistent view of each cliff: the drop equals the difference
 * of the two numbers actually rendered, so "338 then 334" can never sit beside
 * a "3 pt drop" computed from the unrounded inputs — and a boundary that
 * rounds away to no drop (the active list disagreeing with our points) is
 * dropped rather than rendered as "0 pt drop".
 */
const cliffDisplayByIndex = computed(() => {
  const out: Record<number, { aboveName: string; above: number; below: number; drop: number }> = {}
  for (const [i, c] of Object.entries(cliffByIndex.value)) {
    const above = round(c.abovePoints)
    const below = round(c.belowPoints)
    const drop = above - below
    if (drop > 0) out[Number(i)] = { aboveName: c.aboveName, above, below, drop }
  }
  return out
})

// Kickers and defenses always last, and saying so buries the players who do not.
const SKILL = new Set(['QB', 'RB', 'WR', 'TE'])
const safeUntilNext = computed(() =>
  board.value.slice(0, CONTENDERS).filter((r) => SKILL.has(r.position) && r.survival >= 0.7),
)

/**
 * One row per starting slot, each naming the player in it — a lineup, not a
 * tally. Empty slots get the best player still available who could fill them,
 * and no player is offered twice: if two back slots are open, they show the two
 * best backs rather than the same name written down twice.
 */
const lineup = computed(() => {
  const offered = new Set<string>()
  const rankFor = (label: string) => slotRanks.value.find((sr) => sr.label === label) ?? null
  return myLineup.value.rows.map((r) => {
    const teams = shape.value?.teams ?? 12
    const standing = rankFor(r.label)
    if (r.player) {
      return {
        ...r, best: null, wouldBe: null, wouldBeTone: 'hidden' as const,
        standing, tone: rankTone(standing?.rank ?? null, standing?.of ?? 0, teams),
      }
    }
    const best = board.value.find((b) => r.eligible.includes(b.position) && !offered.has(b.playerKey)) ?? null
    if (best) offered.add(best.playerKey)
    // What taking him would actually buy you at this slot, in league terms.
    const wouldBe = best ? rankIfDrafted(r.label, best.projected) : null
    return {
      ...r, best, standing, tone: 'hidden' as const, wouldBe,
      wouldBeTone: rankTone(wouldBe?.rank ?? null, wouldBe?.of ?? 0, teams),
    }
  })
})

/**
 * Strong and weak get a colour; the middle third does not. Lighting every row
 * says the same thing as lighting none.
 */
const TONE_CLASS: Record<string, string> = {
  good: 'text-emerald-400',
  bad: 'text-[#FF5C5C]',
  neutral: 'text-dark-text',
  hidden: 'text-dark-textMuted',
}
const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}
const bench = computed(() => myLineup.value.bench)
const startersFilled = computed(() => lineup.value.filter((r) => r.player).length)
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-bold text-dark-text">Draft Room</h1>
        <p class="font-mono text-xs text-dark-textMuted">
          <template v-if="status === 'drafting'">
            pick {{ pickLabel }}<span v-if="isMyTurn" class="text-primary"> · you're on the clock</span>
          </template>
          <template v-else>your board, your league, your opponents</template>
        </p>
        <!-- Always say which rankings the board is built from. -->
        <p v-if="customRankings.isAdmin.value" class="mt-1 flex items-center gap-2 font-mono text-[11px]">
          <span class="text-dark-textMuted">ranked by</span>
          <select
            :value="customRankings.activeId.value"
            @change="customRankings.setActive(($event.target as HTMLSelectElement).value)"
            class="rounded border border-dark-border bg-dark-card px-2 py-0.5 text-[11px]"
            :class="customRankings.enabled.value ? 'text-primary' : 'text-dark-text'"
          >
            <option value="">{{ UFD_LABEL }}</option>
            <option v-for="set in customRankings.setsOfKind.value" :key="set.id" :value="set.id">{{ set.name }}</option>
          </select>
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button
          @click="showConnect = !showConnect"
          class="rounded-lg border border-dark-border px-3 py-1.5 font-mono text-[11px] text-dark-textMuted hover:text-dark-text"
        >
          {{ overrideDraftId ? 'change draft' : 'connect draft' }}
        </button>
        <button
          v-if="status === 'drafting' || status === 'pre-draft'"
          @click="refresh"
          class="rounded-lg border border-dark-border px-3 py-1.5 font-mono text-[11px] text-dark-textMuted hover:text-dark-text"
        >
          refresh
        </button>
      </div>
    </header>

    <!-- Connect any Sleeper draft: paste the link from the address bar, or the ID -->
    <section v-if="showConnect" class="mb-4 rounded-xl border border-dark-border bg-dark-card p-4">
      <p class="mb-2 font-mono text-[11px] text-dark-textMuted">
        Paste a Sleeper draft link or ID — works for mock drafts too.
      </p>
      <div class="flex gap-2">
        <input
          v-model="draftInput"
          @keyup.enter="submitConnect"
          placeholder="https://sleeper.com/draft/nfl/992819274558156800"
          class="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-bg px-3 py-2 font-mono text-xs text-dark-text placeholder:text-dark-textMuted/60"
        />
        <button
          @click="submitConnect"
          class="shrink-0 rounded-lg bg-primary/20 px-3 py-2 font-mono text-xs text-primary hover:bg-primary/30"
        >
          connect
        </button>
      </div>
      <p v-if="overrideError" class="mt-2 font-mono text-[11px] text-[#FF5C5C]">{{ overrideError }}</p>
      <p v-if="overrideDraftId" class="mt-2 flex items-center gap-2 font-mono text-[11px] text-dark-textMuted">
        connected to draft {{ overrideDraftId }}
        <button @click="disconnectDraft" class="underline hover:text-dark-text">use my league's draft</button>
      </p>
    </section>

    <!-- Admin-only: how the uploaded list compares to our projections.
         Uploading and toggling live in Settings — this is a standing preference,
         not draft state. -->
    <section v-if="customRankings.isAdmin.value && customRankings.hasRankings.value" class="mb-4 rounded-xl border border-dark-border bg-dark-card p-4">
      <div class="flex items-center justify-between gap-3">
        <button @click="showRankings = !showRankings" class="font-mono text-[11px] text-dark-textMuted hover:text-dark-text">
          {{ showRankings ? '▾' : '▸' }} {{ customRankings.sourceName.value }} vs UFD
        </button>
        <RouterLink to="/settings" class="shrink-0 font-mono text-[11px] text-dark-textMuted underline hover:text-dark-text">
          manage in settings
        </RouterLink>
      </div>

      <div v-if="showRankings" class="mt-3 font-mono text-[11px] text-dark-textMuted">
        <p v-if="customRankings.ageDays.value !== null" class="mb-1"
           :class="(customRankings.ageDays.value ?? 0) > 7 ? 'text-amber-400' : 'text-dark-textMuted'">
          updated {{ customRankings.ageDays.value === 0 ? 'today' : customRankings.ageDays.value + 'd ago' }}
          <template v-if="(customRankings.ageDays.value ?? 0) > 7"> · these may be stale</template>
        </p>
        <p class="mb-2">
          {{ customRankings.parsed.value.length }} ranked ·
          {{ comparison.matched }} matched ·
          agreement {{ comparison.spearman.toFixed(2) }} ·
          avg gap {{ comparison.meanAbsDelta.toFixed(1) }} spots
          <span v-if="comparison.unmatched.length" class="text-amber-400">
            · {{ comparison.unmatched.length }} unmatched
          </span>
          <span v-if="comparison.ambiguous.length" class="text-amber-400">
            · {{ comparison.ambiguous.length }} ambiguous
          </span>
        </p>
        <p class="mb-1 uppercase tracking-wide text-dark-textMuted/70">biggest disagreements</p>
        <div v-for="d in comparison.diffs.slice(0, 12)" :key="d.playerKey" class="flex items-center gap-2 border-b border-dark-border/40 py-1 last:border-0">
          <span class="min-w-0 flex-1 truncate text-dark-text">{{ d.name }} <span class="text-dark-textMuted">{{ d.position }}</span></span>
          <span class="w-16 text-right">us {{ d.ourRank }}</span>
          <span class="w-16 text-right">them {{ d.theirRank }}</span>
          <span class="w-14 text-right font-bold" :class="d.delta > 0 ? 'text-emerald-400' : 'text-[#FF5C5C]'">
            {{ d.delta > 0 ? '+' : '' }}{{ d.delta }}
          </span>
          <span class="w-16 text-right text-dark-textMuted/70">adp {{ d.adp === null ? '—' : Math.round(d.adp) }}</span>
        </div>
        <p v-if="comparison.unmatched.length" class="mt-2 text-amber-400/80">
          unmatched: {{ comparison.unmatched.slice(0, 8).map((u) => u.name).join(', ') }}
        </p>
        <p v-if="comparison.ambiguous.length" class="mt-1 text-amber-400/80">
          shared names, not guessed:
          {{ comparison.ambiguous.slice(0, 6).map((a) => a.entry.name + ' (' + a.candidates.length + ')').join(', ') }}
        </p>
      </div>
    </section>

    <!-- Gates -->
    <div v-if="status === 'unsupported-league'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">Sleeper football only</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">The Draft Room reads live picks from Sleeper. ESPN and Yahoo support is coming.</p>
    </div>

    <div v-else-if="status === 'unsupported-type'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">Auction drafts aren't supported yet</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">Pick-order math doesn't apply to an auction — budgets replace draft slots. Snake and linear drafts work.</p>
    </div>

    <div v-else-if="status === 'no-draft'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">No draft found for this league</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">Once Sleeper creates the draft, it'll show up here.</p>
    </div>

    <div v-else-if="loading && !board.length" class="py-16 text-center text-dark-textMuted">Building your board…</div>

    <template v-else>
      <!-- Say plainly when the model is working with less than it wants -->
      <p v-if="!hasHistory" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
        No past drafts loaded for this league — opponents are modelled on the market (best available by ADP), not on how your managers actually draft.
      </p>
      <p v-if="slotUnknown" class="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-[11px] text-amber-300">
        Couldn't tell which seat is yours in this draft, so there are no upcoming picks to simulate —
        every player reads 100% and edge collapses to zero. Rankings and tiers are still valid.
      </p>
      <p v-if="!syncHealthy" class="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-[11px] text-amber-300">
        Live sync is failing. Mark players drafted yourself on the Board tab — the recommendation keeps working.
      </p>
      <p v-if="status === 'pre-draft'" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
        Draft hasn't started. This is your prep board — survival reads activate once picks begin.
      </p>
      <p v-if="status === 'complete'" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
        This draft is complete.
      </p>

      <!-- Tabs -->
      <div class="mb-4 flex gap-1 border-b border-dark-border">
        <button
          v-for="t in visibleTabs" :key="t.id" @click="tab = t.id"
          class="px-3 py-2 font-mono text-xs transition-colors"
          :class="tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-dark-textMuted hover:text-dark-text'"
        >{{ t.label }}</button>
      </div>

      <!-- PICK -->
      <section v-if="tab === 'pick'">
        <div v-if="!recommendation" class="py-12 text-center font-mono text-xs text-dark-textMuted">No players left to recommend.</div>
        <template v-else>
          <div class="mb-4 rounded-xl border border-primary/40 bg-dark-card p-4">
            <p class="mb-2 font-mono text-[10px] uppercase tracking-wide text-primary">take</p>
            <div class="mb-3 flex items-center gap-3">
              <img v-if="recommendation.pick.headshot" :src="recommendation.pick.headshot" :alt="recommendation.pick.name" @error="onImgErr" class="h-12 w-12 shrink-0 rounded-full bg-dark-border object-cover" />
              <div class="min-w-0">
                <p class="truncate font-display text-xl font-bold text-dark-text">{{ recommendation.pick.name }}</p>
                <p class="flex items-center gap-1.5 font-mono text-xs text-dark-textMuted">
                  <span class="rounded px-1.5 py-0.5 text-[10px] font-semibold" :class="posClass(recommendation.pick.position)">{{ recommendation.pick.position }}</span>
                  <template v-if="recommendation.pick.proTeam">
                    · <img :src="teamLogo(recommendation.pick.proTeam)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ recommendation.pick.proTeam }}
                  </template>
                  <span v-if="recommendation.pick.marketFlag === 'value'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] uppercase text-emerald-400">value</span>
                  <span v-else-if="recommendation.pick.marketFlag === 'fade'" class="ml-1 rounded bg-[#FF5C5C]/15 px-1 py-0.5 text-[9px] uppercase text-[#FF5C5C]">fade</span>
                  <span v-if="recommendation.pick.flag === 'fell'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] uppercase text-emerald-400">fell</span>
                  <span v-if="recommendation.pick.injuryStatus" class="ml-1 rounded border border-dark-border px-1 py-0.5 text-[9px] uppercase text-dark-textMuted">{{ recommendation.pick.injuryStatus }}</span>
                </p>
              </div>
            </div>
            <ul class="space-y-1.5">
              <li v-for="(r, i) in recommendation.reasons" :key="i" class="flex gap-2 font-mono text-[11px] text-dark-textMuted">
                <span class="text-primary">·</span><span>{{ r.text }}</span>
              </li>
            </ul>
          </div>

          <section v-if="recommendation.alternates.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
            <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Alternates</h2>
            <div v-for="a in recommendation.alternates" :key="a.row.playerKey" class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
              <img v-if="a.row.headshot" :src="a.row.headshot" :alt="a.row.name" loading="lazy" @error="onImgErr"
                   class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
              <span class="min-w-0 flex-1">
                <span class="truncate text-sm font-semibold text-dark-text">{{ a.row.name }}</span>
                <span class="flex items-center gap-1.5 font-mono text-[10px] text-dark-textMuted">
                  <span class="rounded px-1 py-0.5 text-[9px] font-semibold" :class="posClass(a.row.position)">{{ a.row.position }}</span>
                  <template v-if="a.row.proTeam">
                    <img :src="teamLogo(a.row.proTeam)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ a.row.proTeam }}
                  </template>
                  · {{ a.note }}
                </span>
              </span>
              <!--
                The points edge, not the internal score. `score` blends VONA,
                upside and a bench discount, and it pins at its cap in the late
                rounds — so three different players read "+14" and the number
                explains nothing. This one is the same quantity the headline
                cites, and it can be checked against the PTS column.
              -->
              <span class="shrink-0 text-right font-mono text-sm"
                    :class="a.row.usable > 0 ? 'text-dark-text' : 'text-dark-textMuted'">
                <template v-if="a.row.usable > 0">+{{ round(a.row.usable) }}</template>
                <template v-else>—</template>
                <span class="block font-mono text-[9px] text-dark-textMuted">
                  {{ a.row.usable > 0 ? 'pts to your lineup' : 'no slot for him' }}
                </span>
              </span>
            </div>
          </section>
        </template>
      </section>

      <!-- BOARD -->
      <section v-else-if="tab === 'board'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <!-- Position filter: tiers only group meaningfully within a position -->
        <div class="mb-3 flex flex-wrap gap-1">
          <button
            v-for="p in visiblePositions" :key="p" @click="posFilter = p"
            class="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase transition-colors"
            :class="posFilter === p ? (p === 'LAST' ? 'bg-[#FF5C5C]/20 text-[#FF5C5C]' : 'bg-primary/20 text-primary') : 'text-dark-textMuted hover:text-dark-text'"
          >{{ filterLabel(p) }}</button>
        </div>

        <div class="mb-2 flex items-center gap-3 border-b border-dark-border pb-1 font-mono text-[9px] uppercase text-dark-textMuted">
          <span class="w-6">#</span>
          <span class="min-w-0 flex-1">player · in {{ customRankings.sourceName.value }} order</span>
          <span class="w-12 text-right" title="Our projected points — unchanged by which list is ranking">pts</span>
          <span class="w-14 text-right" title="Chance he is still available at your next pick">lasts</span>
          <span class="w-12 text-right" title="Points he would add to your starting lineup, capped by what you would give up by waiting — a dash means he cannot crack your lineup today">edge</span>
        </div>

        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">tap a row to mark drafted</p>

        <template v-for="(r, i) in visibleBoard" :key="r.playerKey">
          <!--
            The most useful line in a hand-made draft guide is where the board
            breaks and by how much. We already compute it and have never said so.
          -->
          <div v-if="cliffDisplayByIndex[i]" class="mt-4 rounded-md border-l-2 border-[#FF5C5C]/60 bg-[#FF5C5C]/5 px-3 py-1.5">
            <span class="font-mono text-[10px] font-semibold uppercase tracking-wide text-[#FF5C5C]">
              cliff · after {{ cliffDisplayByIndex[i].aboveName }}
            </span>
            <span class="ml-2 font-mono text-[10px] text-dark-textMuted">
              {{ cliffDisplayByIndex[i].above }} then {{ cliffDisplayByIndex[i].below }}
              — {{ cliffDisplayByIndex[i].drop }} pt drop
            </span>
          </div>

          <!-- Tier header whenever the tier changes (grouping is real when filtered) -->
          <div v-if="isTierHeader(i)" class="mt-2 flex items-center gap-2 first:mt-0">
            <span class="h-px w-4 bg-primary/50" />
            <span class="whitespace-nowrap rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary">
              tier {{ tierOf(r.playerKey) }}
            </span>
            <span class="font-mono text-[9px] text-dark-textMuted/70">{{ tierCount(i) }} left</span>
            <span class="h-px flex-1 bg-primary/25" />
          </div>

          <button
            @click="!(r as any).takenAt && markDrafted(r.playerKey)"
            class="flex w-full items-center gap-3 border-b border-dark-border/40 py-2 text-left last:border-0"
            :class="(r as any).takenAt ? 'opacity-40' : 'hover:bg-dark-border/20'"
          >
            <span class="w-6 shrink-0 font-mono text-[10px] text-dark-textMuted">{{ listRankByKey[r.playerKey] ?? i + 1 }}</span>
            <img v-if="r.headshot" :src="r.headshot" :alt="r.name" loading="lazy" @error="onImgErr"
                 class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="h-7 w-7 shrink-0 rounded-full bg-dark-border" />
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1.5">
                <span class="truncate text-sm font-semibold" :class="(r as any).takenAt ? 'text-dark-textMuted line-through' : 'text-dark-text'">{{ r.name }}</span>
                <span v-if="(r as any).takenAt" class="shrink-0 font-mono text-[9px] text-dark-textMuted">gone {{ (r as any).takenAt }}</span>
                <span v-else-if="r.marketFlag === 'value'" class="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-emerald-400"
                      :title="`We rank him ${Math.abs(r.disagreementRounds).toFixed(1)} rounds earlier than the market does`">value</span>
                <span v-else-if="r.marketFlag === 'fade'" class="shrink-0 rounded bg-[#FF5C5C]/15 px-1 py-0.5 font-mono text-[9px] uppercase text-[#FF5C5C]"
                      :title="`The market ranks him ${Math.abs(r.disagreementRounds).toFixed(1)} rounds earlier than we do`">fade</span>
                <span v-if="r.flag === 'fell'" class="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-emerald-400"
                      title="He has slid past his ADP to the pick you are on">fell</span>
                <span v-if="r.injuryStatus" class="shrink-0 rounded border border-dark-border px-1 py-0.5 font-mono text-[9px] uppercase text-dark-textMuted"
                      title="Sleeper's reported status">{{ r.injuryStatus }}</span>
              </span>
              <span class="flex items-center gap-1.5 font-mono text-[10px] text-dark-textMuted">
                <span class="rounded px-1 py-0.5 text-[9px] font-semibold" :class="posClass(r.position)">{{ r.position }}</span>
                <template v-if="r.proTeam">
                  <img :src="teamLogo(r.proTeam)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ r.proTeam }}
                </template>
                <template v-if="r.adp !== null"> · adp {{ round(r.adp) }}</template>
              </span>
            </span>
            <span class="w-12 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(r.projected) }}</span>
            <span class="w-14 shrink-0 text-right font-mono text-xs" :class="r.survival < 0.5 ? 'text-[#FF5C5C]' : 'text-dark-textMuted'">{{ pct(r.survival) }}</span>
            <!--
              What he is worth TO YOU, not what he is worth in the abstract. The
              raw positional edge showed a backup quarterback at +39 on a roster
              that already had one — a true number about a player the board
              itself scored at zero.
            -->
            <span class="w-12 shrink-0 text-right font-mono text-sm font-bold" :class="r.usable > 0 ? 'text-dark-text' : 'text-dark-textMuted'">
              <template v-if="r.usable > 0">+{{ round(r.usable) }}</template>
              <template v-else>—</template>
            </span>
          </button>
        </template>

        <label class="mt-2 flex cursor-pointer items-center gap-2 font-mono text-[10px] text-dark-textMuted">
          <input type="checkbox" v-model="showDrafted" class="h-3 w-3 accent-primary" />
          show drafted players
        </label>

        <p v-if="posFilter === 'LAST' && safeUntilNext.length" class="mt-4 border-t border-dark-border pt-3 font-mono text-[11px] text-dark-textMuted">
          <span class="uppercase tracking-wide text-dark-textMuted/70">should still be there</span><br />
          {{ safeUntilNext.map((r) => r.name).join(' · ') }}
        </p>
        <p v-else-if="posFilter === 'LAST'" class="mt-4 font-mono text-[11px] text-dark-textMuted">
          Everyone worth taking should still be there at {{ myNextPick }}.
        </p>
      </section>

      <!-- DRAFT BOARD (grid) -->
      <section v-else-if="tab === 'grid'" ref="gridEl" class="overflow-x-auto rounded-xl border border-dark-border bg-dark-card p-4">
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          rounds down · teams across · snake rounds fill right-to-left · colour is position
        </p>
        <div v-if="!grid.length" class="py-6 text-center font-mono text-xs text-dark-textMuted">No draft board yet.</div>
        <table v-else class="w-full min-w-[52rem] border-separate border-spacing-1">
          <thead>
            <tr>
              <th class="sticky left-0 z-10 w-7 bg-dark-card"></th>
              <th
                v-for="c in grid[0].cells" :key="'h' + c.slot"
                :ref="(el) => { if (c.isMine) myColEl = el as HTMLElement }"
                :title="teamNameForSlot(c.slot)"
                class="w-[8.5rem] px-1 pb-1.5 text-left align-bottom font-normal"
              >
                <span class="block truncate font-display text-[11px] font-semibold"
                      :class="c.isMine ? 'text-primary' : 'text-dark-text'">
                  {{ c.isMine ? 'YOU' : teamNameForSlot(c.slot) }}
                </span>
                <span class="block h-0.5 rounded-full" :class="c.isMine ? 'bg-primary' : 'bg-dark-border'"></span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in grid" :key="row.round">
              <td class="sticky left-0 z-10 bg-dark-card pr-1 text-right align-middle font-mono text-[10px] text-dark-textMuted">
                {{ row.round }}
              </td>
              <td
                v-for="cell in row.cells" :key="cell.overallPick"
                class="relative h-[3.25rem] overflow-hidden rounded-md border px-2 py-1 align-top transition-colors"
                :class="[
                  cell.pick ? cellClass(cell.pick.position) : 'border-dark-border/40 bg-dark-bg/40',
                  cell.isCurrent ? 'ring-2 ring-primary' : '',
                  cell.isMine && !cell.pick ? 'bg-dark-border/30' : '',
                ]"
              >
                <span class="absolute right-1.5 top-1 font-mono text-[9px] tabular-nums"
                      :class="cell.pick ? 'text-dark-text/45' : 'text-dark-textMuted/40'">
                  {{ row.round }}.{{ String(((cell.overallPick - 1) % (shape?.teams ?? 12)) + 1).padStart(2, '0') }}
                </span>
                <template v-if="cell.pick">
                  <span class="block truncate pr-7 text-[12px] font-semibold leading-tight text-dark-text">
                    {{ cell.pick.playerName }}
                  </span>
                  <span class="mt-1 flex items-center gap-1">
                    <span class="rounded px-1 font-mono text-[9px] font-semibold" :class="posClass(cell.pick.position)">
                      {{ cell.pick.position }}
                    </span>
                    <img v-if="teamLogo(cell.pick.proTeam)" :src="teamLogo(cell.pick.proTeam)" alt="" loading="lazy"
                         @error="onImgErr" class="h-3.5 w-3.5 object-contain" />
                    <span class="truncate font-mono text-[9px] text-dark-textMuted">{{ cell.pick.proTeam }}</span>
                  </span>
                </template>
                <span v-else-if="cell.isCurrent"
                      class="mt-2 block font-mono text-[10px] font-semibold uppercase tracking-wide text-primary">
                  on the clock
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ROOM -->
      <section v-else-if="tab === 'roster'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Your roster</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          {{ startersFilled }}/{{ starterSlots }} starters · {{ myPicks.length }} picked ·
          rank is your player at that slot against every other team's
        </p>
        <div v-for="(r, i) in lineup" :key="`${r.label}-${i}`"
             class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0"
             :class="!r.player && r.late ? 'opacity-50' : ''">
          <span class="w-20 shrink-0">
            <span class="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold" :class="posClass(r.slot)">{{ r.label }}</span>
          </span>
          <span class="min-w-0 flex-1 truncate">
            <template v-if="r.player">
              <img v-if="r.player.headshot" :src="r.player.headshot" alt="" loading="lazy" @error="onImgErr"
                   class="mr-2 inline-block h-6 w-6 rounded-full bg-dark-border object-cover align-middle" />
              <span class="text-sm text-dark-text">{{ r.player.name }}</span>
              <span class="ml-2 font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
            </template>
            <template v-else>
              <span class="font-mono text-[11px] text-dark-textMuted">
                <template v-if="r.late">fill late</template>
                <template v-else-if="r.best">
                  best avail:
                  <img v-if="r.best.headshot" :src="r.best.headshot" alt="" loading="lazy" @error="onImgErr"
                       class="mx-1 inline-block h-5 w-5 rounded-full bg-dark-border object-cover align-middle" />
                  <span class="text-dark-text">{{ r.best.name }}</span>
                  <span class="text-dark-textMuted">· {{ round(r.best.projected) }} pts</span>
                </template>
                <template v-else>—</template>
              </span>
            </template>
          </span>
          <span class="w-24 shrink-0 text-right font-mono text-[10px]">
            <template v-if="r.player">
              <span v-if="r.tone !== 'hidden' && r.standing?.rank" class="block font-semibold"
                    :class="TONE_CLASS[r.tone]">
                {{ ordinal(r.standing.rank) }} of {{ r.standing.of }}
              </span>
              <span class="block text-dark-textMuted/70">pick {{ r.player.overallPick }}</span>
            </template>
            <template v-else>
              <span class="block" :class="r.late ? 'text-dark-textMuted' : 'text-[#FF5C5C]'">open</span>
              <span v-if="r.wouldBeTone !== 'hidden' && r.wouldBe" class="block" :class="TONE_CLASS[r.wouldBeTone]">
                he'd be {{ ordinal(r.wouldBe.rank) }} of {{ r.wouldBe.of }}
              </span>
            </template>
          </span>
        </div>

        <template v-if="bench.length">
          <h3 class="mb-1 mt-4 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Bench</h3>
          <div v-for="b in bench" :key="b.playerKey" class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="w-20 shrink-0">
              <span class="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold" :class="posClass(b.position)">{{ b.position }}</span>
            </span>
            <span class="min-w-0 flex-1 truncate">
              <img v-if="b.headshot" :src="b.headshot" alt="" loading="lazy" @error="onImgErr"
                   class="mr-2 inline-block h-6 w-6 rounded-full bg-dark-border object-cover align-middle" />
              <span class="text-sm text-dark-text">{{ b.name }}</span>
            </span>
            <span class="w-12 shrink-0 text-right font-mono text-[10px] text-dark-textMuted">
              {{ b.overallPick ? `#${b.overallPick}` : '' }}
            </span>
          </div>
        </template>
      </section>

      <!-- RECAP: what you ended up with -->
      <section v-else-if="tab === 'recap' && recap" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-4 flex items-baseline gap-4">
          <span class="font-display text-4xl font-bold text-primary">{{ recap.grade }}</span>
          <span class="min-w-0 font-mono text-xs text-dark-textMuted">
            <template v-if="recap.me">
              <span class="text-dark-text">{{ recap.me.rank }} of {{ recap.teams.length }}</span>
              by projected starting points<br />
              {{ Math.round(recap.me.startingPoints) }} pts<template v-if="recap.behindLeader > 0">
              · {{ recap.behindLeader }} behind the best lineup in the room</template>
            </template>
          </span>
        </div>
        <p class="mb-4 font-mono text-[10px] leading-relaxed text-dark-textMuted">
          every roster scored the same way — its best legal lineup, by our rest-of-season
          projections. not graded against ADP: beating the market measures how far you drifted
          from it, not whether the team is good.
        </p>

        <template v-if="edgeRows.length">
          <h3 class="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Against the room</h3>
          <div v-for="[pos, v] in edgeRows" :key="pos" class="flex items-center gap-3 border-b border-dark-border/40 py-1.5 last:border-0">
            <span class="w-14 shrink-0">
              <span class="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold" :class="posClass(pos)">{{ pos }}</span>
            </span>
            <span class="min-w-0 flex-1 font-mono text-[11px]" :class="v >= 0 ? 'text-emerald-400' : 'text-[#FF5C5C]'">
              {{ v >= 0 ? '+' : '' }}{{ v }} pts vs the average team here
            </span>
          </div>
        </template>

        <template v-if="recap.values.length">
          <h3 class="mb-2 mt-4 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Fell to you</h3>
          <div v-for="n in recap.values" :key="n.pick.playerKey" class="flex items-center gap-2 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="n.pick.headshot" :src="n.pick.headshot" alt="" loading="lazy" @error="onImgErr"
                 class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-dark-text">{{ n.pick.name }}</span>
              <span class="mt-0.5 flex items-center gap-1">
                <span class="rounded px-1 font-mono text-[9px] font-semibold" :class="posClass(n.pick.position)">{{ n.pick.position }}</span>
                <img v-if="teamLogo(n.pick.proTeam)" :src="teamLogo(n.pick.proTeam)" alt="" loading="lazy" @error="onImgErr" class="h-3 w-3 object-contain" />
                <span class="font-mono text-[9px] text-dark-textMuted">{{ n.pick.proTeam }}</span>
              </span>
            </span>
            <span class="shrink-0 font-mono text-[11px] text-emerald-400">{{ n.delta }} picks past ADP</span>
          </div>
        </template>

        <template v-if="recap.reaches.length">
          <h3 class="mb-2 mt-4 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">You went early on</h3>
          <div v-for="n in recap.reaches" :key="n.pick.playerKey" class="flex items-center gap-2 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="n.pick.headshot" :src="n.pick.headshot" alt="" loading="lazy" @error="onImgErr"
                 class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-dark-text">{{ n.pick.name }}</span>
              <span class="mt-0.5 flex items-center gap-1">
                <span class="rounded px-1 font-mono text-[9px] font-semibold" :class="posClass(n.pick.position)">{{ n.pick.position }}</span>
                <img v-if="teamLogo(n.pick.proTeam)" :src="teamLogo(n.pick.proTeam)" alt="" loading="lazy" @error="onImgErr" class="h-3 w-3 object-contain" />
                <span class="font-mono text-[9px] text-dark-textMuted">{{ n.pick.proTeam }}</span>
              </span>
            </span>
            <span class="shrink-0 font-mono text-[11px] text-dark-textMuted">{{ -n.delta }} picks ahead of ADP</span>
          </div>
        </template>

        <h3 class="mb-2 mt-4 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">The room</h3>
        <div v-for="t in recap.teams" :key="t.teamKey" class="flex items-center gap-2.5 border-b border-dark-border/40 py-2 last:border-0"
             :class="t.isMine ? 'text-dark-text' : 'text-dark-textMuted'">
          <span class="w-5 shrink-0 font-mono text-[11px] tabular-nums">{{ t.rank }}</span>
          <img v-if="teamAvatarForSlot(t.slot)" :src="teamAvatarForSlot(t.slot)!" alt="" loading="lazy" @error="onImgErr"
               class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
          <span v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dark-border/60 font-mono text-[10px] text-dark-textMuted">
            {{ t.slot }}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm" :class="t.isMine ? 'font-semibold text-primary' : ''">{{ t.teamName }}</span>
          <span class="shrink-0 font-mono text-[11px] tabular-nums">{{ Math.round(t.startingPoints) }}</span>
        </div>
      </section>

      <!-- HISTORY: every draft you've finished -->
      <section v-else-if="tab === 'history'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Your drafts</h2>
          <div class="flex gap-1">
            <button v-for="k in (['all', 'league', 'mock'] as const)" :key="k" @click="historyKind = k"
                    class="rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors"
                    :class="historyKind === k ? 'border-primary text-primary' : 'border-dark-border text-dark-textMuted hover:text-dark-text'">
              {{ k }}
            </button>
          </div>
        </div>

        <div v-if="!historyRecords.length" class="py-6 text-center font-mono text-xs text-dark-textMuted">
          No {{ historyKind === 'all' ? '' : historyKind + ' ' }}drafts saved yet.
        </div>

        <template v-else>
          <div class="mb-4 grid grid-cols-3 gap-2">
            <div class="rounded-lg border border-dark-border bg-dark-bg/40 p-3">
              <span class="block font-mono text-[10px] uppercase tracking-wide text-dark-textMuted">all {{ historySummary.count }}</span>
              <span class="font-display text-2xl font-bold text-dark-text">{{ historySummary.averageGrade }}</span>
            </div>
            <div class="rounded-lg border border-dark-border bg-dark-bg/40 p-3">
              <span class="block font-mono text-[10px] uppercase tracking-wide text-dark-textMuted">last {{ historySummary.recentCount }}</span>
              <span class="font-display text-2xl font-bold"
                    :class="historySummary.recentPercentile < historySummary.averagePercentile ? 'text-emerald-400' : 'text-dark-text'">
                {{ historySummary.recentGrade }}
              </span>
            </div>
            <div class="rounded-lg border border-dark-border bg-dark-bg/40 p-3">
              <span class="block font-mono text-[10px] uppercase tracking-wide text-dark-textMuted">best</span>
              <span class="font-display text-2xl font-bold text-dark-text">
                {{ historySummary.bestFinish ? historySummary.bestFinish.rank : '—' }}
                <span v-if="historySummary.bestFinish" class="font-mono text-xs text-dark-textMuted">of {{ historySummary.bestFinish.of }}</span>
              </span>
            </div>
          </div>
          <p class="mb-4 font-mono text-[10px] leading-relaxed text-dark-textMuted">
            grades average the finishing position, not the letters — a run of high Bs and a run of
            low As are different seasons.<template v-if="historySummary.advicePreferred">
            our advice would have outscored you in {{ historySummary.advicePreferred.better }} of
            {{ historySummary.advicePreferred.of }} drafts we could replay.</template>
            the "ours" figure is recomputed by today's model each time a draft is opened, so every
            row is comparable — it is not a record of what the tool said on the day.
          </p>

          <div v-for="r in historyRecords" :key="r.draftId"
               class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="w-8 shrink-0 font-display text-lg font-bold"
                  :class="r.rank <= Math.ceil(r.of / 3) ? 'text-primary' : 'text-dark-text'">{{ r.grade }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-dark-text">
                {{ r.rank }} of {{ r.of }} · {{ r.startingPoints }} pts
              </span>
              <span class="block font-mono text-[10px] text-dark-textMuted">
                {{ shortDate(r.savedAt) }} · {{ r.kind }} · {{ r.teams }}-team, {{ r.rounds }} rounds<template v-if="r.outcome">
                · ours {{ r.outcome.ours >= r.outcome.yours ? '+' : '' }}{{ r.outcome.ours - r.outcome.yours }}</template>
              </span>
            </span>
            <button @click="history.forget(r.draftId)"
                    class="shrink-0 font-mono text-[10px] text-dark-textMuted transition-colors hover:text-[#FF5C5C]">
              remove
            </button>
          </div>

          <template v-if="historyCalibration.length">
            <h3 class="mb-1 mt-5 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
              Calibration, all drafts pooled
            </h3>
            <p class="mb-2 font-mono text-[10px] text-dark-textMuted">
              one draft can't settle whether a band is biased or unlucky — this is the number that can
            </p>
            <div v-for="b in historyCalibration" :key="b.bucket"
                 class="flex items-center gap-3 border-b border-dark-border/40 py-1 font-mono text-[11px] last:border-0">
              <span class="w-20 text-dark-textMuted">{{ Math.round(b.bucket * 100) }}–{{ Math.round(b.bucket * 100) + 10 }}%</span>
              <span class="w-24 text-dark-textMuted">said {{ (b.predicted * 100).toFixed(0) }}%</span>
              <span class="w-24" :class="Math.abs(b.predicted - (b.total ? b.actualSurvived / b.total : 0)) <= 0.1 ? 'text-emerald-400' : 'text-[#FF5C5C]'">
                was {{ b.total ? ((b.actualSurvived / b.total) * 100).toFixed(0) : 0 }}%
              </span>
              <span class="text-dark-textMuted/60">n={{ b.total }}</span>
            </div>
          </template>
        </template>
      </section>

      <!-- REPLAY: what we would have said, and were we calibrated -->
      <section v-else-if="tab === 'replay'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Replay</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          what the engine would have recommended at each of your picks · {{ replay?.universe }} players in the pool
        </p>

        <div v-if="!replay" class="py-6 text-center font-mono text-xs text-dark-textMuted">Connect a completed draft to replay it.</div>
        <template v-else>
          <!-- What listening would have been worth. -->
          <div class="mb-4 flex items-stretch gap-2">
            <div class="flex-1 rounded-lg border border-dark-border bg-dark-bg/40 p-3">
              <span class="block font-mono text-[10px] uppercase tracking-wide text-dark-textMuted">you drafted</span>
              <span class="font-display text-2xl font-bold text-dark-text">{{ replay.outcome.yours }}</span>
              <span class="ml-1 font-mono text-[10px] text-dark-textMuted">pts</span>
            </div>
            <div class="flex-1 rounded-lg border p-3"
                 :class="replay.outcome.ours > replay.outcome.yours ? 'border-primary/50 bg-primary/5' : 'border-dark-border bg-dark-bg/40'">
              <span class="block font-mono text-[10px] uppercase tracking-wide text-dark-textMuted">following us</span>
              <span class="font-display text-2xl font-bold"
                    :class="replay.outcome.ours > replay.outcome.yours ? 'text-primary' : 'text-dark-text'">
                {{ replay.outcome.ours }}
              </span>
              <span class="ml-1 font-mono text-[10px] text-dark-textMuted">pts</span>
              <span class="ml-2 font-mono text-[11px]"
                    :class="replay.outcome.ours >= replay.outcome.yours ? 'text-emerald-400' : 'text-[#FF5C5C]'">
                {{ replay.outcome.ours >= replay.outcome.yours ? '+' : '' }}{{ replay.outcome.ours - replay.outcome.yours }}
              </span>
            </div>
          </div>
          <p class="mb-4 font-mono text-[10px] leading-relaxed text-dark-textMuted">
            both lineups scored the way the recap scores every team — best legal lineup, our
            rest-of-season projections. one assumption, and it is a real one: the other managers
            are held to the picks they actually made.
          </p>

          <div v-for="s in replay.steps" :key="s.overallPick" class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="w-9 shrink-0 font-mono text-[10px] text-dark-textMuted">{{ s.overallPick }}</span>

            <span class="flex min-w-0 flex-1 items-center gap-2">
              <img v-if="s.recommendation?.pick.headshot" :src="s.recommendation.pick.headshot" alt="" loading="lazy" @error="onImgErr"
                   class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
              <span class="min-w-0">
                <span class="block font-mono text-[9px] uppercase tracking-wide text-dark-textMuted">we'd say</span>
                <span class="block truncate text-sm font-semibold text-dark-text">{{ s.recommendation?.pick.name ?? '—' }}</span>
                <span v-if="s.recommendation" class="mt-0.5 flex items-center gap-1">
                  <span class="rounded px-1 font-mono text-[9px] font-semibold" :class="posClass(s.recommendation.pick.position)">
                    {{ s.recommendation.pick.position }}
                  </span>
                  <img v-if="teamLogo(s.recommendation.pick.proTeam)" :src="teamLogo(s.recommendation.pick.proTeam)" alt=""
                       loading="lazy" @error="onImgErr" class="h-3 w-3 object-contain" />
                  <span class="font-mono text-[9px] text-dark-textMuted">{{ s.recommendation.pick.proTeam }}</span>
                </span>
              </span>
            </span>

            <span class="flex min-w-0 flex-1 items-center gap-2"
                  :class="s.recommendation && s.actualPlayerKey === s.recommendation.pick.playerKey ? 'opacity-100' : 'opacity-80'">
              <img v-if="replay.metaByKey[s.actualPlayerKey ?? '']?.headshot"
                   :src="replay.metaByKey[s.actualPlayerKey ?? ''].headshot" alt="" loading="lazy" @error="onImgErr"
                   class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
              <span class="min-w-0">
                <span class="block font-mono text-[9px] uppercase tracking-wide"
                      :class="s.recommendation && s.actualPlayerKey === s.recommendation.pick.playerKey ? 'text-emerald-400' : 'text-dark-textMuted'">
                  you took
                </span>
                <span class="block truncate text-sm text-dark-text">{{ s.actualName ?? '—' }}</span>
                <span v-if="replay.metaByKey[s.actualPlayerKey ?? '']" class="mt-0.5 flex items-center gap-1">
                  <span class="rounded px-1 font-mono text-[9px] font-semibold" :class="posClass(replay.metaByKey[s.actualPlayerKey ?? ''].position)">
                    {{ replay.metaByKey[s.actualPlayerKey ?? ''].position }}
                  </span>
                  <img v-if="teamLogo(replay.metaByKey[s.actualPlayerKey ?? ''].proTeam)"
                       :src="teamLogo(replay.metaByKey[s.actualPlayerKey ?? ''].proTeam)" alt=""
                       loading="lazy" @error="onImgErr" class="h-3 w-3 object-contain" />
                  <span class="font-mono text-[9px] text-dark-textMuted">{{ replay.metaByKey[s.actualPlayerKey ?? ''].proTeam }}</span>
                </span>
              </span>
            </span>
          </div>

          <h3 class="mb-2 mt-4 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Calibration</h3>
          <p class="mb-2 font-mono text-[10px] text-dark-textMuted">
            of the players we said had this chance of lasting, how many actually did
          </p>
          <div v-for="b in replay.calibration" :key="b.bucket" class="flex items-center gap-3 border-b border-dark-border/40 py-1 font-mono text-[11px] last:border-0">
            <span class="w-20 text-dark-textMuted">{{ Math.round(b.bucket * 100) }}–{{ Math.round(b.bucket * 100) + 10 }}%</span>
            <span class="w-24 text-dark-textMuted">said {{ (b.predicted * 100).toFixed(0) }}%</span>
            <span class="w-24" :class="Math.abs(b.actualSurvived / b.total - b.predicted) > 0.15 ? 'text-[#FF5C5C]' : 'text-emerald-400'">
              was {{ ((b.actualSurvived / b.total) * 100).toFixed(0) }}%
            </span>
            <span class="text-dark-textMuted/70">n={{ b.total }}</span>
          </div>
        </template>
      </section>

    </template>
  </div>
</template>
