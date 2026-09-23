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
            :class="active === pos ? 'bg-primary/20 text-primary' : 'bg-dark-bg text-dark-textMuted hover:text-dark-text'"
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
              <span class="min-w-0 flex-1 truncate">
                {{ row.name }}
                <span v-if="active === 'ALL'" class="ml-1 font-mono text-[10px] text-dark-textMuted/70">{{ row.position }}</span>
              </span>
              <span class="shrink-0 font-mono text-[10px] text-dark-textMuted/70">{{ row.team }}</span>
              <span class="w-10 shrink-0 text-right font-mono text-xs" :class="row.vorRos >= 0 ? '' : 'text-dark-textMuted'">
                {{ row.vorRos >= 0 ? '+' : '' }}{{ Math.round(row.vorRos) }}
              </span>
            </div>
          </template>

          <button
            v-if="!expanded && rows.length > visible.length"
            class="mt-3 w-full rounded-lg border border-dark-border bg-dark-bg/60 py-2 font-mono text-[11px] text-dark-textSecondary transition-colors hover:text-dark-text"
            @click="expanded = true"
          >Show all {{ rows.length }} {{ active }}</button>
        </div>

        <!--
          The signed-in board is the same board, rescoped to your league and with your roster
          marked — still free. What the pass buys is what you can DO about it, which is why the
          pitch names those three things instead of promising "more rankings".
        -->
        <div class="mt-4 rounded-xl border border-dark-border bg-dark-card p-4">
          <p class="text-sm text-dark-textSecondary">
            Connect a league and this board is rescoped to your scoring with your roster marked —
            free, no expiry.
            <RouterLink to="/connect" class="text-primary underline underline-offset-2">Connect a league</RouterLink>.
          </p>
          <p class="mt-2 text-xs text-dark-textMuted">
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
import { usePublicRankings } from '@/composables/usePublicRankings'

const { board, positions, loading, ready } = usePublicRankings()

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
const visible = computed(() => (expanded.value ? rows.value : rows.value.slice(0, DEPTH)))

function onImgErr(e: Event) {
  const el = e.target as HTMLImageElement
  el.style.visibility = 'hidden'
}
</script>
