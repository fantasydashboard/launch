<script setup lang="ts">
/**
 * Tonight's rankings — the list football puts at the foot of its weekly page, asking the
 * daily question instead.
 *
 * NOT "WHO IS GOOD", BUT "WHO SCORES TONIGHT". That difference reorders the board heavily,
 * and the important consequence is what is MISSING: a star on a dark night is absent
 * entirely rather than ranked low. Ranking him low would imply he is a worse play than the
 * man above him, when he is not a play at all — and a reader scanning for his name would
 * find it and draw the wrong conclusion.
 *
 * Free agents sit beside rostered players for the same reason the draft board mixes them: on
 * any given night the best available body is frequently unowned, and a list showing only what
 * is taken cannot tell you that.
 */
import { computed, ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { teamLogoFor } from '@/players/teamLogo'
import type { RankedRow } from '@/composables/useDailyLineup'

const props = defineProps<{
  rows: RankedRow[]
  /** The league's own slot order, so the filters read the way its lineup page does. */
  slotOrder?: string[]
}>()

const leagueStore = useLeagueStore()
const logo = (abbr?: string) => teamLogoFor(leagueStore.activeSport, abbr)
const one = (n: number) => n.toFixed(1)
function onLogoErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none' }

const LIMIT = 40

/*
 * Position filters in the LEAGUE'S OWN ORDER, not the alphabet.
 *
 * Sorted alphabetically a baseball league opened on 1B, 2B, 3B, C, CF, CI, DH... which is not
 * an order any manager thinks in and buries the catcher between third base and centre field.
 * The league already publishes the order it lists its own lineup in; anything it does not
 * name falls to the end rather than being dropped, because a multi-eligible player can carry
 * a position the slots never mention.
 */
const positions = computed(() => {
  const seen = new Set<string>()
  for (const r of props.rows) {
    for (const p of (r.position || '').split(/[,/|]/)) {
      const t = p.trim().toUpperCase()
      if (t) seen.add(t)
    }
  }
  const order = (props.slotOrder ?? []).map((s) => s.toUpperCase())
  const rank = (p: string) => {
    const i = order.indexOf(p)
    return i === -1 ? order.length + 1 : i
  }
  const sorted = [...seen].sort((a, b) => (rank(a) - rank(b)) || a.localeCompare(b))
  return ['ALL', ...sorted]
})

const filter = ref('ALL')
const shown = computed(() => {
  const f = filter.value
  const list = f === 'ALL'
    ? props.rows
    : props.rows.filter((r) => (r.position || '').toUpperCase().split(/[,/|]/).map((t) => t.trim()).includes(f))
  return list.slice(0, LIMIT)
})

/* Yours, somebody else's, or free — the same three states the football board marks, because
   "can I have him" is the first thing a reader asks of any name on this list. */
const OWNER_TONE: Record<string, string> = {
  mine: 'text-primary', free: 'text-[#7ee787]', rostered: 'text-dark-textMuted/60',
}
</script>

<template>
  <section v-if="rows.length" class="mt-5 rounded-xl border border-dark-border bg-dark-bg/40 p-4">
    <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
      Tonight's rankings
      <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
        &middot; your roster, the wire and the league &middot; projected points tonight
      </span>
    </h2>
    <p class="mb-3 font-mono text-[10px] text-dark-textMuted/60">
      only players with a game &mdash; a star on a dark night is not a low-ranked play, he is no play at all
    </p>

    <div class="mb-3 flex flex-wrap items-center gap-1.5">
      <button v-for="p in positions" :key="p"
              class="rounded-lg border px-2 py-1 font-mono text-[10px] uppercase transition-colors"
              :class="filter === p ? 'border-primary text-primary' : 'border-dark-border text-dark-textMuted hover:text-dark-text'"
              @click="filter = p">{{ p }}</button>
      <span class="flex-1"></span>
      <span class="font-mono text-[10px] text-dark-textMuted/60">
        <span class="text-primary">&#9733; yours</span> &middot;
        <span class="text-[#7ee787]">free agent</span> &middot;
        <span class="text-dark-textMuted/60">rostered</span>
      </span>
    </div>

    <div v-for="(r, i) in shown" :key="r.playerKey"
         class="flex items-center gap-3 border-b border-dark-border/40 py-2 text-sm last:border-0">
      <span class="w-7 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/50">{{ i + 1 }}</span>
      <img v-if="r.headshot" :src="r.headshot" :alt="r.name" loading="lazy" @error="onLogoErr"
           class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
      <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[9px] text-dark-textMuted">{{ r.position }}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate">
          <span v-if="r.owner === 'mine'" class="text-primary">&#9733;</span>
          <span :class="r.owner === 'mine' ? 'font-semibold text-dark-text' : 'text-dark-text'">{{ r.name }}</span>
          <span v-if="r.status && r.status !== 'ACTIVE'"
                class="ml-1 rounded bg-[#FF5C5C]/15 px-1 font-mono text-[9px] uppercase text-[#FF5C5C]">{{ r.status }}</span>
        </span>
        <span class="flex items-center gap-1 text-xs text-dark-textMuted">
          {{ r.position }}
          <template v-if="r.team">
            &middot; <img :src="logo(r.team)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ r.team }}
          </template>
        </span>
      </span>
      <span class="shrink-0 font-mono text-[10px]" :class="OWNER_TONE[r.owner]">
        {{ r.owner === 'free' ? 'free' : r.ownerName }}
      </span>
      <span class="w-14 shrink-0 text-right font-mono text-sm font-semibold text-dark-text">{{ one(r.today) }}</span>
    </div>

    <p v-if="rows.length > LIMIT" class="mt-2 font-mono text-[10px] text-dark-textMuted">
      showing {{ shown.length }} of {{ rows.length }} playing tonight
    </p>
  </section>
</template>
