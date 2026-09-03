<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { usePointsValue } from '@/composables/usePointsValue'
import { useFootballVor } from '@/composables/useFootballVor'
import { buildPointsTrades } from '@/myteam/pointsTrades'
import { buildPointsTradeLandscape } from '@/myteam/pointsTradeLandscape'
import { buildRosterCompare } from '@/myteam/rosterCompare'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'
import { nflTeamLogo } from '@/players/nflTeamLogo'
import type { AvailablePlayer } from '@/players/types'

const leagueStore = useLeagueStore()
const isFootball = computed(() => leagueStore.activeSport === 'football')
const teamLogo = (abbr?: string) => (isFootball.value ? nflTeamLogo(abbr) : mlbTeamLogo(abbr))

const source = useActivePointsSource()
const scoring = useLeagueScoring()

function loadAll() {
  scoring.load()
  source.load()
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const pool = source.pool
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const loading = source.loading
const myTeamKey = source.myTeamKey
const teamNames = source.teamNames
const leagueSize = source.leagueSize

const season = computed(() => '')
const { valueByKey } = usePointsValue({ pool, fgByKey, sport: computed(() => leagueStore.activeSport), season })

// Football VOR (shared engine). Replacement is calibrated on rostered players here
// (empty free-agent list) — cross-team ranking is unaffected; Trades stays self-contained.
const noFreeAgents = computed<AvailablePlayer[]>(() => [])
const { vorByKey: fbVor } = useFootballVor({
  pool,
  freeAgents: noFreeAgents,
  slots: rosterSlots,
  teams: leagueSize,
  season,
  enabled: isFootball,
  weeklyHorizon: 0, // Trades uses only rest-of-season VOR — skip weekly/streamability fetches
})
const tradeVor = computed(() => (isFootball.value ? fbVor.value : undefined))

const allIdeas = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return []
  return buildPointsTrades(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, teamNames.value, tradeVor.value)
})
// Deals proposable as-is, and deals worth chasing — never mixed, so a one-sided ask is
// never presented as something the other manager should happily accept.
const ideas = computed(() => allIdeas.value.filter((i) => i.kind === 'winWin'))
const asks = computed(() => allIdeas.value.filter((i) => i.kind === 'ask').slice(0, 4))

const landscape = computed(() => {
  if (!pool.value.length || !myTeamKey.value) return null
  /* Football passes the league's starting slots so a position is judged on the bodies the
     league actually starts (2 RBs here, not 1). Without it, one elite back made RB a
     "strength to trade from" on this page while My Team called RB the biggest hole —
     the same roster, two answers. Baseball keeps the previous single-best-body basis. */
  return buildPointsTradeLandscape(
    pool.value, valueByKey.value, fgByKey.value, myTeamKey.value, teamNames.value,
    leagueStore.activeSport, tradeVor.value,
    leagueStore.activeSport === 'football' ? rosterSlots.value : undefined,
  )
})

/**
 * Your worst-ranked position even when nothing is bad enough to be bottom-third.
 * "No glaring hole" on a roster that visibly has a thinnest spot reads as the tool not
 * looking, and it contradicted My Team, which always names a biggest hole. Every roster
 * has a weakest position; only some have a crisis.
 */
const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
const weakestSpot = computed(() => {
  const ls = landscape.value
  if (!ls || ls.myWeak.length) return ''
  let worst = ''
  let worstRank = 0
  for (const pos of ls.positions) {
    // teamKeys[0] is me, by the landscape's own contract.
    const r = ls.rank[pos]?.[ls.teamKeys[0]] ?? 0
    if (r > worstRank) { worstRank = r; worst = pos }
  }
  return worst ? `${worst} (${ordinal(worstRank)})` : ''
})

/**
 * The detail view under the landscape grid. The grid says who is strong where; it never shows
 * a player, so it cannot tell you what to actually offer. Picking a manager puts both rosters
 * side by side in one order, which is the form the conversation actually takes.
 */
const comparePartner = ref('')
const compareOptions = computed(() => {
  const ls = landscape.value
  if (!ls) return []
  return ls.teamKeys
    .filter((k) => k !== myTeamKey.value)
    .map((k) => ({ key: k, name: ls.teamNames[k] || teamNames.value[k] || 'Team' }))
})
// Default to the best-fit partner rather than making the user guess where to start.
watch(compareOptions, (opts) => {
  if (!opts.length) { comparePartner.value = ''; return }
  if (opts.some((o) => o.key === comparePartner.value)) return
  comparePartner.value = landscape.value?.partners[0]?.teamKey ?? opts[0].key
}, { immediate: true })

const compare = computed(() => {
  if (!comparePartner.value || !myTeamKey.value || !pool.value.length) return null
  return buildRosterCompare({
    pool: pool.value,
    valueByKey: valueByKey.value,
    fgByKey: fgByKey.value,
    myTeamKey: myTeamKey.value,
    theirTeamKey: comparePartner.value,
    slots: rosterSlots.value,
    sport: leagueStore.activeSport,
    vorByKey: tradeVor.value,
  })
})
const comparePartnerName = computed(
  () => compareOptions.value.find((o) => o.key === comparePartner.value)?.name ?? 'them',
)

// Short column label for the heatmap (initials / first chars of the team name).
function shortName(name: string): string {
  const cleaned = (name || '').replace(/[^A-Za-z0-9 ]/g, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const abbr = parts.length > 1 ? parts.map((w) => w[0]).join('') : cleaned.slice(0, 3)
  return (abbr || 'TM').toUpperCase().slice(0, 3)
}
function heatClass(rank: number, teams: number): string {
  if (!rank) return 'text-dark-textMuted/40'
  const f = rank / teams
  if (f <= 0.34) return 'bg-primary/20 text-primary'
  if (f >= 0.67) return 'bg-[#FF5C5C]/15 text-[#FF5C5C]'
  return 'text-dark-textMuted'
}

const round = (n: number) => Math.round(n)
// Football's headline currency is per-week, not season total — TradeSide only
// carries the season total, so look the per-week rate up from valueByKey
// (same PlayerValue every points engine already reads) rather than plumbing a
// second field through pointsTrades.ts.
const perGameOf = (key: string): number => {
  const v = valueByKey.value[key]
  return v && v.games > 0 ? v.total / v.games : 0
}
const tradePoints = (key: string, seasonTotal: number) => (isFootball.value ? perGameOf(key) : seasonTotal)
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
// Fairness read: who the deal favors, by comparing the two lineup gains honestly.
function fairness(myGain: number, theirGain: number): string {
  const hi = Math.max(myGain, theirGain)
  const lo = Math.min(myGain, theirGain)
  if (hi === 0 || lo >= 0.6 * hi) return 'even — both win'
  return myGain > theirGain ? 'favors you' : "favors them — easy yes"
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">Trades</h1>
      <p class="font-mono text-xs text-dark-textMuted">Deals that raise your projected points — and the other guy's too.</p>
    </header>

    <div v-if="loading && !landscape" class="py-16 text-center text-dark-textMuted">Scanning the league…</div>

    <template v-else>
      <!-- YOUR LEVERAGE -->
      <section v-if="landscape && (landscape.myStrong.length || landscape.myWeak.length)" class="mb-4 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Your leverage</p>
        <div class="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[11px]">
          <span class="w-14 shrink-0 text-dark-textMuted">trade from</span>
          <span v-for="p in landscape.myStrong" :key="'s' + p" class="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{{ p }}</span>
          <span v-if="!landscape.myStrong.length" class="text-dark-textMuted/60">no clear surplus position</span>
        </div>
        <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[11px]">
          <span class="w-14 shrink-0 text-dark-textMuted">to fix</span>
          <span v-for="p in landscape.myWeak" :key="'w' + p" class="rounded bg-[#FF5C5C]/10 px-1.5 py-0.5 text-[#FF5C5C]">{{ p }}</span>
          <span v-if="!landscape.myWeak.length" class="text-dark-textMuted/60">
            nothing bottom-third<template v-if="weakestSpot"> &middot; thinnest is <span class="text-dark-textSecondary">{{ weakestSpot }}</span></template>
          </span>
        </div>
        <p class="mt-1.5 font-mono text-[9px] text-dark-textMuted">deal a body from a spot you're deep → land one where you're thin.</p>
      </section>

      <!-- BEST DEALS -->
      <p v-if="ideas.length" class="mb-3 font-mono text-[11px] text-dark-textMuted">
        ★ Best deals — send a bench body, get one that <span class="text-primary">starts</span> for you. Both lineups improve.
      </p>
      <div v-if="!ideas.length && !loading" class="mb-3 rounded-xl border border-dark-border bg-dark-card px-4 py-4 text-center text-sm text-dark-textMuted">
        No swap right now raises both lineups.<template v-if="asks.length"> These do raise yours:</template>
      </div>

      <!-- ASKS — you gain, they don't. Real targets, honestly labelled. -->
      <div v-for="(idea, i) in asks" :key="'ask' + i" class="mb-3 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">ask {{ idea.oppTeamName }}</span>
          <span class="text-right">
            <span class="font-mono text-sm font-bold text-primary">+{{ idea.myGain }}</span>
            <span class="ml-1 font-mono text-[9px] uppercase text-dark-textMuted">pts to you</span>
          </span>
        </div>
        <div class="font-mono text-[12px] text-dark-text">
          <span class="text-[#FF5C5C]">give</span> {{ idea.give.name }} <span class="text-dark-textMuted">{{ idea.give.position }}</span>
          <span class="mx-1.5 text-dark-textMuted">&rarr;</span>
          <span class="text-primary">get</span> {{ idea.get.name }} <span class="text-dark-textMuted">{{ idea.get.position }}</span>
        </div>
        <p class="mt-2 font-mono text-[10px] leading-relaxed text-dark-textMuted">
          Doesn't improve their lineup ({{ idea.theirGain }} pts), so they have no reason to say yes on the
          numbers alone — sweeten it, or catch them wanting the name.
        </p>
      </div>

      <div v-for="(idea, i) in ideas" :key="i" class="mb-3 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">with {{ idea.oppTeamName }}</span>
          <span class="text-right">
            <span class="font-mono text-sm font-bold text-primary">+{{ idea.myGain }}</span>
            <span class="ml-1 font-mono text-[9px] uppercase text-dark-textMuted">pts to you</span>
          </span>
        </div>

        <div class="flex items-center gap-3">
          <!-- GET (their player → you) -->
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <img v-if="idea.get.headshot" :src="idea.get.headshot" :alt="idea.get.name" loading="lazy" class="h-9 w-9 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ idea.get.position }}</span>
            <span class="min-w-0">
              <span class="block font-mono text-[9px] uppercase text-primary">get</span>
              <span class="truncate text-sm font-semibold text-dark-text">{{ idea.get.name }}</span>
              <span class="flex items-center gap-1 text-[11px] text-dark-textMuted">
                {{ idea.get.position }} ·
                <img :src="teamLogo(idea.get.proTeam)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ idea.get.proTeam }} ·
                {{ round(tradePoints(idea.get.playerKey, idea.get.points)) }} {{ isFootball ? 'pts/wk' : 'pts' }}
              </span>
            </span>
          </div>

          <span class="shrink-0 font-mono text-xs text-dark-textMuted">⇄</span>

          <!-- GIVE (your player → them) -->
          <div class="flex min-w-0 flex-1 flex-row-reverse items-center gap-2 text-right">
            <img v-if="idea.give.headshot" :src="idea.give.headshot" :alt="idea.give.name" loading="lazy" class="h-9 w-9 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ idea.give.position }}</span>
            <span class="min-w-0">
              <span class="block font-mono text-[9px] uppercase text-dark-textMuted">give</span>
              <span class="truncate text-sm font-semibold text-dark-text">{{ idea.give.name }}</span>
              <span class="flex flex-row-reverse items-center gap-1 text-[11px] text-dark-textMuted">
                {{ idea.give.position }} ·
                <img :src="teamLogo(idea.give.proTeam)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ idea.give.proTeam }} ·
                {{ round(tradePoints(idea.give.playerKey, idea.give.points)) }} {{ isFootball ? 'pts/wk' : 'pts' }}
              </span>
            </span>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between border-t border-dark-border/40 pt-2 font-mono text-[10px] text-dark-textMuted">
          <span>they gain <span class="text-[#e69a4a]">+{{ idea.theirGain }}</span> — {{ fairness(idea.myGain, idea.theirGain) }}</span>
          <span v-if="idea.get.vor != null && idea.give.vor != null" class="text-dark-textMuted">
            value <span class="text-primary">{{ idea.get.vor >= 0 ? '+' : '' }}{{ round(idea.get.vor) }}</span>
            ⇄ <span>{{ idea.give.vor >= 0 ? '+' : '' }}{{ round(idea.give.vor) }}</span>
          </span>
          <span v-else>both lineups improve</span>
        </div>
      </div>

      <p v-if="ideas.length" class="mb-5 font-mono text-[10px] leading-relaxed text-dark-textMuted">
        gain = the lift to each side's optimal starting-lineup projected points · surplus-for-surplus, so neither side loses a starter
      </p>

      <!-- BEST TRADE PARTNERS -->
      <section v-if="landscape && landscape.partners.length" class="mb-4">
        <p class="mb-1 font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Best trade partners</p>
        <p class="mb-2 font-mono text-[9px] text-dark-textMuted">two-way fits first — they hold what you need, you hold what they need — then sell targets, where they're thin at a spot you're loaded</p>
        <div class="divide-y divide-dark-border/40 rounded-xl border border-dark-border bg-dark-card">
          <div v-for="p in landscape.partners" :key="p.teamKey" class="flex items-center gap-3 px-4 py-2.5">
            <span class="w-32 shrink-0 truncate text-sm text-dark-text">{{ p.teamName }}</span>
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]">
              <template v-if="p.youBuy.length">
                <span class="text-dark-textMuted">you buy</span>
                <span v-for="x in p.youBuy" :key="'b' + x" class="text-primary">{{ x }}</span>
              </template>
              <template v-if="p.theyNeed.length">
                <span class="text-dark-textMuted">they need</span>
                <span v-for="x in p.theyNeed" :key="'n' + x" class="text-[#e69a4a]">{{ x }}</span>
              </template>
              <span v-if="!p.youBuy.length && p.theyNeed.length" class="rounded bg-[#e69a4a]/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#e69a4a]">sell target</span>
            </span>
          </div>
        </div>
      </section>
      <p v-else-if="landscape && landscape.myStrong.length" class="mb-4 rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center text-sm text-dark-textMuted">
        No trade partners lining up right now — nobody's weak where you're loaded, and nobody's strong where you're thin.
      </p>

      <!-- TRADE LANDSCAPE -->
      <section v-if="landscape && landscape.positions.length">
        <p class="mb-2 font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Trade landscape</p>
        <div class="overflow-x-auto rounded-xl border border-dark-border bg-dark-card">
          <table class="w-full border-collapse text-center font-mono text-[11px]">
            <thead>
              <tr>
                <th class="px-2 py-1.5"></th>
                <th v-for="t in landscape.teamKeys" :key="t" class="px-1.5 py-1.5" :class="t === myTeamKey ? 'text-primary' : 'text-dark-textMuted'">
                  {{ t === myTeamKey ? 'YOU' : shortName(landscape.teamNames[t]) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pos in landscape.positions" :key="pos" class="border-t border-dark-border/30">
                <td class="px-2 py-1 text-left text-dark-textMuted">{{ pos }}</td>
                <td v-for="t in landscape.teamKeys" :key="t" class="px-1.5 py-1"
                  :class="[heatClass(landscape.rank[pos][t], landscape.teams), t === myTeamKey ? 'ring-1 ring-inset ring-primary/40' : '']">
                  {{ landscape.rank[pos][t] || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-2 font-mono text-[9px] leading-relaxed text-dark-textMuted">
          each cell = that team's rank at the position ({{ isFootball ? 'its starters there, by value over replacement' : "its best body's projected points" }}) ·
          <span class="text-primary">green</span> strong · <span class="text-[#FF5C5C]">red</span> weak ·
          a partner green where you're red is your best fit
        </p>
      </section>

      <!--
        Head to head. The grid above is an aggregate and never shows a player, so it can tell
        you WHO to talk to but not what to offer. This is the same question at roster level:
        both benches in one order, with the surplus you'd sell from and the hole you'd buy
        into on adjacent rows.
      -->
      <section v-if="compare" class="mt-4 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Head to head</p>
          <select
            v-model="comparePartner"
            class="rounded border border-dark-border bg-dark-bg px-2 py-1 font-mono text-[11px] text-dark-text"
            aria-label="Compare your roster with another team"
          >
            <option v-for="o in compareOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
          </select>
        </div>

        <p class="mb-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
          <template v-if="compare.youBuy.length || compare.youSell.length">
            <template v-if="compare.youSell.length">
              you're deeper at <span class="text-primary">{{ compare.youSell.join(', ') }}</span>
            </template>
            <template v-if="compare.youSell.length && compare.youBuy.length"> · </template>
            <template v-if="compare.youBuy.length">
              they're deeper at <span class="text-[#FF5C5C]">{{ compare.youBuy.join(', ') }}</span>
            </template>
          </template>
          <template v-else>no position separates you two by enough to build a deal around</template>
        </p>

        <div v-for="row in compare.positions" :key="'cmp-' + row.position" class="mb-3 last:mb-0">
          <div class="mb-1 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider">
            <span class="text-dark-textMuted">{{ row.position }}</span>
            <span :class="row.edge > 0 ? 'text-primary' : row.edge < 0 ? 'text-[#FF5C5C]' : 'text-dark-textMuted'">
              {{ row.edge > 0 ? 'you +' : row.edge < 0 ? 'them +' : 'even ' }}{{ Math.abs(round(row.edge)) }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-lg bg-dark-bg/60 p-2">
              <div v-if="!row.mine.length" class="font-mono text-[10px] text-dark-textMuted/60">nobody</div>
              <div v-for="b in row.mine" :key="b.playerKey" class="flex items-center gap-1.5 py-0.5 text-[12px]">
                <span class="min-w-0 flex-1 truncate" :class="b.starter ? 'text-dark-text' : 'text-dark-textMuted'">
                  {{ b.name }}
                </span>
                <span class="shrink-0 font-mono text-[10px]" :class="b.starter ? 'text-dark-text' : 'text-dark-textMuted/70'">
                  {{ b.value >= 0 ? '+' : '' }}{{ round(b.value) }}
                </span>
              </div>
            </div>
            <div class="rounded-lg bg-dark-bg/60 p-2">
              <div v-if="!row.theirs.length" class="font-mono text-[10px] text-dark-textMuted/60">nobody</div>
              <div v-for="b in row.theirs" :key="b.playerKey" class="flex items-center gap-1.5 py-0.5 text-[12px]">
                <span class="min-w-0 flex-1 truncate" :class="b.starter ? 'text-dark-text' : 'text-dark-textMuted'">
                  {{ b.name }}
                </span>
                <span class="shrink-0 font-mono text-[10px]" :class="b.starter ? 'text-dark-text' : 'text-dark-textMuted/70'">
                  {{ b.value >= 0 ? '+' : '' }}{{ round(b.value) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p class="mt-3 font-mono text-[9px] leading-relaxed text-dark-textMuted">
          you on the left, {{ comparePartnerName }} on the right ·
          bright = starts for that roster, dim = depth ·
          {{ isFootball ? 'value over replacement, rest of season' : 'projected points, rest of season' }}
        </p>
      </section>
    </template>
  </div>
</template>
