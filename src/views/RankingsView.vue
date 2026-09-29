<!--
  Rest-of-season rankings, free and open.

  WHY THIS IS NOT BEHIND THE PASS. A ranked list tells you who is good. It does not tell you
  who you can HAVE, what an add costs, or who to cut — and that is the entire waiver call,
  which is what the Season Pass sells. Strip ownership out of the board and it stops being a
  transaction tool. Availability, add cost and this week's projections stay on The Wire.

  The other half of the argument is that rankings are a commodity: every competitor publishes
  them, so almost nothing was protected by hiding ours, while every social post we publish was
  landing on a page that asked for a signup before showing anything.
-->
<template>
  <div class="min-h-screen bg-dark-bg px-4 py-8">
    <!--
      WIDTH FOLLOWS THE COLUMN COUNT, which is the only thing that justifies it.

      The board was capped at 768px inside a 1400px window while carrying five numeric columns:
      no room inside the row, and a wasted half-screen around it. 1024 fixes that — it is what
      the League page already uses, and the League page reads better than this one for exactly
      that reason.

      But a reader without the pass has three things on the right of a row, not seven, and the
      same 1024 leaves them stranded across a dead zone with the name and the number at
      opposite ends of the screen. Width is not a house style; it is a consequence of how much
      a row has to carry. The prose keeps its own narrower cap either way — a 1024px line of
      body copy is a different mistake.
    -->
    <div class="mx-auto" :class="access.showsPaidColumns ? 'max-w-5xl' : 'max-w-3xl'">
      <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Rest of season</div>
      <h1 class="mt-2 font-display text-3xl font-extrabold tracking-tight text-dark-text">
        Football rankings
      </h1>
      <p class="mt-2 max-w-xl text-sm leading-relaxed text-dark-textSecondary">
        Every player ranked by what he is worth above a replacement body at his own position,
        for the rest of the season. Players inside a tier are within about a point a week of
        each other — close enough to be interchangeable.
      </p>
      <!--
        What this board is NOT, said before the board rather than under it.

        It used to say this in the footer, which is the right place for somebody who read the
        whole page and the wrong place for somebody who opened it expecting their own team. A
        paying user landed here, scrolled a hundred ranked players looking for their roster, and
        had to reach the bottom to learn the page does not know who they are. The disclosure has
        to arrive before the thing it disclaims.
      -->
      <p class="mt-3 max-w-xl rounded-lg border border-dark-border bg-dark-card/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-dark-textMuted">
        <template v-if="!access.scopedToLeague">
          Everyone sees the same board: full PPR, standard twelve-team. It does not follow your
          league's scoring or mark your roster.
          <RouterLink to="/players" class="text-primary underline underline-offset-2">The Wire</RouterLink>
          is the page scored for your league.
        </template>
        <!--
          The label already names whose scoring it is — "your league's scoring" or "standard
          scoring (full PPR)" — so nothing is appended to it. An earlier version added
          "— your league" after it and read "Scored on your league's scoring — your league."
        -->
        <template v-else-if="!access.showsPaidColumns">
          Scored on {{ scoringLabel(scoringSource) }}, your roster marked. Who's actually
          available, and who holds him, is on the pass.
        </template>
        <template v-else>
          Scored on {{ scoringLabel(scoringSource) }}, your roster marked.
        </template>
      </p>

      <div v-if="loading" class="mt-8 font-mono text-xs text-dark-textMuted">Loading the board…</div>

      <div v-else-if="!ready" class="mt-8 rounded-xl border border-dark-border bg-dark-card p-4">
        <p class="text-sm text-dark-textSecondary">
          The projections feed is not answering right now, so there is no board to show. This is
          our end, not yours — try again shortly.
        </p>
      </div>

      <div v-else class="mt-6">
        <div class="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            v-for="pos in positions"
            :key="pos"
            class="rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
            :class="active === pos ? 'bg-primary font-bold text-dark-bg' : 'bg-dark-card text-dark-textMuted hover:text-dark-text'"
            @click="active = pos"
          >{{ pos }}</button>
          <!--
            Admin only, and the whole board is what it re-seats — not one card.

            Choosing whose ranking drives the page is a tool for measuring our model against
            somebody else's, which is our job rather than a reader's. A board that silently
            reorders because of a preference somebody set once and forgot is worse than one
            that never moved, so nobody but us gets the lever.
          -->
          <span v-if="isAdmin" class="ml-auto font-mono text-[10px]">
            <RankingPicker kind="ros" />
          </span>
        </div>

        <div class="rounded-xl border border-dark-border bg-dark-card p-4">
          <!--
            Column headers, because four numbers arriving on every row with nothing naming them
            is worse than no numbers. ROS and NEXT4 are 1-32 ranks of how easy the upcoming
            defences are AT THIS POSITION — the same schedule reads differently for a back and
            a tight end, which is the whole reason they are computed per position and why they
            are absent on the mixed board.
          -->
          <div v-if="access.showsPaidColumns"
               class="mb-2 flex items-center gap-2.5 border-b border-dark-border/40 pb-1.5 font-mono text-[9px] uppercase tracking-wide text-dark-textMuted/60 sm:gap-3">
            <span class="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
            <span class="min-w-0 flex-1"></span>
            <span class="hidden w-9 shrink-0 text-right lg:block" title="Rest-of-season schedule rank at this player's position">ROS</span>
            <span class="hidden w-9 shrink-0 text-right lg:block" title="Next four games, same scale">NEXT4</span>
            <span class="hidden w-10 shrink-0 text-right sm:block" title="What this add is worth to your starting lineup">ADD</span>
            <span class="hidden w-10 shrink-0 text-right sm:block" title="Points per game this season">PPG</span>
            <span class="hidden w-8 shrink-0 text-right lg:block" title="Bye week">BYE</span>
            <span class="w-11 shrink-0 text-right sm:w-14">VOR</span>
          </div>

          <template v-for="row in visible" :key="'rk-' + row.playerKey">
            <!--
              THE TIER BREAK, at the volume it earns.

              This is the one thing the board knows that a ranked list does not — where the
              position actually breaks, as opposed to where the numbering happens to change.
              It was 9px of muted grey on a hairline, quieter than the team abbreviation beside
              it, while the same information is the loudest element on every card we publish.
              A product should not whisper its own differentiator.
            -->
            <div v-if="row.tierBreak" class="flex items-center gap-3 pb-2 pt-4">
              <span class="h-px flex-1 bg-[#e69a4a]/30"></span>
              <span class="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#e69a4a]">
                tier {{ row.tier }} &middot; &minus;{{ Math.round(row.tierDrop ?? 0) }} pts
              </span>
              <span class="h-px flex-1 bg-[#e69a4a]/30"></span>
            </div>
            <!--
              CONTRAST, not scale. The name was 14px against 10px secondaries — a ratio of 1.4
              to 1, which is why the row read as one grey block with no entry point. The cards
              we publish run about 4 to 1. Raising the name to 16 and the VOR to 18 gets the
              same ratio for four pixels of row height; scaling everything up by a fifth would
              have cost rows and changed nothing about how it reads.

              The headshot goes 24 -> 32 because below about 32 a face is not a face: it was
              taking layout space and returning no recognition at all.
            -->
            <!--
              EVERY FIXED ELEMENT SHRINKS ON A PHONE, because the name is what they are all
              attributes of. Measured at 390px: the desktop sizes below pushed Christian
              McCaffrey, Jonathan Taylor, Amon-Ra St. Brown and Jaxon Smith-Njigba into
              ellipses, none of which truncated before. A board that reads beautifully on a
              laptop and clips its best players on the device most people open it on has not
              been improved, it has been traded.
            -->
            <div class="relative flex items-center gap-2.5 border-b border-dark-border/40 py-2.5 text-base text-dark-text last:border-0 sm:gap-3">
              <!--
                WHICH WAY HE MOVED, as colour and nothing else.

                A number here would be a fifth figure on a row that already carries four, and
                the reader does not want the amount — he wants to know whether anything
                happened. Green rose, red fell, brighter means further, and half the board is
                deliberately unmarked so the marked half is legible.

                Measured on value rather than places: see football/rankingMovement.ts. Places
                are cheap where the board is dense, so colouring on them leaves the top twenty
                grey and sets fire to the hundreds.
              -->
              <span v-if="mv(row.playerKey)" aria-hidden="true"
                    class="absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
                    :class="mv(row.playerKey)!.dir === 'up' ? 'bg-[#7ee787]' : 'bg-[#FF5C5C]'"
                    :style="{ opacity: 0.25 + 0.75 * mv(row.playerKey)!.intensity }"
                    :title="`${mv(row.playerKey)!.dir === 'up' ? 'Up' : 'Down'} since last week`" />
              <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onImgErr"
                   class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover sm:h-8 sm:w-8" />
              <span v-else class="h-7 w-7 shrink-0 rounded-full bg-dark-border sm:h-8 sm:w-8" />
              <!--
                The name carries the state, not just the star beside it.

                Three colours for three answers to "can I have him": yours in the product's own
                lime, a free agent in the same teal as the FREE badge so the two read as one
                fact, and everyone else in plain text. At a glance the page separates the board
                into what you hold, what you can take, and what you would have to trade for.

                The free-agent colour is gated on `showsPaidColumns` for the same reason the
                badge is: who is claimable is what the pass sells, and a coloured name would
                hand it to a reader who has not bought it just as surely as the badge would.
              -->
              <span class="min-w-0 flex-1 truncate" :class="nameTone(row)">
                <span v-if="access.scopedToLeague && row.owned" class="text-primary">★ </span>{{ row.name }}
                <span v-if="active === 'ALL'" class="ml-1 font-mono text-[10px] text-dark-textMuted/70">{{ row.position }}</span>
              </span>
              <!--
                Hidden on a phone, on the same argument the numeric columns are: the headshot
                already carries the team's colours, the position tag is still on the name, and
                three characters of team are not worth four of a player's surname.
              -->
              <span class="hidden shrink-0 font-mono text-[10px] text-dark-textMuted/70 sm:inline">{{ row.team }}</span>
              <!--
                ONLY THE CLAIMABLE ONES ARE BADGED.

                Nearly every player on a rest-of-season board is rostered, so a ROSTERED chip
                appeared on nearly every row — the same claim repeated down the page, which
                carries no information and forces the reader to scan past it to find the rows
                it does not apply to. Inverted: absence means rostered, and the badge marks the
                handful you can actually go and take. The teal still matches the name colour,
                so the two read as one fact rather than two.
              -->
              <span v-if="access.showsPaidColumns && !row.owned && row.free"
                    class="shrink-0 rounded bg-[#2dd4bf]/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[#2dd4bf]"
              >free</span>
              <span v-else-if="access.scopedToLeague && !access.showsPaidColumns && !row.owned" aria-hidden="true"
                    class="shrink-0 select-none rounded bg-dark-bg px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-dark-textMuted/40"
              >•••</span>

              <!--
                The paid columns. Each one renders an empty span of its own width when it has
                no value, because a column that simply vanishes on some rows shifts everything
                to its right and the board stops being scannable — which is the failure mode
                that matters here, since scanning down a column is the entire point of them.

                Hidden on narrow screens from the right inward: four extra numbers on a phone
                squeeze the name to nothing, and the name is the thing the rest are attributes of.
              -->
              <template v-if="access.showsPaidColumns">
                <span v-if="difficultyFor(row.team, row.position)"
                      class="hidden w-9 shrink-0 text-right font-mono text-[10px] lg:block"
                      :class="sosTone(difficultyFor(row.team, row.position)!.ros)"
                      :title="`Rest-of-season ${row.position} schedule: 1 is the easiest run of defences in the league, 32 the hardest`"
                >{{ difficultyFor(row.team, row.position)!.ros ?? '—' }}</span>
                <span v-else class="hidden w-9 shrink-0 lg:block" />
                <span v-if="difficultyFor(row.team, row.position)"
                      class="hidden w-9 shrink-0 text-right font-mono text-[10px] lg:block"
                      :class="sosTone(difficultyFor(row.team, row.position)!.next4)"
                      :title="`Next four games at ${row.position}, same 1-32 scale`"
                >{{ difficultyFor(row.team, row.position)!.next4 ?? '—' }}</span>
                <span v-else class="hidden w-9 shrink-0 lg:block" />

                <!-- Only for a player you can actually add. What it would cost to claim
                     somebody already rostered is a number about nothing. -->
                <span v-if="row.free && addCost[row.playerKey]"
                      class="hidden w-10 shrink-0 text-right font-mono text-[10px] text-[#2dd4bf] sm:block"
                      :title="`Adding him is worth +${addCost[row.playerKey].marginal.toFixed(1)} to your starting lineup, dropping ${addCost[row.playerKey].dropName}`"
                >+{{ addCost[row.playerKey].marginal.toFixed(1) }}</span>
                <span v-else class="hidden w-10 shrink-0 sm:block" />

                <span v-if="ppgByKey[row.playerKey] !== undefined"
                      class="hidden w-10 shrink-0 text-right font-mono text-[10px] text-dark-textSecondary sm:block"
                      title="Points per game this season, over games actually played"
                >{{ ppgByKey[row.playerKey].toFixed(1) }}</span>
                <span v-else class="hidden w-10 shrink-0 sm:block" />

                <span v-if="byeByTeam[row.team ?? '']"
                      class="hidden w-8 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/60 lg:block"
                      title="Bye week"
                >{{ byeByTeam[row.team!] }}</span>
                <span v-else class="hidden w-8 shrink-0 lg:block" />
              </template>

              <!--
                The number the board is SORTED by, and until now it was set in the same 10px
                mono as the bye week. One loud number per row is what makes a row scannable —
                it is the only thing besides the name that a reader is meant to carry away.
              -->
              <span class="w-11 shrink-0 text-right font-display text-base font-bold tabular-nums sm:w-14 sm:text-lg"
                    :class="row.vorRos >= 0 ? '' : 'text-dark-textMuted'">
                {{ row.vorRos >= 0 ? '+' : '' }}{{ Math.round(row.vorRos) }}
              </span>
            </div>
          </template>

          <button
            v-if="!expanded && rows.length > visible.length"
            class="mt-3 w-full rounded-lg border border-dark-border bg-dark-bg/60 py-2 font-mono text-[11px] text-dark-textSecondary transition-colors hover:text-dark-text"
            @click="expanded = true"
          >Show all {{ Math.min(rows.length, FULL_DEPTH) }} {{ active }}</button>
        </div>

        <!--
          What this board is, said plainly, because the Wire links here while announcing that a
          ranking list drives IT. It follows the league's own scoring once one exists; only a
          reader with no football league is shown the public shape — default scoring, a
          twelve-team league — so nobody is left to work out why the order moved.
        -->
        <div class="mt-4 max-w-2xl rounded-xl border border-dark-border bg-dark-card p-4">
          <p v-if="!access.scopedToLeague" class="text-sm text-dark-textSecondary">
            <RouterLink to="/connect" class="text-primary underline underline-offset-2">Connect a league</RouterLink>
            for standings, power rankings and your full history — free, no expiry.
          </p>
          <p class="text-xs text-dark-textMuted" :class="{ 'mt-2': !access.scopedToLeague }">
            Who's actually available, what an add costs you and this week's start/sit calls live
            on <RouterLink to="/players" class="underline underline-offset-2">The Wire</RouterLink>.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useRankings } from '@/composables/useRankings'
import { scoringLabel } from '@/composables/useFootballScoring'
import type { BoardRow } from '@/football/footballWire'
import RankingPicker from '@/components/RankingPicker.vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { useRankingMovement } from '@/composables/useRankingMovement'
import { useLeagueStore } from '@/stores/league'

/*
 * `access.scopedToLeague` is the one fact "does this reader have a football league" resolves
 * to on this page — that is what `rankingsAccess` was extracted to guarantee. A second local
 * copy of the same question is exactly the drift that let a baseball-only reader be told this
 * was their league's board; the template reads `access.scopedToLeague` everywhere instead.
 *
 * `useRankings` also exports `accessKnown`, unused here: `access` already defaults to the
 * unlocked reading while the subscription check is in flight (see useRankings.ts), so no
 * branch in this template can reach the locked copy or the greyed pill before it resolves —
 * a second gate on `accessKnown` here would be redundant by construction.
 */
/* The ranking-list lever is ours, not the reader's — see the picker's comment in the
   template. isAdmin is the only thing this view takes from useFeatureAccess; the paid
   columns are gated by `access`, which useRankings already resolves. */
const { isAdmin } = useFeatureAccess()

const { board, positions, loading, ready, access, scoringSource,
        difficultyFor, byeByTeam, ppgByKey, addCost, setPosition } = useRankings()

/* Week-over-week movement, as a colour bar at the left edge of each row. Only rows that moved
   more than the board's own median get one — see useRankingMovement for why it stores a
   snapshot rather than recomputing history it cannot have. */
const leagueStore = useLeagueStore()
/* `board` is keyed by position, so the snapshot flattens it — a player's value is his value
   whichever list he is being read on, and a per-position snapshot would record the same man
   several times under keys that drift apart. */
const allRows = computed(() => Object.values(board.value ?? {}).flat())
const rankMovement = useRankingMovement({
  rows: computed(() => allRows.value.map((r) => ({
    playerKey: r.playerKey, vorRos: Number(r.vorRos) || 0 }))),
  week: computed(() => leagueStore.currentWeek ?? 1),
  sport: computed(() => String(leagueStore.activeSport ?? 'football')),
  ready: computed(() => !!ready.value && allRows.value.length > 0),
})
const mv = (key: string) => {
  const m = rankMovement.movement.value[key]
  return m && m.intensity > 0 ? m : null
}

const active = ref('ALL')
const expanded = ref(false)

/* A new position starts at the top again — carrying an expanded state across positions means
   landing halfway down a list you just opened. */
watch(active, () => { expanded.value = false })

/*
 * Tell the composable which column is on screen.
 *
 * Schedule strength is computed against what defences allow AT A POSITION, so there is exactly
 * one answer per board and it cannot be derived without knowing which board that is. On ALL
 * the composable returns nothing, which is the honest result: the same run of defences is easy
 * for a back and brutal for a receiver, and averaging the two would invent a number.
 */
watch(active, (pos) => setPosition(pos), { immediate: true })

/**
 * Easiest to hardest, on the 1-32 scale the schedule ranks use.
 *
 * Green at the easy end rather than the product's lime, because lime already means "yours" on
 * this page and a schedule is not an ownership fact. Amber at the hard end is the same amber
 * that means rostered elsewhere — both are "this is working against you".
 */
const sosTone = (rank: number | null) =>
  rank === null ? 'text-dark-textMuted/40'
    : rank <= 8 ? 'text-[#7ee787]'
    : rank <= 16 ? 'text-[#3fb950]'
    : rank <= 24 ? 'text-dark-textMuted'
    : 'text-[#e69a4a]'

/* Whatever this board can show, in case ALL is empty because every skill position is. */
watch(positions, (available) => {
  if (available.length && !available.includes(active.value)) active.value = available[0]
})

const rows = computed(() => board.value[active.value] ?? [])
const DEPTH = 50
/* Expanded, but not unbounded. The two-hundredth back is not a player anybody is choosing
   between, and rendering the whole column is a scroll nobody wanted and several hundred
   images nobody looked at. */
const FULL_DEPTH = 200
const visible = computed(() => rows.value.slice(0, expanded.value ? FULL_DEPTH : DEPTH))

/**
 * What colour a player's name is, which is the same question as "can I have him".
 *
 * Lime for yours, teal for a free agent, plain for a body somebody else holds.
 *
 * Teal rather than the green it started as, and rather than the orange first suggested. Green
 * sat one hue from the lime that means "mine" and the two blurred at this text size; orange is
 * worse, because amber already means ROSTERED on the waiver card and in the dynasty columns —
 * a hundred-odd usages saying the opposite of available. Teal is far from both. Returns nothing for a reader without the pass — availability is what the pass sells,
 * and a coloured name gives it away exactly as a badge would.
 */
function nameTone(row: BoardRow): string {
  if (access.value.scopedToLeague && row.owned) return 'text-primary'
  if (access.value.showsPaidColumns && row.free) return 'text-[#2dd4bf]'
  return ''
}

function onImgErr(e: Event) {
  const el = e.target as HTMLImageElement
  el.style.visibility = 'hidden'
}
</script>
