<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#05060a] text-gray-900 dark:text-gray-100">
    <div v-if="!isAdmin" class="max-w-lg mx-auto px-6 py-24 text-center">
      <h1 class="text-xl font-bold mb-2">Not available</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        This page is limited to admin accounts while it is in development.
      </p>
    </div>

    <div v-else class="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">

      <header class="mb-5">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-black tracking-tight">Edge Board</h1>
          <span class="badge-amber">Internal beta</span>
          <span class="badge-plain">Florida</span>
          <span v-if="useSample" class="badge-pink">Sample data</span>
        </div>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          This does not predict games. It reads where the sharp sportsbook market has each number,
          then finds the pick'em lines and Hard Rock prices sitting in the wrong place relative to it.
          Every recommendation below is a statement about a line, not about a player.
        </p>
      </header>

      <div class="mb-5 rounded-lg border border-gray-200 dark:border-white/10
                  bg-white dark:bg-white/[0.03] px-4 py-3">
        <p class="text-[12px] leading-relaxed text-gray-600 dark:text-gray-400">
          <strong class="text-gray-800 dark:text-gray-200">21+.</strong>
          Reference prices come from books you cannot bet at in Florida; they are the yardstick, not the
          destination. Nothing here is a guarantee and most players lose money over time.
          If it stops being fun, call 1-800-GAMBLER.
        </p>
      </div>

      <!-- ── Tabs ───────────────────────────────────────────────────────── -->
      <div class="mb-5 flex gap-1 border-b border-gray-200 dark:border-white/10">
        <button v-for="t in tabs" :key="t.id" @click="tab = t.id"
                class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition"
                :class="tab === t.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'">
          {{ t.label }}
          <span v-if="t.count !== null" class="ml-1.5 text-xs opacity-60">{{ t.count }}</span>
        </button>
      </div>

      <!-- ── Health strip ───────────────────────────────────────────────── -->
      <div class="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="stat"><div class="stat-k">Last refresh</div>
          <div class="stat-v">{{ health.lastRunAt ? timeAgo(health.lastRunAt) : 'Never' }}</div></div>
        <div class="stat"><div class="stat-k">Credits this month</div>
          <div class="stat-v">{{ health.creditsUsedThisMonth }}<span v-if="health.creditsRemaining !== null"
            class="text-gray-500 font-normal"> · {{ health.creditsRemaining }} left</span></div></div>
        <div class="stat"><div class="stat-k">Picks on the board</div>
          <div class="stat-v">{{ board.length }}</div></div>
        <div class="stat"><div class="stat-k">Modeled picks</div>
          <div class="stat-v">{{ modeledCount }}</div></div>
      </div>

      <div v-if="loading" class="py-16 text-center text-sm text-gray-500">Loading…</div>

      <!-- ══ BEST PICKS ═════════════════════════════════════════════════ -->
      <template v-else-if="tab === 'picks'">
        <div class="mb-4 rounded-lg border border-gray-200 dark:border-white/10
                    bg-white dark:bg-white/[0.03] p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <label class="block">
            <span class="ctl-k">Minimum win probability</span>
            <select v-model.number="minProbability" class="ctl">
              <option :value="0.5">Any</option>
              <option :value="0.52">52%</option>
              <option :value="0.55">55%</option>
              <option :value="0.58">58%</option>
              <option :value="0.6">60%</option>
            </select>
          </label>
          <label class="block">
            <span class="ctl-k">App</span>
            <select v-model="bookFilter" class="ctl">
              <option value="">All</option>
              <option v-for="b in availableDfsBooks" :key="b" :value="b">{{ bookLabel(b) }}</option>
            </select>
          </label>
          <label class="flex items-end gap-2 pb-1">
            <input v-model="requireRealPrices" type="checkbox" class="w-4 h-4" />
            <span class="text-xs text-gray-600 dark:text-gray-400">Real prices only</span>
          </label>
          <label class="flex items-end gap-2 pb-1">
            <input v-model="useSample" type="checkbox" class="w-4 h-4" />
            <span class="text-xs text-gray-600 dark:text-gray-400">Sample data</span>
          </label>
        </div>

        <div v-if="board.length === 0" class="empty">
          <p class="font-semibold mb-1">Nothing on the board</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">{{ emptyReason }}</p>
        </div>

        <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
          <table class="w-full text-sm">
            <thead class="thead">
              <tr>
                <th class="th text-left w-8"></th>
                <th class="th text-left">Pick</th>
                <th class="th text-left">App</th>
                <th class="th text-right">Line</th>
                <th class="th text-right">Market has it</th>
                <th class="th text-right">Off by</th>
                <th class="th text-right">Win prob</th>
                <th class="th text-left">Basis</th>
                <th class="th text-right">Age</th>
                <th class="th"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in board" :key="i"
                  class="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  :class="selected.has(pickKey(p)) ? 'bg-emerald-50 dark:bg-emerald-500/5' : ''">
                <td class="td text-gray-400 font-mono text-xs">{{ i + 1 }}</td>
                <td class="td">
                  <div class="font-semibold">{{ p.player }}</div>
                  <div class="text-xs text-gray-500">
                    {{ marketLabel(p.marketKey) }} ·
                    <span class="font-semibold"
                          :class="p.side === 'Over' ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'">
                      {{ p.side }}
                    </span>
                  </div>
                </td>
                <td class="td">
                  {{ bookLabel(p.book) }}
                  <span v-if="p.manual" class="badge-tiny">typed</span>
                </td>
                <td class="td text-right font-mono">{{ p.offeredPoint }}</td>
                <td class="td text-right font-mono text-gray-500">{{ p.marketLine.toFixed(1) }}</td>
                <td class="td text-right font-mono font-semibold">{{ p.edgeUnits.toFixed(1) }}</td>
                <td class="td text-right font-mono font-bold"
                    :class="p.probability >= 0.58 ? 'text-emerald-600 dark:text-emerald-400'
                                                  : 'text-emerald-700/70 dark:text-emerald-400/70'">
                  {{ (p.probability * 100).toFixed(1) }}%
                </td>
                <td class="td">
                  <span class="badge-tiny" :class="confidenceClass(p.confidence)">{{ p.confidence }}</span>
                  <span class="block text-[10px] text-gray-500 mt-0.5">
                    {{ p.anchorBooks.map(bookLabel).join(', ') }}
                  </span>
                </td>
                <td class="td text-right text-xs"
                    :class="ageSeconds(p.observedAt) > 3600 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'">
                  {{ timeAgo(p.observedAt) }}
                </td>
                <td class="td text-right">
                  <button class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-white/15"
                          @click="toggleSelect(p)">
                    {{ selected.has(pickKey(p)) ? 'Remove' : 'Add' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="board.length" class="mt-3 text-[11px] text-gray-500 leading-relaxed max-w-3xl">
          Ranked by win probability, not by how far the line has moved. A six yard gap on a receiving line
          is worth less than a two yard gap on a passing line, because receiving yards swing much harder.
          A pick marked <strong>modeled</strong> means the market never priced that exact number, so the
          probability comes from a fitted curve rather than a real price. Treat those as weaker.
        </p>

        <!-- ── Entry builder ────────────────────────────────────────────── -->
        <section v-if="selectedPicks.length" class="mt-8">
          <h2 class="text-lg font-bold mb-3">Entry ({{ selectedPicks.length }} picks)</h2>
          <div class="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
            <ul class="mb-4 space-y-1">
              <li v-for="(p, i) in selectedPicks" :key="i" class="text-sm flex justify-between gap-4">
                <span>{{ p.player }} {{ p.side.toLowerCase() }} {{ p.offeredPoint }} {{ marketLabel(p.marketKey) }}</span>
                <span class="font-mono text-gray-500">{{ (p.probability * 100).toFixed(1) }}%</span>
              </li>
            </ul>

            <div v-if="entryResults.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="thead">
                  <tr>
                    <th class="th text-left">Structure</th>
                    <th class="th text-right">All hit</th>
                    <th class="th text-right">Payout</th>
                    <th class="th text-right">EV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in entryResults" :key="r.structure.name"
                      class="border-t border-gray-100 dark:border-white/5">
                    <td class="td">{{ r.structure.name }}</td>
                    <td class="td text-right font-mono">{{ (r.probAllHit * 100).toFixed(1) }}%</td>
                    <td class="td text-right font-mono text-gray-500">
                      {{ r.structure.payouts[r.structure.legs] }}x
                    </td>
                    <td class="td text-right font-mono font-bold"
                        :class="r.ev > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                      {{ r.ev > 0 ? '+' : '' }}{{ (r.ev * 100).toFixed(1) }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-gray-500">
              No payout structure matches {{ selectedPicks.length }} picks. Add or remove one.
            </p>

            <div v-if="sameGameNote" class="mt-3 text-[12px] text-sky-700 dark:text-sky-300">
              {{ sameGameNote }}
            </div>

            <p class="mt-3 text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
              The payout multipliers used here are placeholders shaped after commonly published
              PrizePicks tables. They are not verified against Sleeper, whose numbers are not published
              anywhere I could confirm, and every app changes them. Check the multiplier in the app before
              trusting any EV figure above, because a wrong payout table produces confidently wrong output.
            </p>
          </div>
        </section>

        <!-- ── Manual Sleeper line entry ────────────────────────────────── -->
        <section class="mt-8">
          <h2 class="text-lg font-bold mb-1">Add a Sleeper line</h2>
          <p class="text-[12px] text-gray-500 mb-3 max-w-2xl leading-relaxed">
            Sleeper publishes no picks API and no feed we can afford carries it, so its lines get typed in.
            Once entered, a Sleeper line is scored against exactly the same market anchor as everything else.
          </p>
          <div class="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4
                      grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <label class="block"><span class="ctl-k">Player</span>
              <input v-model="manual.player" list="known-players" class="ctl" placeholder="Bijan Robinson" /></label>
            <datalist id="known-players">
              <option v-for="n in knownPlayers" :key="n" :value="n" />
            </datalist>
            <label class="block"><span class="ctl-k">Stat</span>
              <select v-model="manual.marketKey" class="ctl">
                <option v-for="k in knownMarkets" :key="k" :value="k">{{ marketLabel(k) }}</option>
              </select></label>
            <label class="block"><span class="ctl-k">Line</span>
              <input v-model.number="manual.point" type="number" step="0.5" class="ctl" /></label>
            <label class="block"><span class="ctl-k">Game</span>
              <select v-model="manual.eventId" class="ctl">
                <option v-for="e in eventOptions" :key="e.id" :value="e.id">{{ e.label }}</option>
              </select></label>
            <button class="px-3 py-2 rounded text-sm font-semibold
                           bg-gray-900 text-white dark:bg-white dark:text-gray-900 disabled:opacity-40"
                    :disabled="!canSaveManual || savingManual" @click="submitManual">
              {{ savingManual ? 'Saving…' : 'Add line' }}
            </button>
          </div>
          <p v-if="manualMessage" class="mt-2 text-xs"
             :class="manualError ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
            {{ manualMessage }}
          </p>
        </section>

        <!-- ── App agreement ────────────────────────────────────────────── -->
        <section v-if="spread.length" class="mt-8">
          <h2 class="text-lg font-bold mb-1">How far apart are the apps?</h2>
          <p class="text-[12px] text-gray-500 mb-3 max-w-2xl leading-relaxed">
            This is the number that decides whether a paid Sleeper feed is worth anything. If PrizePicks and
            Underdog keep landing within half a point of each other, a typed Sleeper line will too and the
            stand-in is fine. If they scatter, the apps are pricing independently and using one for another
            is guesswork.
          </p>
          <div class="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            <table class="w-full text-sm">
              <thead class="thead"><tr>
                <th class="th text-left">Player</th><th class="th text-left">Stat</th>
                <th class="th text-left">Lines</th><th class="th text-right">Spread</th>
              </tr></thead>
              <tbody>
                <tr v-for="(s, i) in spread" :key="i" class="border-t border-gray-100 dark:border-white/5">
                  <td class="td">{{ s.player }}</td>
                  <td class="td text-gray-500">{{ marketLabel(s.marketKey) }}</td>
                  <td class="td font-mono text-xs">
                    {{ s.lines.map(l => `${bookLabel(l.book)} ${l.point}`).join('  ·  ') }}
                  </td>
                  <td class="td text-right font-mono font-semibold"
                      :class="s.spread >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'">
                    {{ s.spread.toFixed(1) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <!-- ══ HARD ROCK ══════════════════════════════════════════════════ -->
      <template v-else>
        <div v-if="sportsbookRows.length === 0" class="empty">
          <p class="font-semibold mb-1">No Hard Rock edges right now</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            With one sportsbook there is no line shopping, so this list is short by nature. An empty board
            here usually means Hard Rock is priced in line with the market, which is information rather
            than a failure. The pick'em side is where the volume is.
          </p>
        </div>
        <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
          <table class="w-full text-sm">
            <thead class="thead"><tr>
              <th class="th text-left">Bet</th><th class="th text-left">Book</th>
              <th class="th text-right">Offered</th><th class="th text-right">Fair</th>
              <th class="th text-right">EV</th><th class="th text-right">Stake</th>
              <th class="th text-right">Age</th>
            </tr></thead>
            <tbody>
              <tr v-for="(r, i) in sportsbookRows" :key="i" class="border-t border-gray-100 dark:border-white/5">
                <td class="td">
                  <div class="font-semibold">{{ r.player || eventLabel(r.eventId) }}</div>
                  <div class="text-xs text-gray-500">
                    {{ marketLabel(r.marketKey) }} · {{ r.outcome }}<span v-if="r.point !== null"> {{ r.point }}</span>
                  </div>
                </td>
                <td class="td">{{ bookLabel(r.book) }}</td>
                <td class="td text-right font-mono">{{ formatAmerican(r.offeredAmerican) }}</td>
                <td class="td text-right font-mono text-gray-500">{{ formatAmerican(r.fairAmerican) }}</td>
                <td class="td text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{{ (r.ev * 100).toFixed(1) }}%
                </td>
                <td class="td text-right font-mono">${{ (r.suggestedStake * bankroll).toFixed(2) }}</td>
                <td class="td text-right text-xs text-gray-500">{{ timeAgo(r.observedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { screen } from '@/services/betting/ev'
import { formatAmerican } from '@/services/betting/odds'
import { DEFAULT_CONFIG } from '@/services/betting/types'
import type { EdgeRow, Market } from '@/services/betting/types'
import { buildBoard, dfsLineSpread } from '@/services/betting/picksBoard'
import type { BoardPick, DfsOffer } from '@/services/betting/picksBoard'
import { evaluateEntry, DEFAULT_STRUCTURES } from '@/services/betting/pickem'
import type { EntryEvaluation, ProbabilityConfidence } from '@/services/betting/pickem'
import { FL_SPORTSBOOKS, DFS_BOOKS } from '@/services/betting/constants'
import {
  loadUpcomingEvents, loadMarkets, loadFetchHealth, loadManualLines, saveManualLine,
  marketLabel, bookLabel,
} from '@/services/betting/repository'
import type { FetchHealth, OddsEvent } from '@/services/betting/repository'
import { sampleMarkets, sampleManualLines, SAMPLE_EVENT } from '@/services/betting/sampleMarkets'

const { isAdmin } = useFeatureAccess()

const loading = ref(true)
const useSample = ref(false)
const tab = ref<'picks' | 'book'>('picks')
const bankroll = ref(1000)

const minProbability = ref(0.52)
const requireRealPrices = ref(false)
const bookFilter = ref('')

const events = ref<OddsEvent[]>([])
const liveMarkets = ref<Market[]>([])
const liveManual = ref<DfsOffer[]>([])
const health = ref<FetchHealth>({
  lastRunAt: null, lastRunOk: null, lastError: null,
  creditsRemaining: null, creditsUsedThisMonth: 0,
})

const markets = computed<Market[]>(() => useSample.value ? sampleMarkets() : liveMarkets.value)
const manualOffers = computed<DfsOffer[]>(() => useSample.value ? sampleManualLines() : liveManual.value)

const board = computed<BoardPick[]>(() => {
  const all = buildBoard(markets.value, manualOffers.value, {
    minProbability: minProbability.value,
    requireRealPrices: requireRealPrices.value,
  })
  return bookFilter.value ? all.filter(p => p.book === bookFilter.value) : all
})

const modeledCount = computed(() => board.value.filter(p => p.confidence === 'modeled').length)
const spread = computed(() => dfsLineSpread(markets.value))

const availableDfsBooks = computed(() => {
  const found = new Set<string>()
  for (const m of markets.value) for (const q of m.quotes) if (DFS_BOOKS.includes(q.book)) found.add(q.book)
  for (const o of manualOffers.value) found.add(o.book)
  return [...found].sort()
})

/** Sportsbook tab: same screener as before, narrowed to what Florida allows. */
const sportsbookRows = computed<EdgeRow[]>(() =>
  screen(markets.value, DEFAULT_CONFIG).filter(r => FL_SPORTSBOOKS.includes(r.book))
)

const tabs = computed(() => [
  { id: 'picks' as const, label: 'Best picks', count: board.value.length },
  { id: 'book' as const, label: 'Hard Rock', count: sportsbookRows.value.length },
])

// ── Entry builder ────────────────────────────────────────────────────────────
const selected = ref(new Set<string>())
const pickKey = (p: BoardPick) => `${p.book}|${p.player}|${p.marketKey}|${p.offeredPoint}`

function toggleSelect(p: BoardPick) {
  const k = pickKey(p)
  const next = new Set(selected.value)
  next.has(k) ? next.delete(k) : next.add(k)
  selected.value = next
}

const selectedPicks = computed(() => board.value.filter(p => selected.value.has(pickKey(p))))

const entryResults = computed<EntryEvaluation[]>(() => {
  const legs = selectedPicks.value.map(p => ({
    player: p.player, marketKey: p.marketKey, side: p.side,
    offeredPoint: p.offeredPoint, probability: p.probability,
    eventId: p.eventId, confidence: p.confidence,
  }))
  return DEFAULT_STRUCTURES
    .filter(s => s.legs === legs.length)
    .map(s => evaluateEntry(legs, s))
    .filter((r): r is EntryEvaluation => r !== null)
})

const sameGameNote = computed(() => {
  const r = entryResults.value[0]
  if (!r || r.sameGameLegs === 0) return ''
  return `${r.sameGameLegs} of these picks are from the same game, so they move together. That raises the ` +
         `chance of hitting all of them and lowers the chance of landing in the middle, which helps a power ` +
         `play and cuts both ways on a flex. Correlation of ${r.rhoUsed} has been applied.`
})

// ── Manual line entry ────────────────────────────────────────────────────────
const manual = ref({ player: '', marketKey: 'player_rush_yds', point: null as number | null, eventId: '' })
const savingManual = ref(false)
const manualMessage = ref('')
const manualError = ref(false)

const knownPlayers = computed(() =>
  [...new Set(markets.value.map(m => m.player).filter((p): p is string => !!p))].sort()
)
const knownMarkets = computed(() =>
  [...new Set(markets.value.filter(m => m.player).map(m => m.marketKey))].sort()
)
const eventOptions = computed(() => {
  if (useSample.value) return [{ id: SAMPLE_EVENT.id, label: `${SAMPLE_EVENT.away_team} at ${SAMPLE_EVENT.home_team}` }]
  return events.value.map(e => ({ id: e.id, label: `${e.away_team} at ${e.home_team}` }))
})

const canSaveManual = computed(() =>
  !!manual.value.player && !!manual.value.marketKey &&
  typeof manual.value.point === 'number' && !!manual.value.eventId
)

async function submitManual() {
  if (!canSaveManual.value) return
  savingManual.value = true
  manualMessage.value = ''
  try {
    const res = await saveManualLine({
      player: manual.value.player.trim(),
      marketKey: manual.value.marketKey,
      point: manual.value.point as number,
      eventId: manual.value.eventId,
    })
    manualError.value = !res.ok
    manualMessage.value = res.ok
      ? `Saved ${manual.value.player} ${manual.value.point}. It is on the board.`
      : `Could not save: ${res.error}`
    if (res.ok) {
      manual.value.player = ''
      manual.value.point = null
      liveManual.value = await loadManualLines()
    }
  } finally {
    savingManual.value = false
  }
}

// ── Presentation helpers ─────────────────────────────────────────────────────
function confidenceClass(c: ProbabilityConfidence): string {
  if (c === 'exact') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
  if (c === 'interpolated') return 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
}

function eventLabel(eventId: string): string {
  if (eventId === SAMPLE_EVENT.id) return `${SAMPLE_EVENT.away_team} at ${SAMPLE_EVENT.home_team}`
  const e = events.value.find(x => x.id === eventId)
  return e ? `${e.away_team} at ${e.home_team}` : eventId
}

function ageSeconds(iso: string): number { return (Date.now() - new Date(iso).getTime()) / 1000 }

function timeAgo(iso: string): string {
  const s = ageSeconds(iso)
  if (s < 60) return `${Math.round(s)}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

/** An empty board has several causes and they need different responses. */
const emptyReason = computed(() => {
  if (markets.value.length === 0) {
    if (!health.value.lastRunAt) return 'The refresh job has not run yet. Set ODDS_API_KEY in Vercel, then hit /api/betting/refresh-odds.'
    if (health.value.lastRunOk === false) return `The last refresh failed: ${health.value.lastError || 'unknown error'}`
    if (health.value.creditsRemaining !== null && health.value.creditsRemaining <= 0)
      return 'The monthly credit allowance is spent. Nothing new loads until it resets.'
    return 'The refresh ran but stored nothing, most likely because no games fall inside the lookahead window.'
  }
  return `${markets.value.length} markets loaded and no pick clears ${(minProbability.value * 100).toFixed(0)}%. ` +
         `That is a normal result: it means the apps have the lines about where the market does.`
})

async function load() {
  loading.value = true
  try {
    const [evts, h, man] = await Promise.all([loadUpcomingEvents(), loadFetchHealth(), loadManualLines()])
    events.value = evts
    health.value = h
    liveManual.value = man
    liveMarkets.value = await loadMarkets(evts.map(e => e.id))
    if (liveMarkets.value.length === 0) useSample.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (isAdmin.value) load() })
watch(() => isAdmin.value, v => { if (v) load() })
watch(useSample, () => { selected.value = new Set() })
</script>

<style scoped>
.ctl {
  @apply w-full rounded border border-gray-300 dark:border-white/15
         bg-white dark:bg-white/5 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100;
}
.ctl-k { @apply block text-[10px] uppercase tracking-wider text-gray-500 mb-1; }
.th { @apply px-3 py-2 font-semibold; }
.td { @apply px-3 py-2.5 align-top; }
.thead { @apply bg-gray-100 dark:bg-white/[0.04] text-[10px] uppercase tracking-wider text-gray-500; }
.stat { @apply rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2.5; }
.stat-k { @apply text-[10px] uppercase tracking-wider text-gray-500; }
.stat-v { @apply text-sm font-semibold mt-0.5; }
.empty { @apply rounded-lg border border-dashed border-gray-300 dark:border-white/15 py-16 px-6 text-center; }
.badge-amber { @apply px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide
                     bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300; }
.badge-pink { @apply px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide
                    bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300; }
.badge-plain { @apply px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide
                     bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300; }
.badge-tiny { @apply inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold
                    bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300; }
</style>
