<script setup lang="ts">
import type { ValueState } from '@/today/valueState'
/**
 * Your lineup tonight — what you are starting, and what we would start.
 *
 * THE TOGGLE IS THE POINT. A page that only shows the optimal tells a manager what to do
 * without showing what he is doing, and the gap between the two IS the decision. Set beside
 * each other, the question answers itself: if the two lists match there is nothing to do
 * tonight, and if they do not, the difference is exactly the move.
 *
 * WHAT IS DIFFERENT FROM FOOTBALL, AND WHY IT HAS TO BE. Football ranks a roster once a week
 * and every starter has a game. Here the roster is the same and the SLATE is not, so the most
 * expensive thing on the page is a seat filled by somebody who is not playing tonight — the
 * most common way to lose a night, and something no native lineup screen mentions.
 */
import { computed, ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { teamLogoFor } from '@/players/teamLogo'
import { wordsFor } from '@/lib/sportWords'
import { startableRankTone, startableRankLabel } from '@/lib/startableRankTone'
import { availability, type DailyRow } from '@/composables/useDailyLineup'

const props = defineProps<{
  current: DailyRow[]
  optimal: DailyRow[]
  bench: DailyRow[]
  /** Points leagues show points; category leagues show category value. */
  valueLabel?: string
  /** False while the league's values are still all zero — a total of 0.0 is not a total. */
  canValue?: boolean
  /** True when no source can ever price this league — a different fact from "not yet". */
  valuesUnsupported?: boolean
  /**
   * WHY there is no number. "still reading tonight's values" is a promise, and it was being made
   * in situations where nothing was loading and nothing ever would. See src/today/valueState.ts.
   */
  valueState?: ValueState
}>()

const leagueStore = useLeagueStore()
const words = computed(() => wordsFor(leagueStore.activeSport))
const logo = (abbr?: string) => teamLogoFor(leagueStore.activeSport, abbr)
const one = (n: number) => n.toFixed(1)

/*
 * One sentence per reason, and none of them a promise we cannot keep. "Still reading" is only
 * honest while something is actually in flight; the other two are dead ends and say so, because
 * a reader who knows the page will never price this league can stop waiting for it to.
 */
const NO_VALUE_REASON: Record<string, string> = {
  loading: "still reading tonight's values",
  unsupported: 'no value model for this league yet',
  none: 'no projection for tonight in this league',
}
const noValueReason = computed(() =>
  NO_VALUE_REASON[props.valueState ?? (props.valuesUnsupported ? 'unsupported' : 'loading')]
  ?? "still reading tonight's values")
function onLogoErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none' }

const mode = ref<'current' | 'optimal'>('current')
/*
 * A DEAD END IS NOT AN ANSWER.
 *
 * Some platforms will not publish a set daily lineup, and the page used to respond by telling
 * the reader to go and press the other button himself: "we can't read your set lineup —
 * switch to optimal for our pick". That is the app asking the user to do the app's job, in
 * the one state where it already knows exactly what it would show him. Football never does
 * this; it just computes the best lineup and puts it up.
 *
 * So when there is no readable lineup we fall through to ours and say which one he is looking
 * at, rather than leaving him on an empty panel holding an instruction.
 */
const canShowCurrent = computed(() => props.current.length > 0)
const fellBack = computed(() => !canShowCurrent.value && props.optimal.length > 0)
const activeMode = computed<'current' | 'optimal'>(() =>
  fellBack.value ? 'optimal' : mode.value)
const rows = computed(() => (activeMode.value === 'optimal' ? props.optimal : props.current))
const slotOf = (r: DailyRow) => (activeMode.value === 'optimal' ? r.slot : r.startedSlot)

/*
 * TWO SIDES, TWO TOTALS — BECAUSE ONE TOTAL BURIES EVERY DECISION THE TOGGLE EXISTS FOR.
 *
 * A starting pitcher projects around thirty and a hitter around three, so a single lineup
 * total is roughly "how many pitchers am I starting tonight" wearing a disguise. The headline
 * gain inherits the problem: "optimal is +35.1" almost always means one pitcher swap, and the
 * hitter decisions — which are the ones a manager can actually be talked out of — vanish
 * inside the rounding of a number thirty times their size.
 *
 * Football can carry one total honestly because a quarterback, a back and a receiver score on
 * one scale and genuinely compete for a flex seat. A catcher and an ace do not compete for
 * anything. The rankings panel below already splits them for exactly this reason; the lineup
 * was the surface that hadn't caught up.
 */
const SCARCE: Record<string, string[]> = {
  baseball: ['SP', 'RP', 'P'], hockey: ['G'], basketball: ['C'],
}
const isScarce = (position: string) => {
  const list = SCARCE[leagueStore.activeSport] ?? SCARCE.baseball
  return (position || '').toUpperCase().split(/[,/|]/).some((t) => list.includes(t.trim()))
}
const sum = (list: DailyRow[]) => list.reduce((s, r) => s + r.today, 0)
const sideOf = (list: DailyRow[], scarce: boolean) => list.filter((r) => isScarce(r.position) === scarce)

const total = computed(() => sum(rows.value))

/** The gain from switching, per side. Reported apart so neither can hide the other. */
const gainBySide = computed(() => ({
  everyday: sum(sideOf(props.optimal, false)) - sum(sideOf(props.current, false)),
  scarce: sum(sideOf(props.optimal, true)) - sum(sideOf(props.current, true)),
}))
/* Rounded to a tenth because a gap of 0.04 is not a reason to change a lineup, and printing
   it as "+0.0" says nothing at all. */
const MOVES = 0.1
const worthMoving = computed(() =>
  Math.abs(gainBySide.value.everyday) >= MOVES || Math.abs(gainBySide.value.scarce) >= MOVES)

/** e.g. "+2.1 hitters · +33.0 pitchers", dropping a side that isn't moving. */
const gainParts = computed(() => {
  const out: string[] = []
  if (Math.abs(gainBySide.value.everyday) >= MOVES) {
    out.push(`+${one(gainBySide.value.everyday)} ${words.value.skaters}`)
  }
  if (Math.abs(gainBySide.value.scarce) >= MOVES) {
    out.push(`+${one(gainBySide.value.scarce)} ${words.value.goalies}`)
  }
  return out
})

const posOf = (r: DailyRow) => (r.position || '').split(/[,/|]/)[0]?.trim().toUpperCase() ?? ''

/** How he ranks tonight at his position — the chip that turns a quantity into a judgement. */
const rankChip = (r: DailyRow) => (r.posRank != null ? `${posOf(r)}${r.posRank}` : '')

/**
 * The denominator, and it is the number of SEATS rather than the number of bodies.
 *
 * WHAT THIS REPLACED. The chip read "D60 of 87" and was coloured by rank's share of that 87 —
 * green in the top fifth, amber past 45%. Both halves were wrong in the same way, because 87
 * is how many defencemen were AVAILABLE tonight, and that moves for reasons that have nothing
 * to do with any player: how many teams have a game, and how many names our own matching
 * managed to resolve. When a name-fallback fix doubled the hockey pool from 39 to 87, the
 * green line slid from rank 8 to rank 17 and every colour on this board changed while not one
 * projection moved. The pool-dependence was the bug, the same shape as the one projectGames
 * was rewritten for.
 *
 * "48 start" is a property of the league's settings, so it holds still, and it is the line a
 * manager is actually asking about. Falls back to the available count when the league
 * publishes no roster slots — a denominator that drifts still beats none.
 */
const rankDenom = (r: DailyRow) =>
  r.posStartable ? `· ${r.posStartable} start` : r.posCount ? `of ${r.posCount}` : ''

const rankTone = (r: DailyRow) =>
  startableRankTone(
    r.posRank != null && r.posStartable ? r.posRank / r.posStartable : null,
  )

/* The colour in words, because a reader should be able to check our arithmetic rather than
   infer a five-band scale from five shades. */
const rankTitle = (r: DailyRow) =>
  r.posRank == null ? '' : startableRankLabel(r.posRank, r.posStartable, posOf(r))

/** Seats filled by somebody with no game — points forfeited outright. */
const dead = computed(() => rows.value.filter((r) => !r.playsToday))

/*
 * SAY IT ONCE.
 *
 * On a night nobody plays, this banner named all seventeen starters, and then every one of
 * those seventeen rows said "no game" underneath it. Three statements of the same fact, the
 * longest of which was a wall of names carrying no information — because when the answer is
 * "everybody", the list of who is not the point.
 *
 * A PARTIAL slate is the opposite: there the names ARE the decision, because those are the
 * seats to fill. So the banner keeps the list exactly when it discriminates, caps it when it
 * would run long, and drops it when it covers the whole lineup.
 */
const NAME_CAP = 6
const allDark = computed(() => dead.value.length > 0 && dead.value.length === rows.value.length)
const deadNames = computed(() => {
  const names = dead.value.map((d) => d.name)
  if (names.length <= NAME_CAP) return names.join(', ')
  return `${names.slice(0, NAME_CAP).join(', ')} and ${names.length - NAME_CAP} more`
})

/*
 * Starters who CANNOT PLAY, which is not the same as starters who are carrying something.
 *
 * The first version warned on any designation, so a day-to-day outfielder who will almost
 * certainly play appeared in the same red banner as two pitchers on the fifteen-day list.
 * Treating "might be rested" and "out for a fortnight" identically is how a warning becomes
 * background noise and the real one gets skimmed past.
 *
 * Day-to-day is now a quiet amber tag on his own row and nothing more.
 */
const injuredStarters = computed(() =>
  rows.value.filter((r) => availability(r.status) === 'out'))

const tagTone = (status: string | undefined) =>
  availability(status) === 'out'
    ? 'bg-[#FF5C5C]/15 text-[#FF5C5C]'
    : 'bg-[#e69a4a]/15 text-[#e69a4a]'

/*
 * CAN WE ACTUALLY RANK THESE PLAYERS TONIGHT?
 *
 * A category league used to have no value engine at all, so every row came back zero and an
 * "optimal" built on it was the slot filler breaking ties in roster order wearing the costume
 * of a recommendation. Category value is wired in now, but the question survives in a
 * narrower form: the engine standardises against a projection universe that loads
 * separately, and until it lands every value is still zero. The caller knows which of those
 * two states this is, so it says; the local check remains as a floor for the points path.
 */
const canValue = computed(() =>
  props.canValue !== false
  && [...props.current, ...props.optimal, ...props.bench].some((r) => r.today > 0),
)
</script>

<template>
  <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <div class="flex rounded-lg border border-dark-border">
        <button class="rounded-l-lg px-3 py-1 font-mono text-[11px] transition-colors"
                :class="activeMode === 'current' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                :disabled="fellBack" @click="mode = 'current'">your lineup</button>
        <button v-if="canValue" class="rounded-r-lg px-3 py-1 font-mono text-[11px] transition-colors"
                :class="activeMode === 'optimal' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                @click="mode = 'optimal'">optimal</button>
      </div>
      <span v-if="canValue" class="font-mono text-[11px] text-dark-textMuted">
        {{ one(total) }} {{ valueLabel || 'projected' }}
      </span>
      <span v-else class="font-mono text-[11px] text-dark-textMuted/70">{{ noValueReason }}</span>
      <span class="flex-1"></span>
      <!--
        The whole reason to look: what the optimal is worth over what is set — reported per
        side, because a single figure is dominated by the scarce position and a manager
        reading "+35.1" learns only that he should start a different pitcher.
      -->
      <span v-if="canValue && worthMoving" class="font-mono text-[11px] text-primary">
        {{ gainParts.join(' · ') }}
      </span>
      <span v-else-if="canValue && current.length" class="font-mono text-[11px] text-dark-textMuted">
        your lineup is optimal
      </span>
    </div>

    <!--
      Loudest thing on the page when it happens: a started player with no game tonight is
      points forfeited outright, and the native lineup screen will never tell you.
    -->
    <p v-if="dead.length"
       class="mb-3 rounded-lg px-3 py-2 font-mono text-[11px]"
       :class="allDark
         ? 'border border-dark-border bg-dark-bg/40 text-dark-textMuted'
         : 'border border-[#FF5C5C]/30 bg-[#FF5C5C]/5 text-[#FF5C5C]'">
      <template v-if="allDark">
        Nobody in your lineup has a game tonight &mdash; there is nothing to set.
      </template>
      <template v-else>
        {{ dead.length }} {{ dead.length === 1 ? 'seat has' : 'seats have' }} no game tonight
        &mdash; {{ deadNames }}
      </template>
    </p>

    <p v-if="injuredStarters.length"
       class="mb-3 rounded-lg border border-[#FF5C5C]/30 bg-[#FF5C5C]/5 px-3 py-2 font-mono text-[11px] text-[#FF5C5C]">
      {{ injuredStarters.length }} {{ injuredStarters.length === 1 ? 'player' : 'players' }}
      in your starting lineup {{ injuredStarters.length === 1 ? 'is' : 'are' }} out &mdash;
      {{ injuredStarters.map((r) => r.name).join(', ') }}
    </p>

    <!-- Stated, not demanded: he is already looking at our lineup. -->
    <p v-if="fellBack" class="mb-3 font-mono text-[11px] text-dark-textMuted">
      Your platform doesn't publish a set lineup, so this is ours.
    </p>

    <p v-if="!rows.length" class="py-6 text-center font-mono text-xs text-dark-textMuted">
      No lineup slots to fill &mdash; the league published none.
    </p>

    <div v-for="r in rows" :key="activeMode + r.playerKey"
         class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
      <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ slotOf(r) }}</span>
      <img v-if="r.headshot" :src="r.headshot" :alt="r.name" loading="lazy" @error="onLogoErr"
           class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
      <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[9px] text-dark-textMuted">{{ r.position }}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold"
              :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">{{ r.name }}</span>
        <span class="flex items-center gap-1 text-xs text-dark-textMuted">
          {{ r.position }}
          <template v-if="r.team">
            &middot; <img :src="logo(r.team)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ r.team }}
          </template>
          <span v-if="!r.playsToday" class="text-[#FF5C5C]">&middot; no game</span>
          <span v-else-if="r.status && r.status !== 'ACTIVE'"
                class="rounded px-1 font-bold" :class="tagTone(r.status)">{{ r.status }}</span>
        </span>
      </span>
      <span v-if="canValue" class="w-24 shrink-0 text-right">
        <span class="block font-mono text-sm"
              :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/40'">{{ one(r.today) }}</span>
        <!-- A bare number says nothing: nobody knows whether 2.8 is a good night for a
             catcher. The rank is what turns it into a judgement. -->
        <span v-if="r.posRank != null" class="block font-mono text-[10px]"
              :class="rankTone(r)" :title="rankTitle(r)">
          {{ rankChip(r) }}<span class="text-dark-textMuted/40"> {{ rankDenom(r) }}</span>
        </span>
      </span>
    </div>

    <!-- Bench, collapsed to one line each: it is a reference list, not a decision. -->
    <details v-if="bench.length" class="mt-3 border-t border-dark-border/50 pt-3">
      <summary class="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-dark-textMuted/70">
        bench &middot; {{ bench.filter((b) => b.playsToday).length }} of {{ bench.length }} have a game
      </summary>
      <div v-for="r in bench" :key="'bn-' + r.playerKey"
           class="mt-1.5 flex items-center gap-3 text-sm">
        <span class="min-w-0 flex-1 truncate"
              :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">{{ r.name }}</span>
        <span class="font-mono text-[10px] text-dark-textMuted/70">{{ r.position }} &middot; {{ r.team }}</span>
        <span class="w-12 shrink-0 text-right font-mono text-xs"
              :class="r.playsToday ? 'text-dark-textMuted' : 'text-dark-textMuted/30'">{{ one(r.today) }}</span>
      </div>
    </details>
  </section>
</template>
