<script setup lang="ts">
import { nflTeamLogo } from '@/players/nflTeamLogo'
import { computed, ref, watch } from 'vue'
import { useWeeklyBoard } from '@/composables/useWeeklyBoard'
import { winPctFromMargin } from '@/football/weeklyBoard'
import { useWinProbTrend } from '@/composables/useWinProbTrend'
import MatchupWinProbChart from '@/components/matchup/MatchupWinProbChart.vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { startableCounts, startableFraction } from '@/trades/rosterSlots'
import RankingPicker from '@/components/RankingPicker.vue'

const { board, live, currentWeek, hasCurrentLineup, loading, myTeamName, myTeamLogo, stakes, weekSource } = useWeeklyBoard()

/*
 * Header totals are summed from the ROUNDED row values, not rounded from the raw sum.
 * Rounding the true total gave 142 above a column of nine numbers that add to 143, and a
 * reader who checks the arithmetic — exactly the reader worth having — finds the page
 * contradicting itself. The margin is derived the same way so it agrees with both totals.
 */
const myTotal = computed(() => board.value?.starters.reduce((sum, s) => sum + Math.round(s.weekPoints), 0) ?? 0)
const oppTotal = computed(() => Math.round(board.value?.matchup?.oppPoints ?? 0))
const margin = computed(() => myTotal.value - oppTotal.value)
/* Win% from the margin the page PRINTS, not the raw one. Deriving it from the unrounded
   margin put "you +8" beside "60% to win" when eight points is 62%. */
const winPct = computed(() => winPctFromMargin(margin.value))

/*
 * Win-probability trend. A daily capture keyed to league + week, so the line builds as the
 * week plays out — the one thing on this page that is a record rather than a projection.
 * It was stranded on the Matchup tab; I listed it as lost and then restored everything
 * except it.
 */
const leagueStore = useLeagueStore()
const ME = '#5ec8e6'
const OPP = '#e69a4a'
const daysRemaining = computed(() => (7 - new Date().getDay()) % 7)
const oppName = computed(() => board.value?.matchup?.opponentName ?? 'Opponent')
const trend = useWinProbTrend({
  leagueId: computed(() => leagueStore.activeLeagueId),
  week: currentWeek,
  my: winPct,
  opp: computed(() => 100 - winPct.value),
  daysRemaining,
  ready: computed(() => !!board.value?.matchup),
})

/* The strategic read, restored from the Matchup page. Volume is a baseball lever — football
   gives both rosters one game each — so the football branch talks about the lineup instead. */
const path = computed(() => {
  const m = board.value?.matchup
  const st = stakes.value
  if (!m || !st) return ''
  const lever = winPct.value >= 55
    ? 'your starters carry it — just make sure none are on bye'
    : 'the margin is in your flex spots and any start/sit you get wrong'
  switch (st.mode) {
    case 'coast':
      return st.coastKind === 'eliminated'
        ? 'Out of reach for the bracket — conserve your moves, no need to chase this week.'
        : 'Locked into the bracket — rest your guys and pick your spots.'
    case 'must-win':
      return `Must-win — empty the tank: ${lever}.`
    case 'maximize':
      return `Every win is seeding — push: ${lever}.`
    case 'clinch':
      return winPct.value >= 55
        ? 'Comfortably in and favored — bank the win, no need to overspend.'
        : "Comfortably in but an underdog — your season's fine, so don't chase it."
    default:
      return winPct.value >= 55
        ? `You're favored — protect it: ${lever}.`
        : winPct.value <= 45
          ? `Underdog this week — ${lever}.`
          : `Coin-flip week — ${lever}.`
  }
})

const teamLogo = (abbr?: string) => nflTeamLogo(abbr)
const round = (n: number) => Math.round(n)
/* Position rank always; flex rank only when the league's flex can actually take him, so a QB
   in a non-superflex league doesn't get a meaningless number beside his name. */
/* The weekly rankings board. Open by default: this is a reason to visit the page, not a
   footnote — the same reasoning that took The Wire's board out from behind a "+". */
/* The lineup detail folds; the verdict does not. Collapsed by default because "is my lineup
   right" is answered by the header alone, and the rankings board underneath was being pushed
   below the fold by three stacked lists nobody needed open at once. */
const lineupOpen = ref(false)
const boardOpen = ref(true)
const boardPos = ref('RB')
const boardPositions = computed(() => board.value?.boardPositions ?? [])
watch(boardPositions, (avail) => {
  if (avail.length && !avail.includes(boardPos.value)) boardPos.value = avail[0]
}, { immediate: true })
/* Your own players are always shown, even when they fall outside the visible top of the
   list — a board that truncates away the guy you are deciding about answers nothing. */
const BOARD_LIMIT = 30
const boardRows = computed(() => {
  const rows = board.value?.board[boardPos.value] ?? []
  const head = rows.slice(0, BOARD_LIMIT)
  const mineBelow = rows.slice(BOARD_LIMIT).filter((r) => r.owner === 'me')
  return [...head, ...mineBelow]
})
const OWNER_BADGE: Record<string, { label: string; cls: string }> = {
  me: { label: 'you', cls: 'bg-primary/15 text-primary' },
  opp: { label: 'vs', cls: 'bg-[#e69a4a]/15 text-[#e69a4a]' },
  free: { label: 'free', cls: 'bg-[#4ade80]/15 text-[#4ade80]' },
  other: { label: '', cls: '' },
}

/* Position rank only, for the seat-by-seat view — a flex rank on both sides of a duel is
   noise when the two players are already competing for the same slot. */
const posBadge = (r: { position: string; posRank: number }): string =>
  r.posRank ? `${(r.position || '').toUpperCase().split(/[,/|]/)[0]}${r.posRank}` : ''

/*
 * Same five-band scale as Trades, so a green here means what a green there means. Rank is
 * placed against the STARTABLE pool rather than shown raw: WR44 and WR51 look identical
 * otherwise, and the pool is derived from this league's own slots.
 */
const source = useActivePointsSource()
const startable = computed(() => startableCounts(source.rosterSlots.value, source.leagueSize.value))
function toneForFraction(f: number | null): string {
  if (f === null) return 'text-dark-textMuted/60'
  if (f <= 1 / 3) return 'text-[#7ee787]'
  if (f <= 2 / 3) return 'text-[#3fb950]'
  if (f <= 1) return 'text-dark-textMuted'
  if (f <= 1.5) return 'text-[#d29922]'
  return 'text-[#f85149]'
}
const posTone = (r: { position: string; posRank: number }) =>
  toneForFraction(startableFraction(r.posRank, normPos(r.position), startable.value))
/* A flex badge is measured against every body that could fill a flex seat, so the pool is
   the flex-eligible positions added together. */
const flexPool = computed(() =>
  Object.entries(startable.value)
    .filter(([pos]) => ['RB', 'WR', 'TE'].includes(pos))
    .reduce((sum, [, n]) => sum + n, 0),
)
const flexTone = (flexRank: number) =>
  toneForFraction(flexRank && flexPool.value ? flexRank / flexPool.value : null)
const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()
const posLabel = (r: { position: string; posRank: number }) =>
  r.posRank ? `${normPos(r.position)}${r.posRank}` : ''

const rankLabel = (r: { position: string; posRank: number; flexRank: number }): string => {
  const parts: string[] = []
  if (r.posRank) parts.push(`${(r.position || '').toUpperCase().split(/[,/|]/)[0]}${r.posRank}`)
  if (r.flexRank) parts.push(`FLX${r.flexRank}`)
  return parts.join(' · ')
}
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">This Week</h1>
      <p class="font-mono text-xs text-dark-textMuted">Set your lineup. Stream the edge.</p>
    </header>

    <div v-if="loading && !board" class="py-16 text-center text-dark-textMuted">Loading this week…</div>

    <!-- Offseason / no live week -->
    <div v-else-if="!live" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">No games this week</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">Weekly start/sit returns when the season kicks off — check My Team for rest-of-season value.</p>
    </div>

    <div v-else-if="!board" class="py-16 text-center text-dark-textMuted">Couldn't assemble this week's board.</div>

    <template v-else>
      <!--
        The fantasy matchup, at the top of the page you actually set your lineup on. It used
        to live on its own tab, computed from a different (baseball) model — so the margin
        there could not be checked against the rows here. Same weekly points now drive both.
      -->
      <section v-if="board.matchup" class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <div class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Week {{ currentWeek }}</div>
        <div class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onLogoErr" class="h-9 w-9 shrink-0 rounded-lg bg-dark-border object-cover" />
            <div class="min-w-0">
              <div class="truncate text-[13px] font-bold text-dark-text">{{ myTeamName }}</div>
              <div class="font-mono text-lg font-extrabold leading-none text-primary">{{ myTotal }}</div>
            </div>
          </div>
          <div class="shrink-0 text-center">
            <div class="font-mono text-[10px] text-dark-textMuted">projected</div>
            <div class="font-mono text-[11px] font-bold" :class="margin >= 0 ? 'text-primary' : 'text-[#FF5C5C]'">
              {{ margin >= 0 ? 'you +' : 'them +' }}{{ Math.abs(margin) }}
            </div>
            <div class="font-mono text-[10px] text-dark-textMuted">{{ winPct }}% to win</div>
          </div>
          <div class="flex min-w-0 items-center justify-end gap-2 text-right">
            <div class="min-w-0">
              <div class="truncate text-[13px] font-bold text-dark-text">{{ board.matchup.opponentName }}</div>
              <div class="font-mono text-lg font-extrabold leading-none text-[#e69a4a]">{{ oppTotal }}</div>
            </div>
            <img v-if="board.matchup.opponentLogo" :src="board.matchup.opponentLogo" alt="" @error="onLogoErr" class="h-9 w-9 shrink-0 rounded-lg bg-dark-border object-cover" />
          </div>
        </div>
      </section>

      <!--
        The rest of what the Matchup page held: their lineup, the season read, and the empty-slot
        warning. All of it was stranded when that tab was hidden for football, including fixes
        written for it days earlier. Closed by default — the page is still your lineup, and this
        is the evidence behind the scoreboard above.
      -->
      <section v-if="board.matchup" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <!--
          No longer collapsible. Who you're playing and how each seat matches up is the frame
          for every start/sit below it, and a decision you have to open a drawer to see is a
          decision most people never see.
        -->
        <p class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          The matchup
          <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
            · seat by seat vs {{ board.matchup.opponentName }}
          </span>
        </p>

        <div>
          <!-- Their idle starters: you can't change their lineup, but this is your real margin. -->
          <p v-if="board.matchup.oppByes.length" class="mb-3 rounded-lg bg-primary/10 px-3 py-2 font-mono text-[11px] text-primary">
            {{ board.matchup.oppByes.length }} of their starters {{ board.matchup.oppByes.length > 1 ? 'are' : 'is' }} on bye
            ({{ board.matchup.oppByes.map((o) => o.name).join(' · ') }}) — your edge is bigger than the projection says.
          </p>

          <p v-if="stakes" class="mb-1 font-mono text-[11px] text-dark-textSecondary">{{ stakes.reasoning }}</p>
          <p v-if="path" class="mb-3 text-sm text-dark-text">{{ path }}</p>

          <p v-if="board.emptySlots > 0" class="mb-3 rounded-lg bg-[#FF5C5C]/10 px-3 py-2 text-sm text-[#FF5C5C]">
            You're leaving {{ board.emptySlots }} starting slot{{ board.emptySlots > 1 ? 's' : '' }} empty —
            that's points forfeited, not lost. Plug a body before kickoff.
          </p>

          <!--
            The chart once two daily readings exist; today's standing as two bars before that.
            A single reading drawn as a line is a flat segment pretending to be a trend.
          -->
          <div class="mb-3 rounded-lg bg-dark-bg/40 px-3 pt-2 pb-1">
            <div class="flex items-center justify-between">
              <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Win-probability trend</p>
              <p v-if="trend.points.length >= 2" class="font-mono text-[9px] text-dark-textMuted">solid = actual · dotted = projected</p>
            </div>
            <MatchupWinProbChart
              v-if="trend.points.length >= 2"
              :points="trend.points"
              :projected="trend.projected"
              :me-name="myTeamName"
              :opp-name="oppName"
              :height="trend.points.length >= 3 ? 160 : 120"
            />
            <div v-else class="mt-2 space-y-1.5 pb-1 font-mono text-[11px]">
              <div class="flex items-center gap-2">
                <span class="w-28 shrink-0 truncate" :style="{ color: ME }">{{ myTeamName }}</span>
                <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-dark-border/40">
                  <div class="absolute inset-y-0 left-0 rounded-full" :style="{ width: winPct + '%', backgroundColor: ME }" />
                </div>
                <span class="w-9 shrink-0 text-right tabular-nums" :style="{ color: ME }">{{ winPct }}%</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-28 shrink-0 truncate" :style="{ color: OPP }">{{ oppName }}</span>
                <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-dark-border/40">
                  <div class="absolute inset-y-0 left-0 rounded-full" :style="{ width: (100 - winPct) + '%', backgroundColor: OPP }" />
                </div>
                <span class="w-9 shrink-0 text-right tabular-nums" :style="{ color: OPP }">{{ 100 - winPct }}%</span>
              </div>
              <p class="pt-1 font-mono text-[9px] text-dark-textMuted">
                the line builds as the week goes — check back tomorrow for the trend
              </p>
            </div>
          </div>

          <!--
            Seat by seat. Both lineups are sorted by slot then points, so the nth body at a slot
            faces the nth on the other side — RB1 against RB1. The rank badge is what makes a
            row readable at a glance: 21 vs 14 says little, RB3 against RB8 says who is favoured
            and by how much of the position.
          -->
          <div class="mb-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">
            <span class="flex min-w-0 flex-1 items-center gap-1.5">
              <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onLogoErr" class="h-4 w-4 shrink-0 rounded bg-dark-border object-cover" />
              <span class="truncate">{{ myTeamName }}</span>
            </span>
            <span class="w-10 shrink-0 text-center">slot</span>
            <span class="flex min-w-0 flex-1 items-center justify-end gap-1.5">
              <span class="truncate">{{ board.matchup.opponentName }}</span>
              <img v-if="board.matchup.opponentLogo" :src="board.matchup.opponentLogo" alt="" @error="onLogoErr" class="h-4 w-4 shrink-0 rounded bg-dark-border object-cover" />
            </span>
          </div>
          <div v-for="(d, i) in board.matchup.duels" :key="'duel-' + i"
               class="flex items-center gap-2 border-b border-dark-border/40 py-1.5 last:border-0">
            <!-- mine -->
            <span class="flex min-w-0 flex-1 items-center gap-1.5" :class="d.edge > 0 ? 'text-dark-text' : 'text-dark-textMuted'">
              <img v-if="d.mine && d.mine.headshot" :src="d.mine.headshot" :alt="d.mine.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
              <img v-if="d.mine && d.mine.team" :src="teamLogo(d.mine.team)" alt="" @error="onLogoErr" class="hidden h-3.5 w-3.5 shrink-0 object-contain sm:block" />
              <span class="min-w-0 flex-1 truncate text-[13px]">
                {{ d.mine ? d.mine.name : '—' }}
                <span v-if="d.mine && d.mine.bye" class="ml-1 font-mono text-[9px] uppercase text-[#FF5C5C]">bye</span>
              </span>
              <span v-if="d.mine" class="shrink-0 font-mono text-[9px]" :class="posTone(d.mine)">{{ posBadge(d.mine) }}</span>
              <span v-if="d.mine" class="w-7 shrink-0 text-right font-mono text-xs">{{ round(d.mine.weekPoints) }}</span>
            </span>

            <!-- the seat, tinted toward whoever wins it -->
            <span class="w-10 shrink-0 text-center font-mono text-[9px] uppercase"
                  :class="d.edge > 0 ? 'text-primary' : d.edge < 0 ? 'text-[#e69a4a]' : 'text-dark-textMuted'">
              {{ d.slot }}
            </span>

            <!-- theirs -->
            <span class="flex min-w-0 flex-1 items-center justify-end gap-1.5" :class="d.edge < 0 ? 'text-dark-text' : 'text-dark-textMuted'">
              <span v-if="d.theirs" class="w-7 shrink-0 text-left font-mono text-xs">{{ round(d.theirs.weekPoints) }}</span>
              <span v-if="d.theirs" class="shrink-0 font-mono text-[9px]" :class="posTone(d.theirs)">{{ posBadge(d.theirs) }}</span>
              <span class="min-w-0 flex-1 truncate text-right text-[13px]">
                {{ d.theirs ? d.theirs.name : '—' }}
                <span v-if="d.theirs && d.theirs.bye" class="ml-1 font-mono text-[9px] uppercase text-[#FF5C5C]">bye</span>
              </span>
              <img v-if="d.theirs && d.theirs.team" :src="teamLogo(d.theirs.team)" alt="" @error="onLogoErr" class="hidden h-3.5 w-3.5 shrink-0 object-contain sm:block" />
              <img v-if="d.theirs && d.theirs.headshot" :src="d.theirs.headshot" :alt="d.theirs.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
            </span>
          </div>
          <p class="mt-2 font-mono text-[9px] text-dark-textMuted">
            brighter side wins the seat · rank is at that position among rostered players and free agents
          </p>
        </div>
      </section>

      <!-- A started player on a bye is points you forfeit outright — loudest thing on the page. -->
      <div v-if="board.byeStarters.length" class="mb-5 rounded-xl border border-[#FF5C5C]/40 bg-[#FF5C5C]/[0.06] px-4 py-3">
        <p class="font-display text-xs font-semibold uppercase tracking-wide text-[#FF5C5C]">
          {{ board.byeStarters.length }} starter{{ board.byeStarters.length > 1 ? 's' : '' }} on bye
        </p>
        <p class="mt-1 font-mono text-[11px] text-dark-textSecondary">
          {{ board.byeStarters.map((b) => b.name).join(' · ') }} — zero points unless you move them.
        </p>
      </div>

      <!--
        The verdict stays visible; the detail folds. Whether the lineup is optimal is the
        headline, and the lineup, the close calls and the bench are the working behind it —
        all of which were pushing the rankings board off the bottom of the page.
      -->
      <section class="mb-5 rounded-xl border bg-dark-card"
               :class="board.moves.length ? 'border-primary/40' : 'border-dark-border'">
        <button class="flex w-full items-center justify-between gap-3 p-4" @click="lineupOpen = !lineupOpen">
          <span class="min-w-0 text-left">
            <span v-if="board.moves.length" class="font-display text-xs font-semibold uppercase tracking-wide text-primary">
              ★ {{ board.moves.length }} start / sit move{{ board.moves.length > 1 ? 's' : '' }}
              <span class="font-mono text-[10px] normal-case text-dark-textMuted">
                · +{{ board.moves.reduce((t, m) => t + m.gain, 0) }} pts on the table
              </span>
            </span>
            <span v-else-if="hasCurrentLineup" class="font-mono text-[11px] text-dark-textMuted">
              ✓ Your lineup is already optimal for week {{ currentWeek }}.
            </span>
            <span v-else class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
              Your best lineup
            </span>
            <span class="mt-0.5 block font-mono text-[10px] text-dark-textMuted/70">
              lineup · closest calls · bench
            </span>
          </span>
          <span class="shrink-0 font-mono text-dark-textMuted">{{ lineupOpen ? '−' : '+' }}</span>
        </button>

      <div v-if="lineupOpen" class="px-4 pb-4">
      <!-- 1. START/SIT MOVES -->
      <section v-if="board.moves.length" class="mb-5 rounded-xl border border-primary/40 bg-dark-bg/40 p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-primary">★ Start / sit moves</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">your set lineup vs the best lineup for week {{ currentWeek }}</p>
        <template v-for="(m, i) in board.moves" :key="'mv-' + i">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
            <span class="min-w-0 flex-1 text-sm text-dark-text">
              <span class="font-mono text-[10px] uppercase text-primary">start</span> <span class="font-semibold">{{ m.startName }}</span>
              <span class="block text-xs text-dark-textMuted">
                <span class="font-mono text-[10px] uppercase">{{ m.kind === 'bye' ? 'bye — sub' : 'sit' }}</span> {{ m.sitName }}
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="font-mono text-sm font-bold text-primary">+{{ m.gain }}</span>
              <span class="block font-mono text-[9px] uppercase text-dark-textMuted">wk pts</span>
            </span>
          </div>
        </template>
      </section>
      <!-- 2. OPTIMAL LINEUP -->
      <section class="mb-5 rounded-xl border border-dark-border bg-dark-bg/40 p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Best lineup
          <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
            · week {{ currentWeek }} · pts/wk · rank among rostered players and free agents
          </span>
        </h2>
        <template v-for="s in board.starters" :key="'st-' + s.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ s.slot }}</span>
            <img v-if="s.headshot" :src="s.headshot" :alt="s.name" loading="lazy" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ s.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">
                {{ s.name }}
                <span v-if="s.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400" title="Healthy backup — the starter ahead of him is injured">step-up</span>
              </span>
              <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                {{ s.position }}
                <template v-if="s.bye"> · <span class="text-[#FF5C5C]">BYE</span></template>
                <template v-else-if="s.opponent"> · {{ s.home ? 'vs' : '@' }} <img :src="teamLogo(s.opponent)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ s.opponent }}</template>
              </span>
            </span>
            <span class="w-20 shrink-0 text-right">
              <span class="block font-mono text-sm text-dark-text">{{ round(s.weekPoints) }}</span>
              <span class="block font-mono text-[9px]">
                <span :class="posTone(s)">{{ posLabel(s) }}</span>
                <span v-if="s.flexRank" :class="flexTone(s.flexRank)"> &middot; FLX{{ s.flexRank }}</span>
              </span>
            </span>
          </div>
        </template>
      </section>

      <!--
        Where the week is actually decided. The optimizer is confident about the top of a
        lineup and nearly indifferent at the bottom; only the second kind is worth a
        manager's attention, and "already optimal" was hiding it behind a checkmark.
      -->
      <section v-if="board.closeCalls.length" class="mb-5 rounded-xl border border-dark-border bg-dark-bg/40 p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Closest calls</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">near coin-flips — the projection barely separates these</p>
        <template v-for="(c, i) in board.closeCalls" :key="'cc-' + i">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ c.slot }}</span>
            <span class="min-w-0 flex-1 text-sm">
              <span class="text-dark-text">{{ c.startName }}</span>
              <span class="font-mono text-[11px] text-dark-textMuted"> {{ c.startPoints.toFixed(1) }}</span>
              <span class="mx-1.5 text-dark-textMuted">over</span>
              <span class="text-dark-textMuted">{{ c.sitName }}</span>
              <span class="font-mono text-[11px] text-dark-textMuted"> {{ c.sitPoints.toFixed(1) }}</span>
            </span>
            <span class="shrink-0 text-right font-mono text-[11px] text-dark-textMuted">by {{ c.gap.toFixed(1) }}</span>
          </div>
        </template>
      </section>

      <!-- 3. BENCH -->
      <section v-if="board.bench.length" class="rounded-xl border border-dark-border bg-dark-bg/40 p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Bench</h2>
        <template v-for="b in board.bench" :key="'bn-' + b.playerKey">
          <div class="flex items-center gap-2.5 border-b border-dark-border/40 py-1 text-sm last:border-0">
            <img v-if="b.headshot" :src="b.headshot" :alt="b.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
            <img v-if="b.team" :src="teamLogo(b.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
            <span class="min-w-0 flex-1 truncate text-dark-textMuted">
              {{ b.name }} <span class="text-[11px]">{{ b.position }}</span>
              <span v-if="b.bye" class="ml-1 text-[10px] text-[#FF5C5C]">BYE</span>
            </span>
            <!-- One line, not a stacked block: the bench is a reference list, and five
                 two-line rows took as much room as the lineup they support. -->
            <span class="shrink-0 font-mono text-[9px] text-dark-textMuted/60">{{ rankLabel(b) }}</span>
            <span class="w-8 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(b.weekPoints) }}</span>
          </div>
        </template>
      </section>
      </div><!-- /lineup collapsible -->
      </section>

      <!--
        The weekly rankings board. Same shape as The Wire's, different clock — and the clock is
        stated loudly on both, because two identically-shaped tables are otherwise just one
        table shown twice. The badges are what make it answer three questions at once: where
        my guys sit, what's free, and what my opponent is holding.
      -->
      <section v-if="board.boardPositions.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <button class="flex w-full items-center justify-between" @click="boardOpen = !boardOpen">
          <span class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
            This week's rankings
            <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· your roster, the wire and the league</span>
          </span>
          <span class="font-mono text-dark-textMuted">{{ boardOpen ? '−' : '+' }}</span>
        </button>

        <div v-if="boardOpen" class="mt-3">
          <div class="mb-2 flex flex-wrap gap-1.5">
            <button
              v-for="pos in board.boardPositions"
              :key="'bp-' + pos"
              class="rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
              :class="boardPos === pos ? 'bg-primary/20 text-primary' : 'bg-dark-bg text-dark-textMuted hover:text-dark-text'"
              @click="boardPos = pos"
            >{{ pos }}</button>
          </div>
          <p class="mb-2 font-mono text-[9px] uppercase tracking-wide text-dark-textMuted/70">
            <span class="text-primary">you</span> ·
            <span class="text-[#e69a4a]">vs</span> = {{ board.matchup ? board.matchup.opponentName : 'your opponent' }} ·
            <span class="text-[#4ade80]">free</span> = on waivers
          </p>

          <template v-for="(row, i) in boardRows" :key="'bw-' + row.playerKey">
            <!-- The cliff, named. A flat ranked column hides the drop-off, which is the
                 decision — same treatment as the draft board and The Wire. -->
            <div v-if="row.tierBreak" class="flex items-center gap-2 py-1.5">
              <span class="h-px flex-1 bg-dark-border"></span>
              <span class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">
                tier {{ row.tier }} &middot; &minus;{{ round(row.tierDrop ?? 0) }} pts
              </span>
              <span class="h-px flex-1 bg-dark-border"></span>
            </div>
            <div
              class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm last:border-0"
              :class="row.owner === 'me' ? 'text-dark-text' : row.owner === 'free' ? 'text-dark-textSecondary' : 'text-dark-textMuted'"
            >
              <span class="w-6 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/60">{{ i + 1 }}</span>
              <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
              <span class="min-w-0 flex-1 truncate">
                {{ row.name }}
                <span v-if="row.bye" class="ml-1 font-mono text-[9px] uppercase text-[#FF5C5C]">bye</span>
              </span>
              <span
                v-if="OWNER_BADGE[row.owner].label"
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase"
                :class="OWNER_BADGE[row.owner].cls"
              >{{ OWNER_BADGE[row.owner].label }}</span>
              <span v-else-if="row.ownerName" class="hidden shrink-0 truncate font-mono text-[9px] text-dark-textMuted/50 sm:inline" style="max-width:8rem">{{ row.ownerName }}</span>
              <img v-if="row.team" :src="teamLogo(row.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
              <span class="shrink-0 font-mono text-[9px]" :class="boardPos === 'FLEX' ? flexTone(row.flexRank) : posTone(row)">
                {{ boardPos === 'FLEX' ? 'FLX' + row.flexRank : posLabel(row) }}
              </span>
              <span class="w-10 shrink-0 text-right font-mono text-xs">{{ round(row.weekPoints) }}</span>
            </div>
          </template>
          <p class="mt-2 font-mono text-[9px] text-dark-textMuted">
            week {{ currentWeek }} projections · top {{ BOARD_LIMIT }}, plus any of your players below it
          </p>
        </div>
      </section>

      <!-- 4. STREAMERS -->
      <section v-if="board.streamers.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Streamers</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          one-week adds for week {{ currentWeek }} — the drop is the other half of the decision
        </p>
        <template v-for="r in board.streamers" :key="'sm-' + (r.player.playerKey ?? r.player.name)">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">
                {{ r.player.name }}
                <span v-if="r.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400">step-up</span>
              </span>
              <span class="text-xs text-dark-textMuted">{{ r.player.position }} · {{ r.player.team }}</span>
            </span>
            <span v-if="r.streamOf > 0" class="shrink-0 rounded bg-dark-border/50 px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted">startable {{ r.streamWeeks }}/{{ r.streamOf }}</span>
            <span class="w-24 shrink-0 text-right">
              <span class="block font-mono text-sm text-dark-text">{{ round(r.weekPoints) }}</span>
              <span class="block font-mono text-[9px]">
                <span :class="posTone({ position: r.player.position, posRank: r.posRank })">{{ posLabel({ position: r.player.position, posRank: r.posRank }) }}</span>
                <span v-if="r.flexRank" :class="flexTone(r.flexRank)"> &middot; FLX{{ r.flexRank }}</span>
              </span>
              <span v-if="r.dropName" class="block font-mono text-[9px] text-primary">
                drop {{ r.dropName }} &middot; +{{ round(r.gain) }}
              </span>
              <span v-else class="block font-mono text-[9px] text-dark-textMuted/70">no upgrade</span>
            </span>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>
