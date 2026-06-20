<script setup lang="ts">
import { computed } from 'vue'
import type { RosterPlayer } from '@/composables/useMyRoster'
import type { PlayerContribution } from '@/myteam/types'
import type { DropAnalysis } from '@/myteam/dropCandidates'
import { valueTier } from '@/myteam/value'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'
import ValueBadge from '@/components/trades/ValueBadge.vue'

const props = defineProps<{
  players: RosterPlayer[]
  categories: { statId: string; label: string; name: string }[]
  contributions?: PlayerContribution[]
  drops?: DropAnalysis
  // playerKey -> position where this started player is a "lineup leak" (weak for the slot).
  weakStarters?: Map<string, string>
  // playerKeys that are sell-high trade chips (overperforming, due to regress).
  sellHigh?: Set<string>
}>()

interface ContribChip {
  statId: string
  label: string
}

type Tier = 'core' | 'solid' | 'fringe'

interface RosterRow {
  player: RosterPlayer
  plus: ContribChip[]
  minus: ContribChip[]
  // Helping categories beyond the displayed cap (shown as "+N"). Keeps rows
  // scannable in deep, many-category leagues where a stud helps 8+ categories.
  plusOverflow: number
  // Single muted chip for a player's best category when they have no plus chips
  // (so the row isn't blank). Null when they have plus chips or no contributed cat.
  topChip: ContribChip | null
  roleValue: number // role-relative percentile — drives the within-role tier + sort
  crossValue: number // cross-role trade value (0-100) — the displayed number, matches Trades
  proLogo?: string // MLB team logo
  tier: Tier
  dropReason: string | null
  isWeakLink: boolean
}

interface RosterSection { role: 'hitter' | 'pitcher'; label: string; rows: RosterRow[] }

// Cap how many contribution chips render per player so a row stays readable
// even in 15-20 category leagues. We show a player's strongest helping cats and
// worst hurting cats; the rest collapse into a "+N" count.
const MAX_PLUS_CHIPS = 4
const MAX_MINUS_CHIPS = 3

// statId -> short category label (e.g. "HR", "ERA") for chip text.
const labelByStatId = computed(() => {
  const map = new Map<string, string>()
  for (const c of props.categories) map.set(c.statId, c.label)
  return map
})

// playerKey -> its contribution record.
const contribByKey = computed(() => {
  const map = new Map<string, PlayerContribution>()
  for (const c of props.contributions ?? []) map.set(c.playerKey, c)
  return map
})

// playerKey -> drop reason (title/tooltip text).
const dropReasonByKey = computed(() => {
  const map = new Map<string, string>()
  for (const c of props.drops?.candidates ?? []) map.set(c.playerKey, c.reason)
  return map
})

// Build rows split into Hitters and Pitchers, each sorted by roleValue desc and
// tagged with a value tier (core / solid / fringe) for hairline dividers.
const sections = computed<RosterSection[]>(() => {
  const weakLink = props.drops?.weakLink ?? null

  const build = (player: RosterPlayer): RosterRow => {
    const contrib = contribByKey.value.get(player.playerKey)
    const allPlus: { chip: ContribChip; percentile: number }[] = []
    const allMinus: { chip: ContribChip; percentile: number }[] = []
    if (contrib) {
      for (const c of contrib.contribs) {
        const label = labelByStatId.value.get(c.statId) || c.statId
        const entry = { chip: { statId: c.statId, label }, percentile: c.percentile }
        if (c.tier === 'plus') allPlus.push(entry)
        else if (c.tier === 'minus') allMinus.push(entry)
      }
    }
    // Strongest helping cats first (highest percentile); worst hurting cats first
    // (lowest percentile). Cap each so deep leagues don't flood the row.
    allPlus.sort((a, b) => b.percentile - a.percentile)
    allMinus.sort((a, b) => a.percentile - b.percentile)
    const plus = allPlus.slice(0, MAX_PLUS_CHIPS).map((x) => x.chip)
    const minus = allMinus.slice(0, MAX_MINUS_CHIPS).map((x) => x.chip)
    const plusOverflow = Math.max(0, allPlus.length - MAX_PLUS_CHIPS)
    // When a player has no plus chips, surface their best category as a muted chip.
    // Only when topStatId maps to a REAL category label — otherwise (unmatched
    // rookie, raw stat id) we'd render a stray glyph that reads as a render bug, so
    // we leave the chip area empty instead.
    let topChip: ContribChip | null = null
    if (plus.length === 0 && contrib?.topStatId && labelByStatId.value.has(contrib.topStatId)) {
      topChip = {
        statId: contrib.topStatId,
        label: labelByStatId.value.get(contrib.topStatId)!,
      }
    }
    const roleValue = contrib?.roleValue ?? 0
    return {
      player,
      plus,
      minus,
      plusOverflow,
      topChip,
      roleValue,
      crossValue: contrib?.crossPercentile ?? 0,
      proLogo: mlbTeamLogo(player.team),
      tier: valueTier(roleValue),
      dropReason: dropReasonByKey.value.get(player.playerKey) ?? null,
      isWeakLink: weakLink !== null && player.playerKey === weakLink,
    }
  }

  const rows = props.players.map(build)
  const roleByKey = new Map(props.contributions?.map((c) => [c.playerKey, c.role]) ?? [])
  const split = (role: 'hitter' | 'pitcher') =>
    rows
      .filter((r) => (roleByKey.get(r.player.playerKey) ?? 'hitter') === role)
      .sort((a, b) => b.roleValue - a.roleValue)
  return [
    { role: 'hitter', label: 'Hitters', rows: split('hitter') },
    { role: 'pitcher', label: 'Pitchers', rows: split('pitcher') },
  ].filter((s) => s.rows.length > 0)
})

// The MLB team logo is decorative — hide it on a broken load.
function onLogoErr(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="rounded-xl bg-dark-card border border-dark-border divide-y divide-dark-border/40">
    <p v-if="sections.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">
      No roster data available.
    </p>

    <div v-for="section in sections" :key="section.role">
      <!-- Section header: role name + comparison basis -->
      <div class="px-4 pt-4 pb-1 text-xs font-display font-semibold uppercase tracking-wide text-dark-textMuted">
        {{ section.label }}
        <span class="font-mono text-[10px] normal-case tracking-normal text-dark-textMuted/70">
          · ranked vs rostered {{ section.label.toLowerCase() }}
        </span>
      </div>

      <template v-for="(row, i) in section.rows" :key="row.player.playerKey">
        <!-- Hairline tier divider whenever the tier changes within this section -->
        <div
          v-if="i === 0 || row.tier !== section.rows[i - 1].tier"
          class="flex items-center gap-2 px-4 pt-2 pb-1"
        >
          <span
            class="font-mono text-[10px] uppercase tracking-wider"
            :class="row.tier === 'core' ? 'text-primary' : row.tier === 'fringe' ? 'text-dark-textMuted' : 'text-dark-textSecondary'"
          >{{ row.tier }}</span>
          <span class="h-px flex-1 bg-dark-border/50"></span>
        </div>

        <div class="flex items-center gap-3 px-4 py-2.5">
          <!-- Headshot -->
          <img
            v-if="row.player.headshot"
            :src="row.player.headshot"
            :alt="row.player.name"
            loading="lazy"
            class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover"
          />
          <span
            v-else
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border text-xs font-mono text-dark-textMuted"
            aria-hidden="true"
          >{{ row.player.position || '—' }}</span>

          <!-- Name + position · team, with drop / weak-link tags. No flex-grow, so the
               contribution chips sit right beside the name instead of being flung to the
               far edge on wide screens (the value keeps its own right rail below). -->
          <span class="min-w-0">
            <span class="flex items-center gap-2">
              <span class="truncate text-sm font-sans font-semibold text-dark-text">
                {{ row.player.name }}
              </span>
              <span
                v-if="row.isWeakLink"
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#FF5C5C] bg-[#FF5C5C]/10"
              >weak link</span>
              <span
                v-else-if="row.dropReason"
                :title="row.dropReason"
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-dark-textMuted bg-dark-border/60"
              >drop?</span>
              <span
                v-if="props.weakStarters?.has(row.player.playerKey)"
                :title="'A stronger ' + props.weakStarters.get(row.player.playerKey) + ' is on your bench'"
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#F2B33A] bg-[#F2B33A]/10"
              >weak {{ props.weakStarters.get(row.player.playerKey) }}</span>
              <span
                v-if="props.sellHigh?.has(row.player.playerKey)"
                title="Overperforming his projection — peak trade value. Shop him on Trades."
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary bg-primary/10"
              >★ sell-high</span>
            </span>
            <span class="flex items-center gap-1 text-xs text-dark-textMuted">
              {{ row.player.position }}
              <template v-if="row.player.team">
                ·
                <img v-if="row.proLogo" :src="row.proLogo" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
                {{ row.player.team }}
              </template>
            </span>
          </span>

          <!-- Per-category contribution chips, hugging the name -->
          <span class="flex shrink-0 flex-wrap items-center gap-1">
            <span
              v-for="chip in row.plus"
              :key="'p-' + chip.statId"
              class="rounded px-1.5 py-0.5 font-mono text-xs text-primary bg-primary/10"
            >{{ chip.label }}</span>
            <span
              v-if="row.plusOverflow > 0"
              :title="row.plusOverflow + ' more helping categories'"
              class="rounded px-1.5 py-0.5 font-mono text-xs text-primary/70 bg-primary/5"
            >+{{ row.plusOverflow }}</span>
            <span
              v-for="chip in row.minus"
              :key="'m-' + chip.statId"
              class="rounded px-1.5 py-0.5 font-mono text-xs text-[#FF5C5C] bg-[#FF5C5C]/10"
            >{{ chip.label }}</span>
            <span
              v-if="row.topChip"
              class="rounded px-1.5 py-0.5 font-mono text-xs text-dark-textMuted bg-dark-border/60"
            >{{ row.topChip.label }}</span>
          </span>

          <!-- Cross-role rest-of-season trade value (0-100) — same number as the Trades page,
               comparable across positions. The "vs all" tag flags that this number ranks against
               the WHOLE league pool, while the section header / tiers rank within the role —
               two different frames that otherwise read as a contradiction. -->
          <span class="ml-auto flex shrink-0 items-center gap-1.5">
            <span class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/60">vs all</span>
            <ValueBadge :value="row.crossValue" />
          </span>
        </div>
      </template>
    </div>

    <!-- Legend: what the chips and the rightmost number mean -->
    <p v-if="sections.length > 0" class="px-4 py-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
      <span class="text-primary">green</span> = a category this player helps ·
      <span class="text-[#FF5C5C]">red</span> = one they hurt ·
      <span class="text-dark-textMuted/80">vs all</span> number = rest-of-season trade value vs all rostered players (0–100, same as Trades) ·
      sections &amp; tiers rank within each role
    </p>
  </div>
</template>
