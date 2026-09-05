<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { usePointsValue } from '@/composables/usePointsValue'
import { useFootballVor } from '@/composables/useFootballVor'
import { buildPointsTrades } from '@/myteam/pointsTrades'
import { buildPointsTeam } from '@/myteam/pointsTeam'
import { buildPointsTradeLandscape } from '@/myteam/pointsTradeLandscape'
import { buildRosterCompare } from '@/myteam/rosterCompare'
import { useDynastyValues } from '@/composables/useDynastyValues'
import { scoreDynastyTrade, reseatByDynasty } from '@/football/dynastyValues'
import { readAge, AGE_TONE } from '@/football/positionalAge'
import { readHorizons } from '@/football/dynastyValues'
import { buildPowerRankings, type PowerTeamInput } from '@/league/powerRankings'
import { MIN_SENDABLE_ODDS, type TeamSituation } from '@/myteam/tradeStrategy'
import SeasonPassGate from '@/components/SeasonPassGate.vue'
import RankingPicker from '@/components/RankingPicker.vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { startableCounts, startableFraction } from '@/trades/rosterSlots'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'
import { nflTeamLogo } from '@/players/nflTeamLogo'
import type { AvailablePlayer } from '@/players/types'

const leagueStore = useLeagueStore()
const { hasFullAccess } = useFeatureAccess()
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
const myTeamLogo = source.myTeamLogo
const teamLogos = source.teamLogos

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

/*
 * Which horizon the ANALYSIS answers for.
 *
 * Landscape, leverage, best partners and head to head all read one value map, so re-seating
 * that map is what turns every one of them dynasty-aware at once: "who is deep at receiver"
 * has a genuinely different answer when depth means assets rather than this year's points.
 *
 * The DEAL CARDS deliberately do not follow it. Their number is lineup-marginal — what a swap
 * does to the eleven players you actually start — which is a this-season quantity by
 * construction; re-seating it would produce a figure in units of nothing. Every card already
 * carries the dynasty delta beside it, which is the honest way to show both: two currencies,
 * never averaged, same rule as everywhere else in here.
 */
type TradeView = 'season' | 'dynasty'
const tradeView = ref<TradeView>('season')
const TRADE_VIEWS: { key: TradeView; label: string; hint: string }[] = [
  { key: 'season', label: 'This season', hint: 'depth measured in rest-of-season points' },
  { key: 'dynasty', label: 'Dynasty', hint: 'depth measured in long-term asset value' },
]
const analysisVor = computed(() => {
  const base = tradeVor.value
  if (!base || tradeView.value !== 'dynasty' || !dynasty.ready.value) return base
  return reseatByDynasty(base, dynasty.rows.value)
})

/*
 * Who is contending, who is rebuilding, and whose season is already over.
 *
 * The deal engine treated every opponent as an identical bag of players, when posture is most
 * of what decides who says yes: a team playing out the string stops answering, and a team that
 * needs the win this week will pay for it. powerRankings already computes this for the League
 * board — the trade page simply never asked it.
 */
const situations = computed<Record<string, TeamSituation>>(() => {
  const model = teamModel.value
  const meta = source.teamMeta.value ?? {}
  if (!model?.standings?.length) return {}
  const inputs: PowerTeamInput[] = model.standings.map((st) => {
    const m: any = meta[st.teamKey] ?? {}
    return {
      teamKey: st.teamKey, teamName: teamNames.value[st.teamKey] ?? 'Team',
      strength: st.startingPoints,
      wins: m.wins ?? 0, losses: m.losses ?? 0, ties: m.ties ?? 0, pointsFor: m.pointsFor ?? 0,
    }
  })
  const pr = buildPowerRankings(inputs)
  const out: Record<string, TeamSituation> = {}
  const n = pr.rows.length
  for (const r of pr.rows) {
    const posture = r.tier === 'Contender' ? 'contender' : r.tier === 'Rebuilder' ? 'rebuilder' : 'bubble'
    /* Stakes need games played to mean anything — before that, every record is 0-0 and any
       read is an assertion about a season that has not happened. */
    const played = r.wins + r.losses + r.ties
    const stakes = played < 3
      ? 'unknown'
      : r.recordRank <= Math.ceil(n / 3) ? 'live'
      : r.recordRank > n - Math.floor(n / 4) ? 'coasting'
      : 'must-win'
    out[r.teamKey] = { posture, stakes } as TeamSituation
  }
  return out
})

const allIdeas = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return []
  return buildPointsTrades(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, teamNames.value, tradeVor.value, situations.value)
})
// Deals proposable as-is, and deals worth chasing — never mixed, so a one-sided ask is
// never presented as something the other manager should happily accept.
const ideas = computed(() => allIdeas.value.filter((i) => i.kind === 'winWin'))
const asks = computed(() => allIdeas.value.filter((i) => i.kind === 'ask').slice(0, 4))
// Win-wins first, then the bounded asks — one list, one card shape.
/*
 * Ranked by whether they would actually say yes, not by what you would gain.
 *
 * Asks were sorted on net surplus — my gain minus their loss — which optimises my outcome
 * while ignoring acceptance entirely, and is exactly how "costs them 29 — worth asking"
 * reached the top of the board. A five-point gain a desperate team takes beats a thirty-point
 * gain nobody takes, so the sort runs on gain × odds.
 */
const copiedPitch = ref<number | null>(null)
async function copyPitch(text: string, i: number) {
  try {
    await navigator.clipboard.writeText(text)
    copiedPitch.value = i
    setTimeout(() => { if (copiedPitch.value === i) copiedPitch.value = null }, 1600)
  } catch { /* clipboard blocked — the text is on screen to select by hand */ }
}

const dealCards = computed(() =>
  [...ideas.value, ...asks.value]
    /* Under the floor is clutter, not a long shot. The board printed a swap at 2% acceptance
       under a heading offering it as something to send; nobody sends that, and it pushed real
       deals down the page. */
    .filter((d) => d.odds >= MIN_SENDABLE_ODDS)
    .sort((a, b) => b.myGain * b.odds - a.myGain * a.odds),
)

/*
 * The second horizon, beside the first — never instead of it.
 *
 * Every trade tool gives one number and hides which clock it is on. A deal that wins you six
 * points a week and costs you a 22-year-old is a real trade a real manager might still want;
 * so is the reverse. Scoring both and printing the disagreement is the thing that makes this
 * a decision rather than a verdict.
 *
 * Our per-week points stay OUR number. Dynasty comes from the market and stays on the
 * market's scale. They are shown side by side and never averaged, for the same reason talent
 * and record are two sorts on the League board instead of one blended score.
 */
const dynasty = useDynastyValues({
  rosterSlots,
  leagueSize,
  scoring: computed(() => scoring.weights.value as Record<string, number>),
  enabled: computed(() => leagueStore.activeSport === 'football'),
  players: computed(() => pool.value.map((p) => ({ playerKey: p.playerKey, name: p.name, position: p.position }))),
})
/* Returns null when the market has not priced every player in the deal. Summing what we
   happen to know would print a confident number over a hole, and it would look exactly like
   a complete one. Better to say nothing about that deal's future. */
const dynRow = (key?: string) => (key ? dynasty.rows.value[key] ?? null : null)
/*
 * The same read the Wire shows, and for the same reason it changed there: this fired on the
 * raw distance between the two ranks and called it buy-low or sell-high. Those terms describe
 * a price adrift from a value, which is not what this measures, and the raw gap is mostly an
 * age readout (r = -0.67 on the live market). It is descriptive now — win-now or future — and
 * only where the gap outruns what age and position already account for.
 *
 * Read across BOTH rosters at once, so a player is measured against the same population his
 * counterpart is, rather than against whichever side of the table he happens to sit on.
 */
const GAP_CLS: Record<string, string> = { future: 'text-[#7ee787]', 'win-now': 'text-[#e69a4a]' }
const h2hHorizons = computed(() => {
  const out: Record<string, ReturnType<typeof readHorizons>> = {}
  for (const row of compare.value?.positions ?? []) {
    out[row.position] = readHorizons(
      [...row.mine, ...row.theirs].map((b) => ({
        playerKey: b.playerKey,
        seasonRank: b.posRank,
        dynastyRank: dynRow(b.playerKey)?.positionRank ?? 0,
        age: dynRow(b.playerKey)?.age ?? null,
      })),
    )
  }
  return out
})
const h2hGap = (b: { playerKey: string }, position: string): string =>
  h2hHorizons.value[position]?.[b.playerKey]?.lean ?? ''
const dynastyScore = (idea: { gives: { playerKey: string }[]; gets: { playerKey: string }[] }) =>
  dynasty.ready.value
    ? scoreDynastyTrade(idea.gives.map((g) => g.playerKey), idea.gets.map((g) => g.playerKey), dynasty.rows.value)
    : null
/* Two signs, four readings. Both up is the rare one worth calling out; both down never
   reaches the page because the engine does not propose deals that lose now. */
const dealVerdict = (nowGain: number, dyn: { delta: number } | null) => {
  if (!dyn) return null
  const futureUp = dyn.delta > 0
  if (nowGain > 0 && futureUp) return { text: 'win-win', cls: 'bg-primary/15 text-primary' }
  if (nowGain > 0) return { text: 'win-now', cls: 'bg-[#e69a4a]/15 text-[#e69a4a]' }
  if (futureUp) return { text: 'rebuild', cls: 'bg-[#7ee787]/15 text-[#7ee787]' }
  /* The fourth case, which was missing: nothing gained now and value lost later. Three
     verdicts for good outcomes and silence for the bad one meant the worst deals on the page
     were the only ones with no label at all. */
  return { text: 'avoid', cls: 'bg-[#FF5C5C]/15 text-[#FF5C5C]' }
}

const landscape = computed(() => {
  if (!pool.value.length || !myTeamKey.value) return null
  /* Football passes the league's starting slots so a position is judged on the bodies the
     league actually starts (2 RBs here, not 1). Without it, one elite back made RB a
     "strength to trade from" on this page while My Team called RB the biggest hole —
     the same roster, two answers. Baseball keeps the previous single-best-body basis. */
  return buildPointsTradeLandscape(
    pool.value, valueByKey.value, fgByKey.value, myTeamKey.value, teamNames.value,
    leagueStore.activeSport, analysisVor.value,
    leagueStore.activeSport === 'football' ? rosterSlots.value : undefined,
  )
})

/**
 * Your worst-ranked position even when nothing is bad enough to be bottom-third.
 * "No glaring hole" on a roster that visibly has a thinnest spot reads as the tool not
 * looking, and it contradicted My Team, which always names a biggest hole. Every roster
 * has a weakest position; only some have a crisis.
 */
/**
 * Your lineup against the league, slot by slot. This was the one thing on My Team that lived
 * nowhere else, and it belongs here: "which of my seats is weakest against the other nine
 * rosters" is the question that MOTIVATES a trade. On My Team it diagnosed a structural hole
 * and then offered a lineup button, which cannot fix one.
 */
const teamModel = computed(() => {
  if (!pool.value.length || !Object.keys(rosterSlots.value).length || !myTeamKey.value) return null
  return buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value)
})
const rankBar = (rank: number, teams: number) => (teams <= 1 ? 100 : Math.round(((teams - rank + 1) / teams) * 100))

/**
 * Colour a positional rank by where it sits in the STARTABLE pool rather than by the raw
 * number. WR44 and WR51 look identical otherwise, and RB3 only reads as elite if you already
 * know the league size. The pool comes from the league's own slots, so a 14-team superflex
 * gets different thresholds with no extra code — and onesie positions need no special case,
 * because "only ten quarterbacks start" is already the denominator.
 */
const startable = computed(() => startableCounts(rosterSlots.value, leagueSize.value))

/**
 * One five-band scale, fed a fraction of "how far through the field are you". Both callers
 * below hand it a different kind of fraction — rank within the startable pool, or rank among
 * the league's teams at a slot — and get the same colours, so a green on one block means the
 * same thing as a green on the other.
 */
function toneForFraction(f: number | null): string {
  if (f === null) return 'text-dark-textMuted/60'
  if (f <= 1 / 3) return 'text-[#7ee787]'   // top third
  if (f <= 2 / 3) return 'text-[#3fb950]'   // comfortably in
  if (f <= 1) return 'text-dark-textMuted'  // last third — replaceable
  if (f <= 1.5) return 'text-[#d29922]'     // just off the pool
  return 'text-[#f85149]'                   // well outside
}
function barForFraction(f: number | null): string {
  if (f === null) return 'bg-dark-textMuted/40'
  if (f <= 1 / 3) return 'bg-[#7ee787]'
  if (f <= 2 / 3) return 'bg-[#3fb950]'
  if (f <= 1) return 'bg-dark-textMuted/50'
  if (f <= 1.5) return 'bg-[#d29922]/70'
  return 'bg-[#f85149]/70'
}
const rankTone = (posRank: number, position: string) =>
  toneForFraction(startableFraction(posRank, position, startable.value))
/* The slot spine ranks you against the other teams at that seat, so the fraction is rank over
   league size — a different measurement, deliberately shown on the same scale. */
const slotTone = (rank: number, teams: number) => toneForFraction(teams > 0 ? rank / teams : null)
const slotBar = (rank: number, teams: number) => barForFraction(teams > 0 ? rank / teams : null)

/* The slot spine carries only a player key, so images come from the pool the page already
   has rather than being threaded through buildPointsTeam. */
const poolByKey = computed(() => new Map(pool.value.map((pl) => [pl.playerKey, pl])))
const headshotOf = (key: string) => poolByKey.value.get(key)?.headshot ?? ''
const proTeamOf = (key: string) => poolByKey.value.get(key)?.proTeam ?? ''

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
    vorByKey: analysisVor.value,
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
  /* `hi === 0` used to return "even — both win", which is how a swap worth nothing to either
     side came to be endorsed. Two zeroes are not a mutual win; they are not a trade. */
  if (hi <= 0) return 'neither lineup really moves'
  if (lo >= 0.6 * hi) return 'even — both win'
  return myGain > theirGain ? 'favors you' : "favors them — easy yes"
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">Trades</h1>
      <p class="font-mono text-xs text-dark-textMuted">Deals that raise your projected points — and the other guy's too.</p>
      <!-- One switch for the whole analysis. Only in dynasty leagues, where "who is deep at
           receiver" genuinely has two answers. -->
      <div v-if="dynasty.ready.value" class="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px]">
        <span class="uppercase tracking-widest text-dark-textMuted">depth measured in</span>
        <span class="flex items-center gap-0.5 rounded-lg border border-dark-border p-0.5">
          <button v-for="v in TRADE_VIEWS" :key="v.key"
                  class="rounded-md px-2.5 py-1 uppercase tracking-wider transition-colors"
                  :class="tradeView === v.key ? 'bg-primary/15 font-bold text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                  :title="v.hint"
                  @click="tradeView = v.key">{{ v.label }}</button>
        </span>
        <span class="text-dark-textMuted/70">
          {{ TRADE_VIEWS.find((v) => v.key === tradeView)?.hint }}<template v-if="tradeView === 'dynasty'"> &middot; deal gains stay per-week, with the dynasty cost beside them</template>
        </span>
        <!--
          Whose dynasty order the page is using, and the control to change it. There was no
          picker here at all: an uploaded list already drove this page through
          useDynastyValues, and nothing on screen said so or let you switch it.

          Only offered in the dynasty view, because the season side of this page runs on our
          own VOR straight from useFootballVor — no rest-of-season list is consulted, so a
          picker there would be a control that changes nothing, which is the failure I have
          spent this week removing.
        -->
        <RankingPicker v-if="tradeView === 'dynasty'" kind="dynasty" />
      </div>
    </header>

    <div v-if="loading && !landscape" class="py-16 text-center text-dark-textMuted">Scanning the league…</div>

    <template v-else>
      <!--
        Your lineup against the league, moved here from My Team. It is the setup for
        everything below it: the weakest seat is what you are trading FOR, and the leverage
        block underneath names what you would trade FROM.
      -->
      <section v-if="teamModel && teamModel.slotRanks.length" class="mb-4 rounded-xl border border-dark-border bg-dark-card">
        <div class="flex items-baseline justify-between gap-3 px-4 pt-4 pb-1">
          <h2 class="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
            <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onLogoErr" class="h-4 w-4 rounded bg-dark-border object-cover" />
            Your lineup vs the league
          </h2>
          <span class="font-mono text-[10px] text-dark-textMuted/70">projected points, rest of season · your starter vs every team's</span>
        </div>
        <div class="space-y-1.5 px-4 pb-4 pt-2">
          <div v-for="(sl, i) in teamModel.slotRanks" :key="'slot-' + i" class="flex items-center gap-3">
            <span class="w-10 shrink-0 font-mono text-xs text-dark-textMuted">{{ sl.slot }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm font-semibold"
                  :class="sl.starterKey ? slotTone(sl.rank, sl.teams) : 'text-dark-textMuted/50'">
              {{ sl.starterKey ? ordinal(sl.rank) : '—' }}
            </span>
            <img v-if="sl.starterKey && headshotOf(sl.starterKey)" :src="headshotOf(sl.starterKey)" :alt="sl.starterName" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
            <img v-if="sl.starterKey && proTeamOf(sl.starterKey)" :src="teamLogo(proTeamOf(sl.starterKey))" alt="" @error="onLogoErr" class="hidden h-3.5 w-3.5 shrink-0 object-contain sm:block" />
            <span class="w-32 shrink-0 truncate text-sm sm:w-40"
                  :class="sl.starterKey ? 'text-dark-text' : 'italic text-dark-textMuted/60'">
              {{ sl.starterKey ? sl.starterName : 'open slot' }}
            </span>
            <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-dark-bg">
              <div v-if="sl.starterKey" class="absolute inset-y-0 left-0 rounded-full" :class="slotBar(sl.rank, sl.teams)"
                   :style="{ width: rankBar(sl.rank, sl.teams) + '%' }" />
            </div>
            <span class="w-12 shrink-0 text-right font-mono text-xs text-dark-textMuted">
              {{ sl.starterKey ? round(sl.points) : '' }}
            </span>
          </div>
        </div>
      </section>

      <!--
        Where your lineup ranks against the league stays free — that is "where you stand",
        which the landing page gives away. Everything below is the trade itself, which is one
        of the four calls the Season Pass sells and was fully readable to anyone.
      -->
      <SeasonPassGate
        v-if="!hasFullAccess"
        headline="The deal, and who to send it to"
        body="Where your lineup ranks against the league stays free, as do standings, power rankings and history. This is the trade itself: who is thin where you are deep, what a swap is worth to both sides, and the message that gets a reply."
        cta="Unlock trades — $39"
      />

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

      <!--
        One card shape for every deal — 1-for-1 or 2-for-1, win-win or ask. The old markup
        assumed a single body per side, which is the assumption that made every suggestion a
        beg: in a 1-for-1 you only gain a lot when they lose a lot.
      -->
      <template v-for="(idea, i) in dealCards" :key="'deal-' + i">
        <div class="mb-3 rounded-xl border bg-dark-card p-4"
             :class="idea.kind === 'winWin' ? 'border-primary/40' : 'border-dark-border'">
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="flex min-w-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
              <img v-if="teamLogos[idea.oppTeamKey]" :src="teamLogos[idea.oppTeamKey]" alt="" @error="onLogoErr" class="h-4 w-4 shrink-0 rounded bg-dark-border object-cover" />
              <span class="truncate">{{ idea.kind === 'winWin' ? 'with' : 'ask' }} {{ idea.oppTeamName }}</span>
              <span v-if="idea.shape === '2for1'" class="shrink-0 rounded bg-dark-bg px-1.5 py-0.5 text-[9px] text-dark-textSecondary">2-for-1</span>
            </span>
            <span class="shrink-0 text-right">
              <span v-if="dealVerdict(idea.myGain, dynastyScore(idea))"
                    class="mr-1.5 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                    :class="dealVerdict(idea.myGain, dynastyScore(idea))!.cls">
                {{ dealVerdict(idea.myGain, dynastyScore(idea))!.text }}
              </span>
              <span class="font-mono text-sm font-bold text-primary">+{{ idea.myGain }}</span>
              <span class="ml-1 font-mono text-[9px] uppercase text-dark-textMuted">pts to you</span>
            </span>
          </div>

          <!--
            Both clocks, side by side. The per-week number is ours, from projections; the
            dynasty number is the market's, on the market's own scale. They are never
            averaged — a single blended score is exactly how every other tool hides which
            horizon a deal actually wins on.
          -->
          <div v-if="dynasty.ready.value" class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-dark-bg/50 px-2.5 py-1.5 font-mono text-[10px]">
            <span class="text-dark-textMuted">this year <span class="text-primary">+{{ idea.myGain }}</span> / wk</span>
            <span v-if="dynastyScore(idea)" class="text-dark-textMuted">
              dynasty
              <span :class="dynastyScore(idea)!.delta >= 0 ? 'text-[#7ee787]' : 'text-[#e69a4a]'">
                {{ dynastyScore(idea)!.delta >= 0 ? '+' : '−' }}{{ Math.abs(Math.round(dynastyScore(idea)!.delta)).toLocaleString() }}
              </span>
            </span>
            <!-- Refusing to score is a result. A total summed over a player the market never
                 priced looks identical to a complete one. -->
            <span v-else class="text-dark-textMuted/60">dynasty — not all players priced</span>
            <span class="text-dark-textMuted/50">picks not included</span>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <div class="rounded-lg bg-dark-bg/50 p-2">
              <span class="mb-1 block font-mono text-[9px] uppercase text-primary">get</span>
              <div v-for="g in idea.gets" :key="'g-' + g.playerKey" class="flex items-center gap-2 py-0.5">
                <img v-if="g.headshot" :src="g.headshot" :alt="g.name" loading="lazy" @error="onLogoErr" class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
                <span v-else class="h-7 w-7 shrink-0 rounded-full bg-dark-border" />
                <img v-if="g.proTeam" :src="teamLogo(g.proTeam)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
                <span class="min-w-0 flex-1 truncate text-sm text-dark-text">{{ g.name }}</span>
                <span class="shrink-0 font-mono text-[10px] text-dark-textMuted">{{ g.position }}</span>
                <span v-if="dynasty.ready.value" class="hidden w-14 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/70 sm:inline">
                  {{ dynRow(g.playerKey) ? g.position + dynRow(g.playerKey)!.positionRank : '—' }}
                </span>
                <span class="w-12 shrink-0 text-right font-mono text-[11px] text-dark-textMuted">{{ round(tradePoints(g.playerKey, g.points)) }}</span>
              </div>
            </div>
            <div class="rounded-lg bg-dark-bg/50 p-2">
              <span class="mb-1 block font-mono text-[9px] uppercase text-[#FF5C5C]">give</span>
              <div v-for="g in idea.gives" :key="'v-' + g.playerKey" class="flex items-center gap-2 py-0.5">
                <img v-if="g.headshot" :src="g.headshot" :alt="g.name" loading="lazy" @error="onLogoErr" class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
                <span v-else class="h-7 w-7 shrink-0 rounded-full bg-dark-border" />
                <img v-if="g.proTeam" :src="teamLogo(g.proTeam)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
                <span class="min-w-0 flex-1 truncate text-sm text-dark-textSecondary">{{ g.name }}</span>
                <span class="shrink-0 font-mono text-[10px] text-dark-textMuted">{{ g.position }}</span>
                <span v-if="dynasty.ready.value" class="hidden w-14 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/70 sm:inline">
                  {{ dynRow(g.playerKey) ? g.position + dynRow(g.playerKey)!.positionRank : '—' }}
                </span>
                <span class="w-12 shrink-0 text-right font-mono text-[11px] text-dark-textMuted">{{ round(tradePoints(g.playerKey, g.points)) }}</span>
              </div>
            </div>
          </div>

          <!--
            Why they would say yes, named. Every card used to carry the same sentence — "worth
            asking, but you'll need to sweeten it" — on a deal costing them 29 and on one
            costing them 5, which are not the same proposition at all.
          -->
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px]">
            <span class="rounded px-1.5 py-0.5 uppercase tracking-wide"
                  :class="idea.rung === 'fair' ? 'bg-primary/15 text-primary'
                        : idea.rung === 'reach' ? 'bg-[#e69a4a]/15 text-[#e69a4a]'
                        : 'bg-[#FF5C5C]/15 text-[#FF5C5C]'">
              {{ idea.rung === 'fair' ? 'they gain too' : idea.rung === 'reach' ? 'open here' : 'long shot' }}
            </span>
            <span class="text-dark-textMuted">{{ Math.round(idea.odds * 100) }}% they take it</span>
            <span v-if="idea.fills?.isHole" class="text-[#7ee787]">
              fills their {{ idea.fills.position }} hole — they're starting one below replacement
            </span>
            <span v-else-if="idea.theirGain > 0" class="text-dark-textMuted">lifts their lineup by {{ idea.theirGain }}</span>
            <span v-else class="text-dark-textMuted/70">nothing they need — costs them {{ Math.abs(idea.theirGain) }}</span>
          </div>

          <!-- The opener, led with their angle. Promised on the landing page and on the
               paywall, and never written until now. -->
          <div class="mt-2 rounded-lg bg-dark-bg/50 p-2.5">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted">Pitch</span>
              <button class="rounded bg-dark-border/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-dark-textSecondary hover:text-dark-text"
                      @click="copyPitch(idea.pitch, i)">{{ copiedPitch === i ? 'copied' : 'copy' }}</button>
            </div>
            <p class="font-mono text-[11px] leading-relaxed text-dark-textSecondary">{{ idea.pitch }}</p>
          </div>

          <!-- The old sentence read "worth asking, but you'll need to sweeten it" on every
               ask — identical on one costing them 5 and one costing them 29 — and it now
               contradicted the LONG SHOT badge and the odds sitting directly above it. The
               read is stated once, up there, where it is specific to the deal. -->
          <p v-if="idea.kind === 'winWin' || idea.shape === '2for1'"
             class="mt-2 font-mono text-[10px] leading-relaxed text-dark-textMuted">
            <template v-if="idea.kind === 'winWin'">
              Both lineups improve — theirs by {{ idea.theirGain }}. {{ fairness(idea.myGain, idea.theirGain) }}.
            </template>
            <template v-if="idea.shape === '2for1'">
              Two bodies for one also frees a roster spot you'll have to fill.
            </template>
          </p>
        </div>
      </template>

      <p v-if="dealCards.length" class="mb-5 font-mono text-[10px] leading-relaxed text-dark-textMuted">
        gain = the lift to each side's optimal starting-lineup projected points
      </p>

      <!-- BEST TRADE PARTNERS -->
      <section v-if="landscape && landscape.partners.length" class="mb-4">
        <p class="mb-1 font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Best trade partners</p>
        <p class="mb-2 font-mono text-[9px] text-dark-textMuted">two-way fits first — they hold what you need, you hold what they need — then sell targets, where they're thin at a spot you're loaded</p>
        <div class="divide-y divide-dark-border/40 rounded-xl border border-dark-border bg-dark-card">
          <div v-for="p in landscape.partners" :key="p.teamKey" class="flex items-center gap-3 px-4 py-2.5">
            <img v-if="teamLogos[p.teamKey]" :src="teamLogos[p.teamKey]" alt="" @error="onLogoErr" class="h-5 w-5 shrink-0 rounded bg-dark-border object-cover" />
            <span class="w-28 shrink-0 truncate text-sm text-dark-text sm:w-32">{{ p.teamName }}</span>
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

        <!-- Whose column is whose, with the fantasy crests — the same treatment the seat-by-seat
             grid on This Week uses, so the two comparison views read as one idea. -->
        <div class="mb-2 grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">
          <span class="flex min-w-0 items-center gap-1.5">
            <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onLogoErr" class="h-4 w-4 shrink-0 rounded bg-dark-border object-cover" />
            <span class="truncate">You</span>
          </span>
          <span class="flex min-w-0 items-center gap-1.5">
            <img v-if="teamLogos[comparePartner]" :src="teamLogos[comparePartner]" alt="" @error="onLogoErr" class="h-4 w-4 shrink-0 rounded bg-dark-border object-cover" />
            <span class="truncate">{{ comparePartnerName }}</span>
          </span>
        </div>

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
                <img v-if="b.headshot" :src="b.headshot" :alt="b.name" loading="lazy" @error="onLogoErr" class="h-5 w-5 shrink-0 rounded-full bg-dark-border object-cover" />
                <span v-else class="h-5 w-5 shrink-0 rounded-full bg-dark-border" />
                <img v-if="b.proTeam" :src="teamLogo(b.proTeam)" alt="" @error="onLogoErr" class="hidden h-3 w-3 shrink-0 object-contain sm:block" />
                <span class="min-w-0 flex-1 truncate" :class="b.starter ? 'text-dark-text' : 'text-dark-textMuted'">
                  {{ b.name }}
                </span>
                <span class="shrink-0 font-mono text-[9px]" :class="rankTone(b.posRank, row.position)">{{ row.position }}{{ b.posRank }}<span class="text-dark-textMuted/50">&middot;#{{ b.overallRank }}</span></span>
                <!-- The long-term rank beside this season's. Both sides of a dynasty trade
                     are argued in this currency, and it was the one number missing. -->
                <span v-if="dynasty.ready.value" class="shrink-0 font-mono text-[9px]"
                      :class="GAP_CLS[h2hGap(b, row.position)] ?? 'text-dark-textMuted/70'"
                      :title="dynRow(b.playerKey) ? `${row.position}${b.posRank} this season vs ${row.position}${dynRow(b.playerKey)!.positionRank} in the dynasty market` : 'Not priced by the dynasty market'">
                  {{ dynRow(b.playerKey) ? 'DYN ' + row.position + dynRow(b.playerKey)!.positionRank : 'DYN —' }}<template v-if="h2hGap(b, row.position)"> {{ h2hGap(b, row.position) === 'future' ? '▲' : '▼' }}</template>
                </span>
                <!-- Whether that age is early or late FOR HIS POSITION — the single fact a
                     dynasty trade turns on, and the one the board was withholding. -->
                <span v-if="dynasty.ready.value && dynRow(b.playerKey)?.age" class="shrink-0 font-mono text-[9px]"
                      :class="AGE_TONE[readAge(row.position, dynRow(b.playerKey)!.age)?.phase ?? 'prime']"
                      :title="readAge(row.position, dynRow(b.playerKey)!.age)?.detail ?? ''">
                  {{ Math.floor(dynRow(b.playerKey)!.age!) }}
                </span>
                <span class="w-10 shrink-0 text-right font-mono text-[10px]" :class="b.starter ? 'text-dark-text' : 'text-dark-textMuted/70'">
                  {{ b.value >= 0 ? '+' : '' }}{{ round(b.value) }}
                </span>
              </div>
            </div>
            <div class="rounded-lg bg-dark-bg/60 p-2">
              <div v-if="!row.theirs.length" class="font-mono text-[10px] text-dark-textMuted/60">nobody</div>
              <div v-for="b in row.theirs" :key="b.playerKey" class="flex items-center gap-1.5 py-0.5 text-[12px]">
                <img v-if="b.headshot" :src="b.headshot" :alt="b.name" loading="lazy" @error="onLogoErr" class="h-5 w-5 shrink-0 rounded-full bg-dark-border object-cover" />
                <span v-else class="h-5 w-5 shrink-0 rounded-full bg-dark-border" />
                <img v-if="b.proTeam" :src="teamLogo(b.proTeam)" alt="" @error="onLogoErr" class="hidden h-3 w-3 shrink-0 object-contain sm:block" />
                <span class="min-w-0 flex-1 truncate" :class="b.starter ? 'text-dark-text' : 'text-dark-textMuted'">
                  {{ b.name }}
                </span>
                <span class="shrink-0 font-mono text-[9px]" :class="rankTone(b.posRank, row.position)">{{ row.position }}{{ b.posRank }}<span class="text-dark-textMuted/50">&middot;#{{ b.overallRank }}</span></span>
                <!-- The long-term rank beside this season's. Both sides of a dynasty trade
                     are argued in this currency, and it was the one number missing. -->
                <span v-if="dynasty.ready.value" class="shrink-0 font-mono text-[9px]"
                      :class="GAP_CLS[h2hGap(b, row.position)] ?? 'text-dark-textMuted/70'"
                      :title="dynRow(b.playerKey) ? `${row.position}${b.posRank} this season vs ${row.position}${dynRow(b.playerKey)!.positionRank} in the dynasty market` : 'Not priced by the dynasty market'">
                  {{ dynRow(b.playerKey) ? 'DYN ' + row.position + dynRow(b.playerKey)!.positionRank : 'DYN —' }}<template v-if="h2hGap(b, row.position)"> {{ h2hGap(b, row.position) === 'future' ? '▲' : '▼' }}</template>
                </span>
                <!-- Whether that age is early or late FOR HIS POSITION — the single fact a
                     dynasty trade turns on, and the one the board was withholding. -->
                <span v-if="dynasty.ready.value && dynRow(b.playerKey)?.age" class="shrink-0 font-mono text-[9px]"
                      :class="AGE_TONE[readAge(row.position, dynRow(b.playerKey)!.age)?.phase ?? 'prime']"
                      :title="readAge(row.position, dynRow(b.playerKey)!.age)?.detail ?? ''">
                  {{ Math.floor(dynRow(b.playerKey)!.age!) }}
                </span>
                <span class="w-10 shrink-0 text-right font-mono text-[10px]" :class="b.starter ? 'text-dark-text' : 'text-dark-textMuted/70'">
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
    </template>
  </div>
</template>
