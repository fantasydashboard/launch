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
import { wordsFor } from '@/lib/sportWords'
import { assignTiers } from '@/draft/room/tierCliffs'
import { teamLogoFor } from '@/players/teamLogo'
import { availability, type RankedRow } from '@/composables/useDailyLineup'

const props = defineProps<{
  rows: RankedRow[]
  /** The league's own slot order, so the filters read the way its lineup page does. */
  slotOrder?: string[]
  /** Where tonight is cheap and where it is bare — the read above the list. */
  scarcity?: { cheap: { pos: string; name: string }[]; bare: string[] }
  /**
   * This week's opponent, by team name.
   *
   * Matched on the NAME rather than a key because the rankings carry the owner's display
   * name and nothing else. It is the marker football uses, and it earns its place: a player
   * on your opponent's bench is a different proposition from one on a third team's — taking
   * him helps you twice.
   */
  oppName?: string
}>()

const leagueStore = useLeagueStore()
const words = computed(() => wordsFor(leagueStore.activeSport))
const logo = (abbr?: string) => teamLogoFor(leagueStore.activeSport, abbr)

/*
 * TWO LISTS, BECAUSE THEY ARE NOT THE SAME QUESTION.
 *
 * Ranked together, the top forty was forty starting pitchers and no hitters — arithmetically
 * right and useless. A pitcher projects around twenty points tonight and a hitter around
 * three; they are not competing for the same seat and nobody chooses between them. Football
 * can mix positions because a quarterback, a back and a receiver score on one scale and do
 * compete, through flex. Baseball's do not.
 *
 * Sides are the scarce SCHEDULED position against the everyday body, which is the same split
 * the roster panel already makes: pitchers and hitters, goalies and skaters.
 */
const SCARCE: Record<string, string[]> = {
  baseball: ['SP', 'RP', 'P'], hockey: ['G'], basketball: ['C'],
}
const isScarce = (position: string) => {
  const list = SCARCE[leagueStore.activeSport] ?? SCARCE.baseball
  return (position || '').toUpperCase().split(/[,/|]/).some((t) => list.includes(t.trim()))
}
const side = ref<'skaters' | 'goalies'>('skaters')
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
  for (const r of bySide.value) {
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

/*
 * TIERS, BECAUSE A FLAT COLUMN OF HITTERS SAYS NOTHING.
 *
 * The top twenty-four hitters spanned 5.0 to 3.7 — twenty-four names inside 1.3 points, with
 * five-way ties at 3.9 and again at 3.8. Ranked one to twenty-four that reads as an ordering
 * when it is really a statement that they are the same player, and the rank number is doing
 * work the numbers do not support.
 *
 * Football's board draws tier lines for exactly this reason and I ported the list without the
 * thing that makes it readable. Same function it uses.
 */
const tiers = computed(() => assignTiers(shown.value.map((r) => ({ playerKey: r.playerKey, value: r.today }))))
const tierOf = (key: string) => tiers.value[key] ?? 1
/** True on the first row of a new tier, which is where the divider is drawn. */
const startsTier = (i: number) => i > 0 && tierOf(shown.value[i].playerKey) !== tierOf(shown.value[i - 1].playerKey)
const tierDrop = (i: number) => (shown.value[i - 1]?.today ?? 0) - (shown.value[i]?.today ?? 0)

const filter = ref('ALL')
const bySide = computed(() =>
  props.rows.filter((r) => (side.value === 'goalies') === isScarce(r.position)))
const shown = computed(() => {
  const f = filter.value
  const list = f === 'ALL'
    ? bySide.value
    : bySide.value.filter((r) => (r.position || '').toUpperCase().split(/[,/|]/).map((t) => t.trim()).includes(f))
  return list.slice(0, LIMIT)
})

/* Yours, somebody else's, or free — the same three states the football board marks, because
   "can I have him" is the first thing a reader asks of any name on this list. */
const OWNER_TONE: Record<string, string> = {
  mine: 'text-primary', free: 'text-[#7ee787]', rostered: 'text-dark-textMuted/60',
}
/** Fourth state: the man you are actually playing this week. */
const isOpp = (r: RankedRow) =>
  !!props.oppName && r.owner === 'rostered' && r.ownerName === props.oppName

const hasScarcity = computed(() =>
  !!(props.scarcity?.cheap.length || props.scarcity?.bare.length))
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

    <!--
      WHERE TONIGHT IS CHEAP AND WHERE IT IS BARE. The ranked list answers "who is best";
      this answers "is this position worth an add at all", which is the question that decides
      whether you spend a real asset. Absent entirely when neither read is true — an empty
      box that says "nothing is cheap tonight" is noise.
    -->
    <div v-if="hasScarcity"
         class="mb-3 rounded-lg border border-dark-border/60 bg-dark-card/40 px-3 py-2">
      <p v-if="scarcity?.cheap.length" class="font-mono text-[11px] text-[#7ee787]">
        Cheap here:
        <span class="text-dark-textMuted">
          <template v-for="(c, i) in scarcity.cheap" :key="c.pos">
            <span v-if="i"> &middot; </span>{{ c.pos }} ({{ c.name }} is free)
          </template>
          &mdash; don't pay a real asset for one.
        </span>
      </p>
      <p v-if="scarcity?.bare.length" class="font-mono text-[11px] text-[#e69a4a]">
        Bare here:
        <span class="text-dark-textMuted">
          {{ scarcity.bare.join(' · ') }} &mdash; a good one is worth more than his number says.
        </span>
      </p>
    </div>

    <div class="mb-3 flex rounded-lg border border-dark-border" style="width:fit-content">
      <button class="rounded-l-lg px-3 py-1 font-mono text-[11px] capitalize transition-colors"
              :class="side === 'skaters' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
              @click="side = 'skaters'; filter = 'ALL'">{{ words.skaters }}</button>
      <button class="rounded-r-lg px-3 py-1 font-mono text-[11px] capitalize transition-colors"
              :class="side === 'goalies' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
              @click="side = 'goalies'; filter = 'ALL'">{{ words.goalies }}</button>
    </div>

    <div class="mb-3 flex flex-wrap items-center gap-1.5">
      <button v-for="p in positions" :key="p"
              class="rounded-lg border px-2 py-1 font-mono text-[10px] uppercase transition-colors"
              :class="filter === p ? 'border-primary text-primary' : 'border-dark-border text-dark-textMuted hover:text-dark-text'"
              @click="filter = p">{{ p }}</button>
      <span class="flex-1"></span>
      <span class="font-mono text-[10px] text-dark-textMuted/60">
        <span class="text-primary">&#9733; yours</span> &middot;
        <span v-if="oppName" class="text-[#e69a4a]">&#9670; your opponent</span>
        <span v-if="oppName"> &middot; </span>
        <span class="text-[#7ee787]">free agent</span> &middot;
        <span class="text-dark-textMuted/60">rostered</span>
      </span>
    </div>

    <template v-for="(r, i) in shown" :key="r.playerKey">
      <!-- A tier line, with the drop that earned it — the caption is the evidence. -->
      <div v-if="startsTier(i)" class="flex items-center gap-3 py-2">
        <span class="h-px flex-1 bg-gradient-to-r from-transparent to-[#e69a4a]/50"></span>
        <span class="font-mono text-[9px] uppercase tracking-widest text-[#e69a4a]/80">
          tier {{ tierOf(r.playerKey) }} &middot; &minus;{{ tierDrop(i).toFixed(1) }}
        </span>
        <span class="h-px flex-1 bg-gradient-to-l from-transparent to-[#e69a4a]/50"></span>
      </div>

    <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 text-sm last:border-0">
      <span class="w-7 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/50">{{ i + 1 }}</span>
      <img v-if="r.headshot" :src="r.headshot" :alt="r.name" loading="lazy" @error="onLogoErr"
           class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
      <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[9px] text-dark-textMuted">{{ r.position }}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate">
          <span v-if="r.owner === 'mine'" class="text-primary">&#9733;</span>
          <span v-else-if="isOpp(r)" class="text-[#e69a4a]">&#9670;</span>
          <span :class="r.owner === 'mine' ? 'font-semibold text-dark-text' : 'text-dark-text'">{{ r.name }}</span>
          <!-- Anyone OUT is already filtered from this board, so every tag here is a
               day-to-day: amber, not red. -->
          <span v-if="r.status && r.status !== 'ACTIVE'"
                class="ml-1 rounded px-1 font-mono text-[9px] uppercase"
                :class="availability(r.status) === 'out' ? 'bg-[#FF5C5C]/15 text-[#FF5C5C]' : 'bg-[#e69a4a]/15 text-[#e69a4a]'">{{ r.status }}</span>
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
    </template>

    <p v-if="bySide.length > LIMIT" class="mt-2 font-mono text-[10px] text-dark-textMuted">
      showing {{ shown.length }} of {{ bySide.length }} {{ words[side] }} playing tonight
    </p>
  </section>
</template>
