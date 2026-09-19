<script setup lang="ts">
/**
 * The hockey draft board.
 *
 * YOU MARK THE PICKS, AND EVERYTHING ELSE IS DERIVED. ESPN does not publish an in-progress
 * draft — measured against a live one, mDraftDetail returned inProgress:true with all 220
 * picks empty, every roster came back with zero players, and the draft-room feed that does
 * carry picks answered 401 because it belongs to a league member's session. So a board that
 * waits to be told what happened waits until the draft is over.
 *
 * Marking a pick therefore drives the whole surface: the board re-prices, the clock advances,
 * your roster fills, and the needs list updates. One input, no feed to go stale.
 *
 * The one number worth understanding is the left-hand column. Players are ordered by value
 * over REPLACEMENT, not by projected points, and in hockey those disagree constantly: a
 * defenceman competes for a seat that is far cheaper to fill badly than a forward's, so he
 * can rank above forwards who outscore him. Both numbers are on every row so the
 * disagreement is visible rather than something to take on faith.
 */
import { computed, onUnmounted, ref, watchEffect } from 'vue'
import { useHockeyBoard } from '@/composables/useHockeyBoard'

const {
  loading, problem, rules, rows, replacement, unnamedScoredStatIds,
  mode, categoryKeys, contestedKeys, perCategoryByKey,
  punted, togglePunt, clearPunts,
  drafted, take, undo, undoLast, reset, load,
  live, liveError, liveState, lastSyncedAt, myTeamId, teamNames, clock, goLive, goMock, syncDraft,
  mockOrder, mySlot, draftKind, position, myPlayers, roster, vona,
} = useHockeyBoard()

/*
 * TWO QUESTIONS, AND THEY GIVE DIFFERENT ANSWERS.
 *
 * "Value" ranks by value over replacement — who is best. "Cost of waiting" ranks by VONA —
 * how much you lose by passing, measured against whoever is expected to survive to your next
 * pick. The best player available is often one nobody else wants for two more rounds, and
 * taking him spends a pick you could have spent on the man who will certainly be gone.
 */
const SORTS = [
  { key: 'value', label: 'value', hint: 'Value over replacement — who is best' },
  { key: 'vona', label: 'cost of waiting', hint: 'What you lose by passing, against who survives to your next pick' },
] as const
const sortBy = ref<'value' | 'vona'>('value')
/* The simulation needs a seat and picks still to come. On the clock there is nothing between
   now and your turn, so the column stays empty rather than showing zeros that look like a
   reading. */
const hasVona = computed(() => vona.value.picksSimulated > 0)
const survivalOf = (key: string) => vona.value.survival[key]
const vonaOf = (key: string) => vona.value.vona[key]

/* Draft seats are one-based to a human and zero-based to the order array. */
const slotOptions = computed(() =>
  Array.from({ length: rules.value?.teams ?? 0 }, (_, i) => ({ value: i, label: `Pick ${i + 1}` })),
)
const nameOf = (key: string) => nameCache.get(key) ?? key

/* Type a few letters, press Enter, the top match comes off the board. A draft moves faster
   than a scroll-and-click, and the whole point of marking picks by hand is that it has to
   keep up with the room. */
const query = ref('')
const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return rows.value.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 6)
})
function takeTop() {
  const first = matches.value[0]
  if (first) { take(first.playerKey); query.value = '' }
}

/** Highlight a row that fills a hole rather than adding to a surplus. */
const fillsNeed = (pos: string) => roster.value.needs.includes(pos)

/*
 * Injury is FLAGGED AND NOT DISCOUNTED, and the label has to carry that without a paragraph.
 * ESPN's projection already accounts for the missed games — Makar is projected 78 of 82,
 * Bedard 64 — so the number beside the flag is already the injured player's number. Charging
 * the injury again would be double counting; saying nothing left him sixth on the board with
 * no mark on him at all.
 */
const INJURY_LABEL: Record<string, string> = {
  OUT: 'OUT', INJURY_RESERVE: 'IR', DAY_TO_DAY: 'DTD', SUSPENSION: 'SUSP',
}
const injuryTag = (s: string | null | undefined) => (s ? INJURY_LABEL[s] ?? s : '')

/* Rounds of disagreement with the room, shown only past a full round — a badge on every row
   carries as much information as a badge on none. */
const marketTag = (r: any) => {
  if (!r?.marketFlag) return ''
  const n = Math.abs(r.marketRounds ?? 0)
  return `${r.marketFlag === 'value' ? '+' : '-'}${n < 10 ? n.toFixed(1) : Math.round(n)}r`
}

const teamOptions = computed(() =>
  Object.entries(teamNames.value).map(([id, name]) => ({ id: Number(id), name })),
)
const onTheClockName = computed(() => {
  const id = clock.value.onTheClockTeamId
  return id === null ? '' : (teamNames.value[id] ?? `Team ${id}`)
})
/* A relative timestamp has to be driven by a clock, not by the value it describes, or it
   reads "0s ago" until the next poll regardless of how long that takes. */
const nowTick = ref(Date.now())
const ticker = setInterval(() => { nowTick.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(ticker))

const syncedAgo = computed(() => {
  if (!lastSyncedAt.value) return ''
  const s = Math.round((nowTick.value - lastSyncedAt.value) / 1000)
  return s < 5 ? 'just now' : `${s}s ago`
})

const isCategories = computed(() => mode.value === 'categories')

/* The second column is a different quantity in each mode and must not wear the same label.
   In a points league it is projected points; in a category league it is a sum of z-scores,
   which is a number of standard deviations and means nothing if read as points. */
const ownLabel = computed(() => (isCategories.value ? 'z' : 'pts'))
const ownHint = computed(() =>
  isCategories.value
    ? 'His own total across the league\'s categories, in standard deviations'
    : 'His own projected points in this league\'s scoring',
)
const valueHint = 'Value over replacement — what he\'s worth above the last startable player at his seat'

/* Two decimals for z-scores, whole numbers for points: rounding a z to the nearest integer
   would collapse most of a draft board into three distinct values. */
const shown2 = (n: number | undefined) =>
  isCategories.value ? (n ?? 0).toFixed(2) : String(Math.round(n ?? 0))

/* Only the contested columns belong in a player's one-line reason: a punted column is one
   this manager has stopped caring about, and showing "GAA +2.1" beside a goalie you are not
   contesting wins with is an argument for a pick you have decided against. */
const isContested = (key: string) => contestedKeys.value.includes(key)

/* A signed number, so a best column that happens to be negative reads "-0.3" rather than
   "+-0.3". It happens: a player can lead his own profile in a column he is still below
   average in, which is exactly the case worth showing honestly. */
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`

/** The columns a player is best and worst in, for the one-line reason on his row. */
function edge(playerKey: string): string {
  const per = perCategoryByKey.value[playerKey]
  if (!per) return ''
  const sorted = Object.entries(per).filter(([k]) => isContested(k)).sort((a, b) => b[1] - a[1])
  if (!sorted.length) return ''
  const [bestKey, bestZ] = sorted[0]
  const [worstKey, worstZ] = sorted[sorted.length - 1]
  if (sorted.length === 1 || worstZ >= 0) return `${bestKey} ${signed(bestZ)}`
  return `${bestKey} ${signed(bestZ)} · ${worstKey} ${signed(worstZ)}`
}

const POSITIONS = ['ALL', 'C', 'LW', 'RW', 'D', 'G'] as const
const filter = ref<(typeof POSITIONS)[number]>('ALL')
const LIMIT = 60

const shown = computed(() => {
  const base = filter.value === 'ALL'
    ? rows.value
    : rows.value.filter((r) => r.position === filter.value)
  const ordered = sortBy.value === 'vona' && hasVona.value
    ? [...base].sort((a, b) => (vonaOf(b.playerKey) ?? -1e9) - (vonaOf(a.playerKey) ?? -1e9))
    : base
  return ordered.slice(0, LIMIT)
})
/* Names, not ESPN's numeric ids. The chips are how you undo a misclick, and "4233563 x" is
   not something anybody can undo with confidence. Kept as a map built from every row we have
   ever seen, because a player drops off `rows` the moment he is taken. */
const nameCache = new Map<string, string>()
watchEffect(() => { for (const r of rows.value) nameCache.set(r.playerKey, r.name) })
const takenList = computed(() =>
  [...drafted.value].map((key) => ({ key, name: nameCache.get(key) ?? key })),
)

/* Tone by position so the eye can group a board that mixes five of them. */
const POS_TONE: Record<string, string> = {
  C: 'text-[#7ee787]', LW: 'text-[#3fb950]', RW: 'text-[#56d364]',
  D: 'text-[#7FC8FF]', G: 'text-[#e69a4a]',
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">Hockey draft board</h1>
      <p class="font-mono text-xs text-dark-textMuted">
        Ranked by value over replacement &middot;
        <span v-if="live && liveState?.complete">draft complete &mdash; best available</span>
        <span v-else-if="live">following your ESPN draft</span>
        <span v-else>a mock board, nothing is synced to your draft</span>
      </p>
      <p v-if="rules" class="mt-1 font-mono text-[11px] text-dark-textMuted/70">
        {{ rules.name }} &middot; {{ rules.teams }} teams &middot; {{ rules.scoringType }}
        &middot; {{ Object.entries(rules.slots).map(([s, n]) => `${n} ${s}`).join(' · ') }}
      </p>
    </header>

    <div v-if="loading" class="py-16 text-center font-mono text-sm text-dark-textMuted">
      Building the board&hellip;
    </div>

    <!-- A stated reason, never an empty board with no explanation. -->
    <div v-else-if="problem" class="rounded-xl border border-[#e69a4a]/30 bg-[#e69a4a]/5 p-4">
      <p class="font-mono text-xs text-[#e69a4a]">{{ problem }}</p>
      <button class="mt-3 rounded-lg border border-dark-border px-3 py-1.5 font-mono text-[11px] text-dark-text hover:border-primary"
              @click="load()">Try again</button>
    </div>

    <template v-else>
      <!--
        The gap, said out loud. If the league pays for a stat we cannot identify, every total
        on this page is short by whatever it was worth — and a board that hides that looks
        exactly like one with nothing missing.
      -->
      <p v-if="unnamedScoredStatIds.length"
         class="mb-3 rounded-lg border border-[#e69a4a]/30 bg-[#e69a4a]/5 px-3 py-2 font-mono text-[11px] text-[#e69a4a]">
        This league scores {{ unnamedScoredStatIds.length }} stats we can't yet identify
        (ESPN ids {{ unnamedScoredStatIds.join(', ') }}). Every total below is short by whatever
        they're worth.
      </p>

      <!--
        A category league is priced in a different currency, and saying so is not decoration:
        a reader who assumes these are points will read a 6.2 as a bad season rather than as
        an excellent one.
      -->
      <!--
        PUNT CONTROLS. You win a week by taking more columns than your opponent, not by being
        good at all of them, so conceding two on purpose is a plan rather than a surrender —
        and it changes what every player is worth to YOU. A goalie is a first-round pick or an
        afterthought depending on whether you are contesting wins. Clicking a column off
        re-prices the entire board, including the pool the other columns are measured against.
      -->
      <div v-if="isCategories" class="mb-3 rounded-xl border border-dark-border bg-dark-card p-3">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">categories you're contesting</p>
          <button v-if="punted.size"
                  class="font-mono text-[10px] text-dark-textMuted underline decoration-dotted hover:text-dark-text"
                  @click="clearPunts()">contest everything</button>
        </div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <button v-for="k in categoryKeys" :key="k"
                  class="rounded-lg border px-2 py-1 font-mono text-[11px] transition-colors"
                  :class="punted.has(k)
                    ? 'border-dark-border text-dark-textMuted/40 line-through'
                    : 'border-primary/40 text-primary'"
                  :title="punted.has(k) ? `Punting ${k} — click to contest it again` : `Contesting ${k} — click to punt it`"
                  @click="togglePunt(k)">{{ k }}</button>
        </div>
        <p class="mt-2 font-mono text-[10px] leading-relaxed text-dark-textMuted">
          <template v-if="punted.size">
            Punting {{ [...punted].join(', ') }}. Everyone below is priced on the
            {{ contestedKeys.length }} you're still contesting &mdash; a player who was only
            valuable in a column you've conceded is worth nothing to you now.
          </template>
          <template v-else>
            Measured in standard deviations across all {{ categoryKeys.length }} columns, not in
            points. A column everybody is level in is worth nothing however big its numbers.
            Click one off to punt it.
          </template>
        </p>
      </div>

      <!--
        MOCK OR LIVE, CHOSEN DELIBERATELY. Live is never switched on for the user: a board
        that began following a real draft on its own would look exactly like a mock one right
        up to the moment it removed a player nobody in this room had taken.
      -->
      <div class="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-dark-border bg-dark-card p-2.5">
        <div class="flex rounded-lg border border-dark-border">
          <button class="rounded-l-lg px-2.5 py-1 font-mono text-[11px] transition-colors"
                  :class="!live ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                  @click="goMock()">I'll mark picks</button>
          <button class="rounded-r-lg px-2.5 py-1 font-mono text-[11px] transition-colors"
                  :class="live ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                  title="ESPN does not publish an in-progress draft — this only fills in once the draft is over"
                  @click="goLive()">follow ESPN</button>
        </div>

        <select v-if="!live" v-model.number="mySlot"
                class="rounded-lg border border-dark-border bg-dark-bg px-2 py-1 font-mono text-[11px] text-dark-text">
          <option :value="null">which pick is yours?</option>
          <option v-for="o in slotOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select v-if="!live" v-model="draftKind"
                class="rounded-lg border border-dark-border bg-dark-bg px-2 py-1 font-mono text-[11px] text-dark-textMuted">
          <option value="snake">snake</option>
          <option value="linear">linear</option>
        </select>

        <template v-if="live">
          <select v-model.number="myTeamId"
                  class="rounded-lg border border-dark-border bg-dark-bg px-2 py-1 font-mono text-[11px] text-dark-text">
            <option :value="null">which team is yours?</option>
            <option v-for="t in teamOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <span class="flex-1"></span>
          <span class="font-mono text-[10px] text-dark-textMuted/70">
            synced {{ syncedAgo }}
          </span>
          <button class="rounded-lg border border-dark-border px-2 py-1 font-mono text-[10px] text-dark-textMuted hover:text-dark-text"
                  @click="syncDraft()">refresh</button>
        </template>
        <template v-else>
          <span class="flex-1"></span>
          <button v-if="mockOrder.length"
                  class="rounded-lg border border-dark-border px-2 py-1 font-mono text-[10px] text-dark-textMuted hover:text-dark-text"
                  @click="undoLast()">undo last</button>
        </template>
      </div>

      <!--
        SAID PLAINLY, BECAUSE THE FAILURE IS INVISIBLE OTHERWISE. A live draft returns
        inProgress:true with every pick empty, so this tab looks like it is working and simply
        never removes anybody. That is worse than an error.
      -->
      <p v-if="live"
         class="mb-3 rounded-lg border border-[#e69a4a]/30 bg-[#e69a4a]/5 px-3 py-2 font-mono text-[11px] text-[#e69a4a]">
        ESPN does not publish picks while a draft is running &mdash; its API reports the draft
        in progress with every pick empty. This tab will fill in once the draft is over. During
        one, use &ldquo;I'll mark picks&rdquo;.
      </p>

      <p v-if="live && liveError"
         class="mb-3 rounded-lg border border-[#FF5C5C]/30 bg-[#FF5C5C]/5 px-3 py-2 font-mono text-[11px] text-[#FF5C5C]">
        {{ liveError }}
      </p>

      <!-- The draft clock. picksUntilMine is the number a drafter actually plans against. -->
      <div v-if="live && liveState && liveState.picks.length"
           class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 font-mono text-[11px]">
        <span v-if="liveState.complete" class="text-dark-textMuted">
          Draft complete &middot; {{ drafted.size }} players off the board. Everyone below is a
          free agent, priced against what is left rather than against a full pool.
        </span>
        <template v-else>
          <span class="text-dark-text">
            Pick {{ clock.nextOverall }} &middot; <span class="text-primary">{{ onTheClockName }}</span> on the clock
          </span>
          <span v-if="clock.picksUntilMine === 0" class="font-semibold text-primary">You're up.</span>
          <span v-else-if="clock.picksUntilMine !== null" class="text-dark-textMuted">
            {{ clock.picksUntilMine }} pick{{ clock.picksUntilMine === 1 ? '' : 's' }} until yours
            (#{{ clock.myNextOverall }}<span v-if="clock.myFollowingOverall">, then #{{ clock.myFollowingOverall }}</span>)
          </span>
          <span v-else-if="myTeamId === null" class="text-dark-textMuted">Pick your team to see when you're up.</span>
          <span class="text-dark-textMuted/60">{{ drafted.size }} of {{ liveState.picks.length }} gone</span>
        </template>
      </div>

      <!-- The clock, derived from the picks marked. No feed involved. -->
      <div v-if="!live && rules?.teams"
           class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 font-mono text-[11px]">
        <span v-if="position.complete" class="text-dark-textMuted">Draft complete &middot; {{ mockOrder.length }} picks marked.</span>
        <template v-else>
          <span class="text-dark-text">
            Pick {{ position.pick }} &middot; round {{ position.round }}
            <span v-if="position.onTheClockSlot !== null" class="text-dark-textMuted">
              &middot; seat {{ position.onTheClockSlot + 1 }} on the clock
            </span>
          </span>
          <span v-if="position.picksUntilMine === 0" class="font-semibold text-primary">You're up.</span>
          <span v-else-if="position.picksUntilMine !== null" class="text-dark-textMuted">
            {{ position.picksUntilMine }} until yours (#{{ position.myNextPick }}<span
              v-if="position.myFollowingPick">, then #{{ position.myFollowingPick }}</span>)
          </span>
          <span v-else-if="mySlot === null" class="text-dark-textMuted">Set your pick to see when you're up.</span>
        </template>
      </div>

      <!-- Type, Enter, gone. A draft room moves faster than scroll-and-click. -->
      <div v-if="!live" class="relative mb-3">
        <input v-model="query" placeholder="mark a pick — type a name, press Enter"
               class="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 font-mono text-xs text-dark-text placeholder:text-dark-textMuted/60 focus:border-primary focus:outline-none"
               @keydown.enter.prevent="takeTop()" @keydown.esc="query = ''">
        <div v-if="matches.length" class="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-dark-border bg-dark-card shadow-xl">
          <button v-for="(m, i) in matches" :key="m.playerKey"
                  class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/5"
                  :class="i === 0 ? 'bg-white/5' : ''"
                  @click="take(m.playerKey); query = ''">
            <span class="w-8 font-mono text-[10px]" :class="POS_TONE[m.position]">{{ m.position }}</span>
            <span class="flex-1 truncate text-dark-text">{{ m.name }}</span>
            <span class="font-mono text-[10px] text-dark-textMuted">{{ shown2(m.value) }}</span>
          </button>
        </div>
      </div>

      <!-- Your roster: what is seated, what is open, what would actually help. -->
      <div v-if="rules && (( !live && mySlot !== null) || (live && myTeamId !== null))"
           class="mb-3 rounded-xl border border-dark-border bg-dark-card p-3">
        <div class="flex flex-wrap items-baseline gap-x-3">
          <p class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">your roster</p>
          <p v-if="roster.needs.length" class="font-mono text-[10px] text-dark-textMuted">
            still need <span class="text-primary">{{ roster.needs.join(', ') }}</span>
          </p>
          <p v-else-if="myPlayers.length" class="font-mono text-[10px] text-dark-textMuted">
            every starting slot filled &mdash; best available from here
          </p>
        </div>
        <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          <div v-for="sl in roster.slots" :key="sl.slot" class="font-mono text-[11px]">
            <span class="text-dark-textMuted/70">{{ sl.slot }}</span>
            <span class="ml-1.5" :class="sl.open > 0 ? 'text-dark-text' : 'text-dark-textMuted/50'">
              {{ sl.filled.length }}/{{ sl.filled.length + sl.open }}
            </span>
          </div>
          <div v-if="roster.bench.length" class="font-mono text-[11px] text-dark-textMuted/60">
            bench {{ roster.bench.length }}
          </div>
        </div>
        <div v-if="myPlayers.length" class="mt-2 flex flex-wrap gap-1.5">
          <span v-for="k in myPlayers" :key="k"
                class="rounded border border-primary/30 px-2 py-0.5 font-mono text-[10px] text-primary/90">{{ nameOf(k) }}</span>
        </div>
      </div>

      <div class="mb-3 flex flex-wrap items-center gap-2">
        <button v-for="p in POSITIONS" :key="p"
                class="rounded-lg border px-2.5 py-1 font-mono text-[11px] uppercase transition-colors"
                :class="filter === p ? 'border-primary text-primary' : 'border-dark-border text-dark-textMuted hover:text-dark-text'"
                @click="filter = p">{{ p }}</button>
        <span v-if="hasVona" class="ml-2 flex rounded-lg border border-dark-border">
          <button v-for="sopt in SORTS" :key="sopt.key"
                  class="px-2 py-1 font-mono text-[10px] transition-colors first:rounded-l-lg last:rounded-r-lg"
                  :class="sortBy === sopt.key ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                  :title="sopt.hint" @click="sortBy = sopt.key">{{ sopt.label }}</button>
        </span>
        <span class="flex-1"></span>
        <span class="font-mono text-[11px] text-dark-textMuted">{{ drafted.size }} taken</span>
        <button v-if="!live && takenList.length" class="rounded-lg border border-dark-border px-2.5 py-1 font-mono text-[11px] text-dark-textMuted hover:text-dark-text"
                @click="reset()">reset</button>
      </div>

      <p class="mb-1 flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/60">
        <span class="w-7"></span><span class="w-8">pos</span><span class="flex-1">player</span>
        <span class="w-14 text-right" :title="valueHint">vor</span>
        <span class="w-14 text-right" :title="ownHint">{{ ownLabel }}</span>
        <span class="w-12 text-right" title="ESPN's average draft position — where the room takes him">adp</span>
        <span v-if="hasVona" class="w-12 text-right"
              title="Chance he is still there at your next pick, from simulating the picks in between">lasts</span>
        <span v-if="hasVona" class="w-12 text-right"
              title="What passing on him costs, against whoever is expected to survive at his position">wait</span>
        <span class="w-14"></span>
      </p>

      <div v-for="(r, i) in shown" :key="r.playerKey"
           class="flex items-center gap-3 border-b border-dark-border/40 py-2 text-sm last:border-0">
        <span class="w-7 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/60">{{ i + 1 }}</span>
        <span class="w-8 shrink-0 font-mono text-[10px]" :class="POS_TONE[r.position]">{{ r.position }}</span>
        <span class="w-2 shrink-0 font-mono text-[10px] text-primary"
              :title="'Fills a starting slot you still have open'">{{ !live && mySlot !== null && fillsNeed(r.position) ? '•' : '' }}</span>
        <span class="min-w-0 flex-1 truncate">
          <span class="text-dark-text">{{ r.name }}</span>
          <span v-if="injuryTag(r.injuryStatus)"
                class="ml-1.5 rounded px-1 font-mono text-[9px] font-bold"
                :class="r.injuryStatus === 'DAY_TO_DAY' ? 'bg-[#e69a4a]/20 text-[#e69a4a]' : 'bg-[#FF5C5C]/20 text-[#FF5C5C]'"
                :title="'Listed ' + r.injuryStatus + ' — the projection already accounts for the games he is expected to miss'">{{ injuryTag(r.injuryStatus) }}</span>
          <span v-if="marketTag(r)"
                class="ml-1.5 font-mono text-[10px]"
                :class="r.marketFlag === 'value' ? 'text-[#7ee787]' : 'text-dark-textMuted/70'"
                :title="r.marketFlag === 'value' ? 'We rank him this many rounds ahead of where the room drafts him' : 'The room drafts him this many rounds ahead of where we rank him'">{{ marketTag(r) }}</span>
          <span v-if="isCategories && edge(r.playerKey)"
                class="ml-2 font-mono text-[10px] text-dark-textMuted/70">{{ edge(r.playerKey) }}</span>
        </span>
        <span class="w-14 shrink-0 text-right font-mono text-xs font-semibold text-dark-text">{{ shown2(r.value) }}</span>
        <span class="w-14 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ shown2(r.projected) }}</span>
        <span class="w-12 shrink-0 text-right font-mono text-[11px] text-dark-textMuted/60">{{ r.adp ? Math.round(r.adp) : '—' }}</span>
        <template v-if="hasVona">
          <!-- Tone by how safe he is: red means he will not be there, and that is the whole
               reason to take him now rather than the best name on the board. -->
          <span class="w-12 shrink-0 text-right font-mono text-[11px]"
                :class="survivalOf(r.playerKey) === undefined ? 'text-dark-textMuted/40'
                  : survivalOf(r.playerKey) < 0.35 ? 'text-[#FF5C5C]'
                  : survivalOf(r.playerKey) < 0.7 ? 'text-[#e69a4a]' : 'text-dark-textMuted/60'">
            {{ survivalOf(r.playerKey) === undefined ? '—' : Math.round(survivalOf(r.playerKey) * 100) + '%' }}
          </span>
          <span class="w-12 shrink-0 text-right font-mono text-[11px] font-semibold"
                :class="(vonaOf(r.playerKey) ?? 0) > 0 ? 'text-dark-text' : 'text-dark-textMuted/40'">
            {{ vonaOf(r.playerKey) === undefined ? '—' : shown2(vonaOf(r.playerKey)) }}
          </span>
        </template>
        <button v-if="!live" class="w-14 shrink-0 rounded border border-dark-border px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted hover:border-primary hover:text-primary"
                @click="take(r.playerKey)">take</button>
        <span v-else class="w-14 shrink-0"></span>
      </div>

      <p v-if="rows.length > LIMIT" class="mt-2 font-mono text-[10px] text-dark-textMuted">
        showing {{ shown.length }} of {{ rows.length }}
      </p>

      <!-- Replacement is the reason the order is what it is, so it belongs on the page. -->
      <div v-if="Object.keys(replacement).length" class="mt-5 rounded-xl border border-dark-border bg-dark-card p-3">
        <p class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">replacement level</p>
        <p class="mt-1 font-mono text-[11px] text-dark-textMuted">
          <span v-for="(v, pool) in replacement" :key="pool" class="mr-4">{{ pool }} {{ shown2(v) }}</span>
        </p>
        <p class="mt-1 font-mono text-[10px] text-dark-textMuted/60">
          The last startable player at each seat. A defenceman outranking a higher-scoring
          forward is this number doing its job, not a mistake.
        </p>
      </div>

      <div v-if="!live && takenList.length" class="mt-4">
        <p class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">taken</p>
        <div class="mt-1 flex flex-wrap gap-1.5">
          <button v-for="t in takenList" :key="t.key"
                  class="rounded border border-dark-border px-2 py-0.5 font-mono text-[10px] text-dark-textMuted hover:border-[#FF5C5C] hover:text-[#FF5C5C]"
                  title="Put him back" @click="undo(t.key)">{{ t.name }} &times;</button>
        </div>
      </div>
    </template>
  </div>
</template>
