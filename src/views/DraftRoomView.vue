<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDraftRoom } from '@/composables/useDraftRoom'
import { nflTeamLogo } from '@/players/nflTeamLogo'

const {
  status, loading, board, recommendation, myPick, myNextPick, isMyTurn,
  currentOverallPick, hasHistory, myPicks, starterSlots, slotUnknown,
  markDrafted, syncHealthy, refresh, shape,
  grid, teamNameForSlot, connectDraft, disconnectDraft, overrideDraftId, overrideError,
  customRankings, replay,
} = useDraftRoom()

// Admin-only analyst override. Invisible to every other account.
const showRankings = ref(false)
const rankingsInput = ref(customRankings.rawText.value)
const analystName = ref(customRankings.label.value)
const comparison = computed(() => customRankings.compare(board.value))
function saveRankings() {
  customRankings.setRankings(rankingsInput.value, analystName.value)
}
const fileMsg = ref('')
async function onRankingsFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const n = await customRankings.loadFromFile(file, analystName.value)
    rankingsInput.value = customRankings.rawText.value
    fileMsg.value = `loaded ${n} players from ${file.name}`
  } catch {
    fileMsg.value = "couldn't read that file"
  }
}

type Tab = 'pick' | 'board' | 'grid' | 'room' | 'last' | 'replay'
const tab = ref<Tab>('pick')
const TABS: { id: Tab; label: string }[] = [
  { id: 'pick', label: 'Pick' },
  { id: 'board', label: 'Board' },
  { id: 'grid', label: 'Draft Board' },
  { id: 'room', label: 'Room' },
  { id: 'last', label: "Won't Last" },
]
/** Replay only means anything once a draft is finished. */
const visibleTabs = computed(() =>
  replay.value ? [...TABS, { id: 'replay' as Tab, label: 'Replay' }] : TABS,
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

const round = (n: number) => Math.round(n)
const pct = (n: number) => `${Math.round(n * 100)}%`
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

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
const posFilter = ref<(typeof POSITIONS)[number]>('ALL')

const visibleBoard = computed(() => {
  const rows = posFilter.value === 'ALL'
    ? board.value
    : board.value.filter((r) => r.position === posFilter.value)
  // When filtered to one position, sort by tier so the groups read in order.
  const ordered = posFilter.value === 'ALL'
    ? rows
    : [...rows].sort((a, b) => a.tier - b.tier || b.value - a.value)
  return ordered.slice(0, 60)
})
/** A header wherever the relevant tier changes — overall when unfiltered. */
function isTierHeader(i: number): boolean {
  const rows = visibleBoard.value
  if (i === 0) return true
  const prev = rows[i - 1]
  const cur = rows[i]
  if (posFilter.value === 'ALL') return prev.overallTier !== cur.overallTier
  return prev.tier !== cur.tier || prev.position !== cur.position
}

const wontLast = computed(() =>
  board.value.filter((r) => r.survival < 0.7).slice(0, 25),
)
const safeUntilNext = computed(() =>
  board.value.filter((r) => r.survival >= 0.7).slice(0, 12),
)

/** Roster holes: starting slots not yet filled, with the best available at each. */
const holes = computed(() => {
  const bySlot: Record<string, number> = {}
  for (const p of myPicks.value) {
    const pos = String((p as any)?.metadata?.position ?? '').toUpperCase()
    if (pos) bySlot[pos] = (bySlot[pos] ?? 0) + 1
  }
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  return positions.map((pos) => ({
    pos,
    have: bySlot[pos] ?? 0,
    best: board.value.find((r) => r.position === pos) ?? null,
  }))
})
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
      </div>
      <div class="flex shrink-0 gap-2">
        <button
          @click="showConnect = !showConnect"
          class="rounded-lg border border-dark-border px-3 py-1.5 font-mono text-[11px] text-dark-textMuted hover:text-dark-text"
        >
          {{ overrideDraftId ? 'change draft' : 'connect draft' }}
        </button>
        <button
          v-if="status === 'drafting'"
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

    <!-- Admin-only: compare against an analyst, and optionally draft off their order -->
    <section v-if="customRankings.isAdmin.value" class="mb-4 rounded-xl border border-dark-border bg-dark-card p-4">
      <div class="flex items-center justify-between gap-3">
        <button @click="showRankings = !showRankings" class="font-mono text-[11px] text-dark-textMuted hover:text-dark-text">
          {{ showRankings ? '▾' : '▸' }} analyst rankings <span class="text-dark-textMuted/60">(admin only)</span>
        </button>
        <label v-if="customRankings.hasRankings.value" class="flex shrink-0 cursor-pointer items-center gap-2 font-mono text-[11px]">
          <input
            type="checkbox"
            :checked="customRankings.enabledPref.value"
            @change="customRankings.setEnabled(($event.target as HTMLInputElement).checked)"
          />
          <span :class="customRankings.enabled.value ? 'text-primary' : 'text-dark-textMuted'">
            use {{ customRankings.label.value }}'s order
          </span>
        </label>
      </div>

      <div v-if="showRankings" class="mt-3">
        <div class="mb-2 flex gap-2">
          <input
            v-model="analystName"
            placeholder="analyst name"
            class="w-40 shrink-0 rounded-lg border border-dark-border bg-dark-bg px-2 py-1.5 font-mono text-xs text-dark-text"
          />
          <label class="cursor-pointer rounded-lg border border-dark-border px-3 py-1.5 font-mono text-xs text-dark-textMuted hover:text-dark-text">
            upload csv
            <input type="file" accept=".csv,.txt,text/csv,text/plain" class="hidden" @change="onRankingsFile" />
          </label>
          <button @click="saveRankings" class="rounded-lg bg-primary/20 px-3 py-1.5 font-mono text-xs text-primary hover:bg-primary/30">save</button>
          <button @click="customRankings.clearRankings()" class="rounded-lg border border-dark-border px-3 py-1.5 font-mono text-xs text-dark-textMuted hover:text-dark-text">clear</button>
        </div>
        <textarea
          v-model="rankingsInput"
          rows="6"
          placeholder="1. Ja'Marr Chase, WR, CIN&#10;2. Bijan Robinson, RB, ATL&#10;..."
          class="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 font-mono text-[11px] text-dark-text placeholder:text-dark-textMuted/50"
        />

        <p v-if="fileMsg" class="mt-2 font-mono text-[11px] text-emerald-400">{{ fileMsg }}</p>

        <div v-if="customRankings.hasRankings.value" class="mt-3 font-mono text-[11px] text-dark-textMuted">
          <p v-if="customRankings.ageDays.value !== null" class="mb-1"
             :class="(customRankings.ageDays.value ?? 0) > 7 ? 'text-amber-400' : 'text-dark-textMuted'">
            updated {{ customRankings.ageDays.value === 0 ? 'today' : `${customRankings.ageDays.value}d ago` }}
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
            {{ comparison.ambiguous.slice(0, 6).map((a) => `${a.entry.name} (${a.candidates.length})`).join(', ') }}
          </p>
        </div>
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
        No past drafts loaded for this league — opponent reads use league-average behavior, not your managers'.
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
                <p class="flex items-center gap-1 font-mono text-xs text-dark-textMuted">
                  {{ recommendation.pick.position }}
                  <template v-if="recommendation.pick.proTeam">
                    · <img :src="teamLogo(recommendation.pick.proTeam)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ recommendation.pick.proTeam }}
                  </template>
                  <span v-if="recommendation.pick.flag === 'value'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] uppercase text-emerald-400">value</span>
                  <span v-else-if="recommendation.pick.flag === 'reach'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] uppercase text-amber-400">reach</span>
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
              <span class="min-w-0 flex-1">
                <span class="truncate text-sm font-semibold text-dark-text">{{ a.row.name }}</span>
                <span class="block font-mono text-[10px] text-dark-textMuted">{{ a.row.position }} · {{ a.note }}</span>
              </span>
              <span class="shrink-0 text-right font-mono text-sm text-dark-text">{{ round(a.row.score) > 0 ? '+' : '' }}{{ round(a.row.score) }}</span>
            </div>
          </section>
        </template>
      </section>

      <!-- BOARD -->
      <section v-else-if="tab === 'board'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <!-- Position filter: tiers only group meaningfully within a position -->
        <div class="mb-3 flex flex-wrap gap-1">
          <button
            v-for="p in POSITIONS" :key="p" @click="posFilter = p"
            class="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase transition-colors"
            :class="posFilter === p ? 'bg-primary/20 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
          >{{ p === 'ALL' ? 'all' : p }}</button>
        </div>

        <div class="mb-2 flex items-center gap-3 border-b border-dark-border pb-1 font-mono text-[9px] uppercase text-dark-textMuted">
          <span class="w-6">#</span>
          <span class="min-w-0 flex-1">player</span>
          <span class="w-12 text-right">pts</span>
          <span class="w-14 text-right" title="Chance he is still available at your next pick">lasts</span>
          <span class="w-12 text-right" title="What the board sorts by: edge during the starter rounds, ceiling once your lineup is full">score</span>
        </div>

        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">tap a row to mark drafted</p>

        <template v-for="(r, i) in visibleBoard" :key="r.playerKey">
          <!-- Tier header whenever the tier changes (grouping is real when filtered) -->
          <div
            v-if="isTierHeader(i)"
            class="mt-3 flex items-center gap-2 first:mt-0"
          >
            <span class="rounded bg-dark-border/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-dark-text">
              <template v-if="posFilter === 'ALL'">tier {{ r.overallTier }} overall</template>
              <template v-else>{{ r.position }} tier {{ r.tier }}</template>
            </span>
            <span class="h-px flex-1 bg-dark-border/60" />
          </div>

          <button
            @click="markDrafted(r.playerKey)"
            class="flex w-full items-center gap-3 border-b border-dark-border/40 py-2 text-left last:border-0 hover:bg-dark-border/20"
          >
            <span class="w-6 shrink-0 font-mono text-[10px] text-dark-textMuted">{{ i + 1 }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">
                {{ r.name }}
                <span v-if="r.flag === 'value'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-emerald-400">value</span>
              </span>
              <span class="block font-mono text-[10px] text-dark-textMuted">
                {{ r.position }}<template v-if="r.proTeam"> · {{ r.proTeam }}</template><template v-if="r.adp !== null"> · adp {{ round(r.adp) }}</template><template v-if="round(r.score) !== round(r.vona)"> · edge {{ round(r.vona) }}</template>
              </span>
            </span>
            <span class="w-12 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(r.value) }}</span>
            <span class="w-14 shrink-0 text-right font-mono text-xs" :class="r.survival < 0.5 ? 'text-[#FF5C5C]' : 'text-dark-textMuted'">{{ pct(r.survival) }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm font-bold" :class="r.score > 0 ? 'text-dark-text' : 'text-dark-textMuted'">
              {{ r.score > 0 ? '+' : '' }}{{ round(r.score) }}
            </span>
          </button>
        </template>
      </section>

      <!-- DRAFT BOARD (grid) -->
      <section v-else-if="tab === 'grid'" class="overflow-x-auto rounded-xl border border-dark-border bg-dark-card p-4">
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          rounds down · teams across · snake rows read in pick order · your picks highlighted
        </p>
        <div v-if="!grid.length" class="py-6 text-center font-mono text-xs text-dark-textMuted">No draft board yet.</div>
        <table v-else class="w-full min-w-[36rem] border-separate border-spacing-1">
          <thead>
            <tr>
              <th class="w-8"></th>
              <th
                v-for="c in grid[0].cells" :key="'h' + c.slot"
                class="truncate px-1 pb-1 text-left font-mono text-[9px] font-normal uppercase text-dark-textMuted"
              >{{ teamNameForSlot(c.slot) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in grid" :key="row.round">
              <td class="pr-1 text-right font-mono text-[10px] text-dark-textMuted">{{ row.round }}</td>
              <td
                v-for="cell in row.cells" :key="cell.overallPick"
                class="rounded border px-1.5 py-1 align-top"
                :class="[
                  cell.isCurrent ? 'border-primary bg-primary/10' : 'border-dark-border/50',
                  cell.isMine ? 'bg-dark-border/40' : '',
                ]"
              >
                <template v-if="cell.pick">
                  <span class="block truncate font-mono text-[10px] text-dark-text">{{ cell.pick.playerName }}</span>
                  <span class="block font-mono text-[9px] text-dark-textMuted">{{ cell.pick.position }}</span>
                </template>
                <span v-else class="block font-mono text-[9px] text-dark-textMuted/50">{{ cell.overallPick }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ROOM -->
      <section v-else-if="tab === 'room'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Your roster</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">{{ myPicks.length }} picked · {{ starterSlots }} starting slots</p>
        <div v-for="h in holes" :key="h.pos" class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
          <span class="w-12 shrink-0 font-mono text-[11px] uppercase text-dark-textMuted">{{ h.pos }}</span>
          <span class="w-8 shrink-0 font-mono text-sm" :class="h.have ? 'text-dark-text' : 'text-[#FF5C5C]'">{{ h.have }}</span>
          <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-dark-textMuted">
            <template v-if="h.best">best avail: <span class="text-dark-text">{{ h.best.name }}</span> ({{ round(h.best.score) }})</template>
            <template v-else>—</template>
          </span>
        </div>
      </section>

      <!-- REPLAY: what we would have said, and were we calibrated -->
      <section v-else-if="tab === 'replay'" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Replay</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          what the engine would have recommended at each of your picks · {{ replay?.universe }} players in the pool
        </p>

        <div v-if="!replay" class="py-6 text-center font-mono text-xs text-dark-textMuted">Connect a completed draft to replay it.</div>
        <template v-else>
          <div v-for="s in replay.steps" :key="s.overallPick" class="border-b border-dark-border/40 py-2 last:border-0">
            <div class="flex items-baseline gap-2">
              <span class="w-12 shrink-0 font-mono text-[10px] text-dark-textMuted">pick {{ s.overallPick }}</span>
              <span class="min-w-0 flex-1">
                <span class="text-sm text-dark-text">
                  we'd say <span class="font-semibold">{{ s.recommendation?.pick.name ?? '—' }}</span>
                </span>
                <span class="block font-mono text-[10px]"
                  :class="s.recommendation && s.actualPlayerKey === s.recommendation.pick.playerKey ? 'text-emerald-400' : 'text-dark-textMuted'">
                  you took {{ s.actualName ?? s.actualPlayerKey ?? '—' }}
                </span>
              </span>
            </div>
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

      <!-- WON'T LAST -->
      <section v-else class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Won't last<template v-if="myNextPick"> to {{ myNextPick }}</template>
        </h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">simulated from how your league actually drafts</p>
        <div v-if="!wontLast.length" class="py-6 text-center font-mono text-xs text-dark-textMuted">Everyone worth taking should still be there.</div>
        <div v-for="r in wontLast" :key="r.playerKey" class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
          <span class="min-w-0 flex-1">
            <span class="truncate text-sm font-semibold text-dark-text">{{ r.name }}</span>
            <span class="block font-mono text-[10px] text-dark-textMuted">{{ r.position }} · tier {{ r.tier }}</span>
          </span>
          <span class="shrink-0 font-mono text-sm font-bold text-[#FF5C5C]">{{ pct(1 - r.survival) }}</span>
        </div>

        <template v-if="safeUntilNext.length">
          <h3 class="mb-2 mt-4 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Should still be there</h3>
          <p class="font-mono text-[11px] text-dark-textMuted">{{ safeUntilNext.map((r) => r.name).join(' · ') }}</p>
        </template>
      </section>
    </template>
  </div>
</template>
