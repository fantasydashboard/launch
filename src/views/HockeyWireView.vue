<!--
  The Wire, for a hockey category league.

  ONE LEVER: the add. Rankings already tells you who is good, and does it better than this
  page could — over nine hundred skaters, ranked. This page answers the only question that
  ranking cannot: what does adding THIS player do to YOUR standings, and who comes off the
  roster to make room. Every row is a swap, priced in categories won per week.
-->
<template>
  <div class="min-h-screen bg-dark-bg px-4 py-8">
    <div class="mx-auto max-w-3xl">
      <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Free agents</div>
      <h1 class="mt-2 font-display text-3xl font-extrabold tracking-tight text-dark-text">
        The Wire
      </h1>
      <p class="mt-2 max-w-xl text-sm leading-relaxed text-dark-textSecondary">
        Every available player worth adding, ranked by what he would do to your standings once
        somebody comes off the roster to make room.
      </p>

      <p v-if="vm.categories.length"
         class="mt-3 max-w-xl rounded-lg border border-dark-border bg-dark-card/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-dark-textMuted">
        <!-- Said once, because a board that does not name the columns it scored is asking to
             be trusted about the one thing the reader can check. -->
        Scored on your league's columns: {{ vm.categories.join(' · ') }}. Rest of season, not
        what he has already banked.
      </p>

      <div v-if="vm.loading" class="mt-8 font-mono text-xs text-dark-textMuted">
        Loading the wire…
      </div>

      <div v-else-if="vm.problem" class="mt-8 rounded-xl border border-dark-border bg-dark-card p-4">
        <p class="text-sm text-dark-textSecondary">{{ vm.problem }}</p>
      </div>

      <div v-else class="mt-4 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-2 flex items-center gap-2.5 border-b border-dark-border/40 pb-1.5 font-mono text-[9px] uppercase tracking-wide text-dark-textMuted/60">
          <span class="w-8 shrink-0"></span>
          <span class="h-7 w-7 shrink-0"></span>
          <span class="min-w-0 flex-1"></span>
          <span class="hidden w-12 shrink-0 text-right sm:block" title="Percent of leagues he is rostered in">OWN</span>
          <span class="w-14 shrink-0 text-right" title="Categories won per week this swap is worth">+CATS</span>
        </div>

        <div v-for="(row, i) in vm.rows.slice(0, shown)" :key="row.player.key"
             class="flex items-center gap-2.5 border-b border-dark-border/40 py-2 text-sm text-dark-text last:border-0">
          <span class="w-8 shrink-0 text-right font-mono text-[11px] text-dark-textMuted/60">{{ i + 1 }}</span>
          <img v-if="row.player.headshot" :src="row.player.headshot" :alt="row.player.name"
               loading="lazy" @error="onImgErr"
               class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
          <span v-else class="h-7 w-7 shrink-0 rounded-full bg-dark-border" />

          <span class="min-w-0 flex-1">
            <span class="block truncate">
              {{ row.player.name }}
              <span class="ml-1 font-mono text-[10px] text-dark-textMuted/70">
                {{ row.player.position }} · {{ row.player.team }}
              </span>
              <span v-if="injuryLabel(row.injuryStatus)"
                    class="ml-1 rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase"
                    :class="row.injuryStatus === 'DAY_TO_DAY'
                      ? 'bg-[#e69a4a]/20 text-[#e69a4a]' : 'bg-[#ef4444]/20 text-[#ef4444]'"
              >{{ injuryLabel(row.injuryStatus) }}</span>
            </span>
            <!--
              THE MOVE, not just the player. A waiver row that names an add without naming the
              drop leaves the reader to do the hard half themselves — and the drop is the half
              that decides whether the swap is worth making.
            -->
            <span class="mt-0.5 block truncate font-mono text-[10px] text-dark-textMuted">
              <template v-if="row.dropName">for {{ row.dropName }}</template>
              <template v-else>no droppable player on your roster</template>
              <!-- Which columns move, because a category league is won column by column and
                   "+0.4 cats" says nothing about whether it is the 0.4 you need. -->
              <span v-if="row.fixes.length" class="ml-1 text-[#2dd4bf]">
                fixes {{ row.fixes.join(' · ') }}
              </span>
              <span v-if="row.holds.length" class="ml-1 text-dark-textMuted/60">
                holds {{ row.holds.join(' · ') }}
              </span>
            </span>
          </span>

          <span class="hidden w-12 shrink-0 text-right font-mono text-[10px] text-dark-textSecondary sm:block">
            {{ row.percentOwned == null ? '—' : `${Math.round(row.percentOwned)}%` }}
          </span>
          <span class="w-14 shrink-0 text-right font-mono text-xs text-[#2dd4bf]">
            +{{ row.deltaEcw.toFixed(2) }}
          </span>
        </div>

        <button
          v-if="vm.rows.length > shown"
          class="mt-3 w-full rounded-lg border border-dark-border bg-dark-bg/60 py-2 font-mono text-[11px] text-dark-textSecondary transition-colors hover:text-dark-text"
          @click="shown = vm.rows.length"
        >Show all {{ vm.rows.length }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useHockeyWire } from '@/composables/useHockeyWire'

const { vm } = useHockeyWire()

const shown = ref(25)

/* ESPN's designations, shortened to what fits on a row. ACTIVE never arrives — the feed drops
   it deliberately, because a flag on every healthy player is a flag that says nothing. */
const INJURY_LABEL: Record<string, string> = {
  OUT: 'OUT',
  INJURY_RESERVE: 'IR',
  DAY_TO_DAY: 'DTD',
  SUSPENSION: 'SUSP',
}
function injuryLabel(status: string | null): string {
  return status ? INJURY_LABEL[status] ?? '' : ''
}

function onImgErr(e: Event) {
  const el = e.target as HTMLImageElement
  el.style.visibility = 'hidden'
}
</script>
