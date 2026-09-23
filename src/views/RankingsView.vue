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
    <div class="mx-auto max-w-3xl">
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
        <template v-else-if="!access.showsAvailability">
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
        <div class="mb-3 flex flex-wrap gap-1.5">
          <button
            v-for="pos in positions"
            :key="pos"
            class="rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
            :class="active === pos ? 'bg-primary font-bold text-dark-bg' : 'bg-dark-card text-dark-textMuted hover:text-dark-text'"
            @click="active = pos"
          >{{ pos }}</button>
        </div>

        <div class="rounded-xl border border-dark-border bg-dark-card p-4">
          <template v-for="row in visible" :key="'rk-' + row.playerKey">
            <div v-if="row.tierBreak" class="flex items-center gap-2 py-1.5">
              <span class="h-px flex-1 bg-dark-border"></span>
              <span class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">
                tier {{ row.tier }} &middot; &minus;{{ Math.round(row.tierDrop ?? 0) }} pts
              </span>
              <span class="h-px flex-1 bg-dark-border"></span>
            </div>
            <div class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm text-dark-text last:border-0">
              <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onImgErr"
                   class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
              <!--
                The name carries the state, not just the star beside it.

                Three colours for three answers to "can I have him": yours in the product's own
                lime, a free agent in the same green as the FREE badge so the two read as one
                fact, and everyone else in plain text. At a glance the page separates the board
                into what you hold, what you can take, and what you would have to trade for.

                The free-agent colour is gated on `showsAvailability` for the same reason the
                badge is: who is claimable is what the pass sells, and a green name would hand
                it to a reader who has not bought it just as surely as the badge would.
              -->
              <span class="min-w-0 flex-1 truncate" :class="nameTone(row)">
                <span v-if="access.scopedToLeague && row.owned" class="text-primary">★ </span>{{ row.name }}
                <span v-if="active === 'ALL'" class="ml-1 font-mono text-[10px] text-dark-textMuted/70">{{ row.position }}</span>
              </span>
              <span class="shrink-0 font-mono text-[10px] text-dark-textMuted/70">{{ row.team }}</span>
              <span v-if="access.showsAvailability && !row.owned"
                    class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                    :class="row.free ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-dark-bg text-dark-textMuted/60'"
              >{{ row.free ? 'free' : 'rostered' }}</span>
              <span v-else-if="access.scopedToLeague && !access.showsAvailability && !row.owned" aria-hidden="true"
                    class="shrink-0 select-none rounded bg-dark-bg px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-dark-textMuted/40"
              >•••</span>
              <span class="w-10 shrink-0 text-right font-mono text-xs" :class="row.vorRos >= 0 ? '' : 'text-dark-textMuted'">
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
        <div class="mt-4 rounded-xl border border-dark-border bg-dark-card p-4">
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
const { board, positions, loading, ready, access, scoringSource } = useRankings()

const active = ref('ALL')
const expanded = ref(false)

/* A new position starts at the top again — carrying an expanded state across positions means
   landing halfway down a list you just opened. */
watch(active, () => { expanded.value = false })

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
 * Lime for yours, the FREE badge's green for a free agent, plain for a body somebody else
 * holds. Returns nothing for a reader without the pass — availability is what the pass sells,
 * and a coloured name gives it away exactly as a badge would.
 */
function nameTone(row: BoardRow): string {
  if (access.value.scopedToLeague && row.owned) return 'text-primary'
  if (access.value.showsAvailability && row.free) return 'text-[#4ade80]'
  return ''
}

function onImgErr(e: Event) {
  const el = e.target as HTMLImageElement
  el.style.visibility = 'hidden'
}
</script>
