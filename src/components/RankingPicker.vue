<script setup lang="ts">
/**
 * "ranked by [ UFD ▾ ]" — the one control that says where an order came from.
 *
 * Every surface that can be re-ordered by a custom list shows this, in the same
 * place, worded the same way. A board silently sorted by somebody else's opinion
 * is the failure mode worth engineering against: the user has to be able to
 * answer "whose ranking am I looking at?" without leaving the screen.
 *
 * Shown to any account holding the Season Pass, like the lists themselves.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useCustomRankings, UFD_LABEL, KIND_LABELS, KIND_STALE_DAYS, type RankingKind } from '@/composables/useCustomRankings'

const props = defineProps<{ kind: RankingKind }>()

// A getter, not props.kind — the Wire changes this prop when you switch the board's clock.
const rankings = useCustomRankings(() => props.kind)

/*
 * A picker with nothing in it has to say where lists come from.
 *
 * Offering only "UFD" is indistinguishable from being broken: somebody who has uploaded a list
 * and cannot find it here has no way to tell whether it failed to save, went to the wrong kind,
 * or belongs to another sport. It cost a real user a round trip mid-draft. The empty state
 * points at the page that adds one instead of leaving them to guess.
 */
const hasNone = computed(() => rankings.setsOfKind.value.length === 0)

/** Say it out loud when a weekly list is older than the week it describes. */
const staleNote = computed(() => {
  if (!rankings.enabled.value || !rankings.isStale.value) return ''
  const days = rankings.ageDays.value
  return days === null ? '' : `${days}d old`
})
</script>

<template>
  <p v-if="rankings.canUseRankings.value" class="flex items-center gap-2 font-mono text-[11px]">
    <span class="text-dark-textMuted">ranked by</span>
    <select
      :value="rankings.activeId.value"
      @change="rankings.setActive(($event.target as HTMLSelectElement).value)"
      class="rounded border border-dark-border bg-dark-card px-2 py-0.5 text-[11px]"
      :class="rankings.enabled.value ? 'text-primary' : 'text-dark-text'"
    >
      <option value="">{{ UFD_LABEL }}</option>
      <option v-for="set in rankings.setsOfKind.value" :key="set.id" :value="set.id">{{ set.name }}</option>
    </select>
    <span
      v-if="staleNote"
      class="rounded bg-[#FF5C5C]/15 px-1.5 py-0.5 text-[10px] text-[#FF5C5C]"
      :title="`Lists of this kind go stale after ${KIND_STALE_DAYS[props.kind]} days`"
    >{{ staleNote }}</span>
    <RouterLink
      v-if="hasNone"
      to="/settings"
      class="text-dark-textMuted underline decoration-dotted underline-offset-2 hover:text-primary"
      :title="`Upload a ${KIND_LABELS[props.kind]} list for ${rankings.sport.value}`"
    >upload one</RouterLink>
  </p>
</template>
