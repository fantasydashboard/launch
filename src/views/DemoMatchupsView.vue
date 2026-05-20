<template>
  <div class="mlist">
    <!-- ─────────────────────────────────────────────────────────────
         1. PAGE HEADER
         Eyebrow + headline + sub + inline status strip (NOT a tile grid).
    ────────────────────────────────────────────────────────────── -->
    <header class="page-head">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          Week {{ currentWeek }}
        </p>
        <h1 class="page-headline">Sunday is happening.</h1>
        <p class="page-sub">Live scores. Live probabilities. Live drama.</p>
      </div>
      <ul class="page-status" role="list" aria-label="Status overview">
        <li class="page-status-item">
          <span class="page-status-dot page-status-dot-live" aria-hidden="true"></span>
          <span class="page-status-num">{{ liveCount }}</span>
          <span class="page-status-label">live</span>
        </li>
        <li class="page-status-sep" aria-hidden="true"></li>
        <li class="page-status-item">
          <span class="page-status-num">{{ finalCount }}</span>
          <span class="page-status-label">final</span>
        </li>
        <li class="page-status-sep" aria-hidden="true"></li>
        <li class="page-status-item">
          <span class="page-status-num">{{ upcomingCount }}</span>
          <span class="page-status-label">upcoming</span>
        </li>
      </ul>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         2. MATCHUP OF THE WEEK — elevated hero treatment
    ────────────────────────────────────────────────────────────── -->
    <section
      v-if="heroMatchup"
      class="hero"
      :aria-labelledby="`hero-title-${heroMatchup.id}`"
    >
      <span class="hero-glow" aria-hidden="true"></span>

      <div class="hero-bar">
        <span class="hero-pill">Matchup of the Week</span>
        <span v-if="heroMatchup.status === 'live'" class="hero-live">
          <span class="hero-live-dot" aria-hidden="true"></span>
          Live
        </span>
        <span v-else-if="heroMatchup.status === 'final'" class="hero-final">Final</span>
        <span v-else class="hero-upcoming">Upcoming</span>
      </div>

      <div class="hero-faceoff">
        <!-- HOME -->
        <article class="hero-team hero-team-home">
          <div
            class="hero-avatar"
            :style="{ background: `linear-gradient(135deg, ${heroHomeTeam.avatarColor})` }"
          >
            <img v-if="heroHomeTeam.avatarUrl" :src="heroHomeTeam.avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ heroHomeTeam.ownerInitials }}</span>
          </div>
          <h2 :id="`hero-title-${heroMatchup.id}`" class="hero-team-name">{{ heroHomeTeam.name }}</h2>
          <p class="hero-team-meta">{{ heroHomeStanding.wins }}-{{ heroHomeStanding.losses }} · {{ heroHomeTeam.ownerName }}</p>
          <p class="hero-score" :style="{ color: heroHomeAccent }">{{ heroMatchup.homeScore.toFixed(1) }}</p>
          <p class="hero-score-proj">proj {{ heroMatchup.homeProjected.toFixed(1) }}</p>
        </article>

        <!-- CENTER -->
        <div class="hero-center">
          <p class="hero-wp" :style="{ color: heroHomeAccent }">{{ heroHomePct }}%</p>
          <p class="hero-wp-label">win prob</p>
          <span class="hero-vs" aria-hidden="true">vs</span>
          <p class="hero-wp" :style="{ color: heroAwayAccent }">{{ heroAwayPct }}%</p>
          <p class="hero-wp-meta">{{ heroMethodology }}</p>
        </div>

        <!-- AWAY -->
        <article class="hero-team hero-team-away">
          <div
            class="hero-avatar"
            :style="{ background: `linear-gradient(135deg, ${heroAwayTeam.avatarColor})` }"
          >
            <img v-if="heroAwayTeam.avatarUrl" :src="heroAwayTeam.avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ heroAwayTeam.ownerInitials }}</span>
          </div>
          <h2 class="hero-team-name">{{ heroAwayTeam.name }}</h2>
          <p class="hero-team-meta">{{ heroAwayStanding.wins }}-{{ heroAwayStanding.losses }} · {{ heroAwayTeam.ownerName }}</p>
          <p class="hero-score" :style="{ color: heroAwayAccent }">{{ heroMatchup.awayScore.toFixed(1) }}</p>
          <p class="hero-score-proj">proj {{ heroMatchup.awayProjected.toFixed(1) }}</p>
        </article>
      </div>

      <!-- Mini win-prob chart across the week, with NOW line -->
      <div class="hero-chart-wrap">
        <svg
          class="hero-chart"
          :viewBox="`0 0 ${HERO_W} ${HERO_H}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`${heroHomeTeam.name} win probability across the week.`"
        >
          <line
            class="hero-chart-mid"
            x1="0" :y1="heroChartY(50)" :x2="HERO_W" :y2="heroChartY(50)"
          />
          <path
            class="hero-chart-line"
            :d="heroChartPath(heroSeries)"
            :stroke="heroHomeAccent"
          />
          <path
            class="hero-chart-line"
            :d="heroChartPath(heroAwaySeries)"
            :stroke="heroAwayAccent"
          />
          <g v-if="heroNowX !== null" class="hero-chart-now">
            <line :x1="heroNowX" y1="6" :x2="heroNowX" :y2="HERO_H - 4" />
          </g>
        </svg>
        <ul class="hero-chart-days" aria-hidden="true">
          <li v-for="(d, i) in DAY_LABELS" :key="d" :class="{ 'hero-chart-day-now': i === heroCurrentDayIndex }">{{ d }}</li>
        </ul>
      </div>

      <div class="hero-foot">
        <button
          type="button"
          class="hero-cta"
          @click="openDetail(heroMatchup.id, $event)"
        >
          View full matchup
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         3. OTHER MATCHUPS — vertical feed (NOT a 3-col grid)
    ────────────────────────────────────────────────────────────── -->
    <section class="feed" aria-labelledby="feed-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="feed-heading">The rest of Sunday</p>
        <h2 class="feed-headline">Four more games. Three storylines.</h2>
      </header>

      <ul class="feed-list" role="list">
        <li
          v-for="m in feedMatchups"
          :key="m.id"
        >
          <article
            class="feed-card"
            :class="[
              `feed-card-${m.status}`,
            ]"
            :style="{
              background: feedCardBg(m),
              borderColor: feedCardBorder(m),
            }"
            tabindex="0"
            role="button"
            :aria-label="`Open ${homeOf(m).name} vs ${awayOf(m).name}`"
            @click="openDetail(m.id, $event)"
            @keydown.enter.prevent="openDetail(m.id, $event)"
            @keydown.space.prevent="openDetail(m.id, $event)"
          >
            <span class="feed-card-edge" :class="`feed-card-edge-${m.status}`" aria-hidden="true"></span>

            <!-- HOME -->
            <div class="feed-team feed-team-home">
              <div
                class="feed-avatar"
                :style="{ background: `linear-gradient(135deg, ${homeOf(m).avatarColor})` }"
              >
                <img v-if="homeOf(m).avatarUrl" :src="homeOf(m).avatarUrl" class="avatar-img" alt="" />
                <span v-else>{{ homeOf(m).ownerInitials }}</span>
              </div>
              <div class="feed-team-text">
                <p class="feed-team-name">{{ homeOf(m).name }}</p>
                <p class="feed-team-meta">{{ standingOf(m.homeTeamId).wins }}-{{ standingOf(m.homeTeamId).losses }}</p>
              </div>
              <p class="feed-score" :class="{ 'feed-score-dim': m.status === 'upcoming' }">
                {{ m.status === 'upcoming' ? m.homeProjected.toFixed(1) : m.homeScore.toFixed(1) }}
              </p>
            </div>

            <!-- CENTER -->
            <div class="feed-center">
              <span
                v-if="m.status === 'live'"
                class="feed-status feed-status-live"
              >
                <span class="feed-status-dot" aria-hidden="true"></span>
                Live
              </span>
              <span
                v-else-if="m.status === 'final'"
                class="feed-status feed-status-final"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Final
              </span>
              <span v-else class="feed-status feed-status-upcoming">Upcoming</span>

              <span class="feed-vs" aria-hidden="true">vs</span>

              <span class="feed-wp">
                <span class="feed-wp-pct" :style="{ color: feedAccentHome(m) }">{{ clampWP(m.winProb) }}%</span>
                <span class="feed-wp-pct-sep" aria-hidden="true">·</span>
                <span class="feed-wp-pct" :style="{ color: feedAccentAway(m) }">{{ 100 - clampWP(m.winProb) }}%</span>
              </span>
            </div>

            <!-- AWAY -->
            <div class="feed-team feed-team-away">
              <p class="feed-score" :class="{ 'feed-score-dim': m.status === 'upcoming' }">
                {{ m.status === 'upcoming' ? m.awayProjected.toFixed(1) : m.awayScore.toFixed(1) }}
              </p>
              <div class="feed-team-text feed-team-text-right">
                <p class="feed-team-name">{{ awayOf(m).name }}</p>
                <p class="feed-team-meta">{{ standingOf(m.awayTeamId).wins }}-{{ standingOf(m.awayTeamId).losses }}</p>
              </div>
              <div
                class="feed-avatar"
                :style="{ background: `linear-gradient(135deg, ${awayOf(m).avatarColor})` }"
              >
                <img v-if="awayOf(m).avatarUrl" :src="awayOf(m).avatarUrl" class="avatar-img" alt="" />
                <span v-else>{{ awayOf(m).ownerInitials }}</span>
              </div>
            </div>

            <!-- SHARE (presentational) -->
            <button
              type="button"
              class="feed-share"
              :aria-label="`Share ${homeOf(m).name} vs ${awayOf(m).name}`"
              @click.stop="$emit('open-signup')"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
          </article>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4. FOOTER PILLS — quick reads
    ────────────────────────────────────────────────────────────── -->
    <section class="quick" aria-labelledby="quick-heading">
      <h2 class="section-eyebrow section-eyebrow-mute" id="quick-heading">The board</h2>
      <ul class="pills" role="list">
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-tertiary" aria-hidden="true"></span>
          <span class="pill-label">Highest score today</span>
          <span class="pill-value">Built Different · 72.3 in progress</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-secondary" aria-hidden="true"></span>
          <span class="pill-label">Biggest swing this week</span>
          <span class="pill-value">Reign Delay went from 62% to 18%</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-primary" aria-hidden="true"></span>
          <span class="pill-label">Closest matchup</span>
          <span class="pill-value">Throne Vacant vs Almost Famous · 6.6 point margin</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-mute" aria-hidden="true"></span>
          <span class="pill-label">Upset alert</span>
          <span class="pill-value">Almost Famous projected to take #2</span>
        </li>
      </ul>
    </section>

    <!-- Modal -->
    <MatchupDetailModal
      v-if="detailMatchupId"
      :matchup-id="detailMatchupId"
      @close="closeDetail"
      @open-signup="$emit('open-signup')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  currentWeek,
  getTeam,
  matchupsWeek11,
  matchupOfTheWeekId,
  dailyWinProb,
  standings2025Week11,
  type Matchup,
} from '@/fixtures/pillarsLeague'
import MatchupDetailModal from '@/components/demo/MatchupDetailModal.vue'
import { accentFor } from '@/utils/teamColor'
import { smoothPath, type Point } from '@/utils/svgPath'

defineEmits<{ (e: 'open-signup'): void }>()

/* ─── Modal state ───────────────────────────────────────────── */
const detailMatchupId = ref<string | null>(null)
const lastClickedRef = ref<HTMLElement | null>(null)

function openDetail(id: string, ev: Event) {
  detailMatchupId.value = id
  const target = ev.currentTarget as HTMLElement | null
  if (target) lastClickedRef.value = target
}
function closeDetail() {
  detailMatchupId.value = null
  lastClickedRef.value?.focus?.()
}

/* ─── Status counts ─────────────────────────────────────────── */
const liveCount     = computed(() => matchupsWeek11.filter((m) => m.status === 'live').length)
const finalCount    = computed(() => matchupsWeek11.filter((m) => m.status === 'final').length)
const upcomingCount = computed(() => matchupsWeek11.filter((m) => m.status === 'upcoming').length)

/* ─── Hero matchup ──────────────────────────────────────────── */
const heroMatchup = computed(() => matchupsWeek11.find((m) => m.id === matchupOfTheWeekId)!)
const heroHomeTeam = computed(() => getTeam(heroMatchup.value.homeTeamId))
const heroAwayTeam = computed(() => getTeam(heroMatchup.value.awayTeamId))
const heroHomeStanding = computed(() => standings2025Week11.find((s) => s.teamId === heroMatchup.value.homeTeamId)!)
const heroAwayStanding = computed(() => standings2025Week11.find((s) => s.teamId === heroMatchup.value.awayTeamId)!)
const heroHomeAccent = computed(() => accentFor(heroHomeTeam.value))
const heroAwayAccent = computed(() => accentFor(heroAwayTeam.value))
const heroHomePct = computed(() => clampWP(heroMatchup.value.winProb))
const heroAwayPct = computed(() => 100 - heroHomePct.value)
const heroSeriesData = computed(() => dailyWinProb.find((d) => d.matchupId === heroMatchup.value.id))
const heroSeries = computed(() => (heroSeriesData.value?.homeProbByDay ?? []).map(clampWP))
const heroAwaySeries = computed(() => heroSeries.value.map((v) => 100 - v))
const heroCurrentDayIndex = computed(() => heroSeriesData.value?.currentDayIndex)
const heroMethodology = computed(() => {
  const note = heroSeriesData.value?.methodologyNote ?? ''
  // condense to compact form: "5,000 sims · 14m ago"
  if (note.includes('updated')) {
    const m = note.match(/updated (\d+) minutes/)
    if (m) return `5,000 sims · ${m[1]}m ago`
  }
  if (note.includes('locked at final')) return '5,000 sims · locked'
  if (note.includes('pre-game'))        return '5,000 sims · pre-game'
  return '5,000 sims'
})

/* ─── Feed matchups (everything except the hero) ─────────────── */
const feedMatchups = computed(() =>
  matchupsWeek11.filter((m) => m.id !== matchupOfTheWeekId)
)

function homeOf(m: Matchup) { return getTeam(m.homeTeamId) }
function awayOf(m: Matchup) { return getTeam(m.awayTeamId) }
function standingOf(teamId: string) {
  return standings2025Week11.find((s) => s.teamId === teamId)!
}
function feedAccentHome(m: Matchup) { return accentFor(homeOf(m)) }
function feedAccentAway(m: Matchup) { return accentFor(awayOf(m)) }
function feedCardBg(m: Matchup) {
  const stop = accentFor(homeOf(m))
  return `linear-gradient(135deg, ${tintFrom(stop, 0.045)}, oklch(0.10 0.015 90 / 0.4))`
}
function feedCardBorder(m: Matchup) {
  return tintFrom(accentFor(homeOf(m)), 0.20)
}

/* ─── Helpers ───────────────────────────────────────────────── */
function clampWP(v: number) {
  return Math.max(1, Math.min(99, Math.round(v)))
}
function tintFrom(oklch: string, alpha: number) {
  const inner = oklch.replace(/^oklch\(/, '').replace(/\)$/, '').trim()
  return `oklch(${inner} / ${alpha})`
}

/* ─── Hero mini chart geometry ──────────────────────────────── */
const HERO_W = 600
const HERO_H = 80
const HERO_X_LEFT = 12
const HERO_X_RIGHT = 12
const HERO_Y_TOP = 6
const HERO_Y_BOTTOM = 6
const N_DAYS = 7
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function heroChartX(i: number) {
  const usable = HERO_W - HERO_X_LEFT - HERO_X_RIGHT
  return HERO_X_LEFT + (i / (N_DAYS - 1)) * usable
}
function heroChartY(p: number) {
  const usable = HERO_H - HERO_Y_TOP - HERO_Y_BOTTOM
  return HERO_Y_TOP + ((100 - p) / 100) * usable
}
function heroChartPath(values: number[]) {
  const pts: Point[] = values.map((v, i) => ({ x: heroChartX(i), y: heroChartY(v) }))
  return smoothPath(pts)
}
const heroNowX = computed(() => {
  const idx = heroCurrentDayIndex.value
  if (idx === undefined) return null
  return heroChartX(idx)
})
</script>

<style scoped>
/* Most tokens inherited from .demo-shell. Scoped overrides for matchups context. */
.mlist {
  --ink-4: oklch(0.40 0.012 90);   /* slightly lighter for feed card secondary text */
  --accent-down: oklch(0.74 0.22 25);  /* hotter red for matchup losing-team treatment */

  display: flex;
  flex-direction: column;
  gap: 40px;
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
}

.avatar-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}

/* ─── PAGE HEAD ─────────────────────────────────────────────── */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.page-head-copy { min-width: 0; max-width: 640px; }
.page-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
}
.page-eyebrow-bar {
  width: 22px; height: 2px;
  background: var(--accent-secondary);
  display: inline-block;
}
.page-headline {
  margin: 0 0 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.9rem, 4.4vw, 2.4rem);
  line-height: 1.02;
  letter-spacing: -0.018em;
  color: var(--ink-1);
}
.page-sub {
  margin: 0;
  font-size: 1rem;
  color: var(--ink-2);
  line-height: 1.4;
}
.page-status {
  list-style: none;
  margin: 0; padding: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.page-status-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.page-status-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.008em;
  color: var(--ink-1);
}
.page-status-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.page-status-sep {
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--ink-5);
  display: inline-block;
}
.page-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  display: inline-block;
}
.page-status-dot-live { background: var(--accent-up); }
@media (prefers-reduced-motion: no-preference) {
  @keyframes mlist-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.5); }
  }
  .page-status-dot-live { animation: mlist-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}

/* ─── SECTION HEAD shared ──────────────────────────────────── */
.section-head { margin-bottom: 14px; }
.section-eyebrow {
  margin: 0 0 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.section-eyebrow-teal { color: var(--accent-tertiary); }
.section-eyebrow-mute { color: var(--ink-3); }
.feed-headline {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  line-height: 1.05;
  letter-spacing: -0.008em;
  color: var(--ink-1);
}

/* ─── HERO ─────────────────────────────────────────────────── */
.hero {
  position: relative;
  padding: 22px 24px 18px;
  border: 1px solid oklch(0.70 0.27 350 / 0.30);
  border-radius: 20px;
  background:
    linear-gradient(155deg,
      oklch(0.70 0.27 350 / 0.08),
      oklch(0.10 0.015 90 / 0.4) 60%
    ),
    oklch(0.11 0.015 90);
  overflow: hidden;
}
.hero-glow {
  position: absolute;
  inset: -30% -10% auto -10%;
  height: 180px;
  background: radial-gradient(ellipse 60% 80% at 50% 0%, oklch(0.70 0.27 350 / 0.18), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.hero-bar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.hero-pill {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.70rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  background: oklch(0.70 0.27 350 / 0.12);
  border: 1px solid oklch(0.70 0.27 350 / 0.34);
  padding: 5px 11px;
  border-radius: 999px;
}
.hero-live {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-down);
  padding: 4px 10px;
  border-radius: 999px;
  background: oklch(0.74 0.22 25 / 0.10);
  border: 1px solid oklch(0.74 0.22 25 / 0.35);
}
.hero-live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-down);
}
@media (prefers-reduced-motion: no-preference) {
  .hero-live-dot { animation: mlist-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.hero-final {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-up);
  padding: 4px 10px;
  border-radius: 999px;
  background: oklch(0.74 0.18 145 / 0.10);
  border: 1px solid oklch(0.74 0.18 145 / 0.35);
}
.hero-upcoming {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  padding: 4px 10px;
  border-radius: 999px;
  background: oklch(0.16 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
}

.hero-faceoff {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
}
.hero-team {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.hero-team-home { align-items: flex-start; }
.hero-team-away { align-items: flex-end; text-align: right; }
.hero-avatar {
  width: 80px; height: 80px;
  border-radius: 18px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 12px 30px -12px oklch(0 0 0 / 0.7);
  margin-bottom: 10px;
}
.hero-team-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.25rem;
  line-height: 1.05;
  letter-spacing: -0.006em;
  color: var(--ink-1);
}
.hero-team-meta {
  margin: 3px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.hero-score {
  margin: 8px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 6vw, 3.5rem);
  line-height: 0.95;
  letter-spacing: -0.018em;
  font-variant-numeric: tabular-nums;
}
.hero-score-proj {
  margin: 2px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-4);
  font-variant-numeric: tabular-nums;
}

.hero-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 0 6px;
}
.hero-wp {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.5rem, 4vw, 2.4rem);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.012em;
}
.hero-wp-label {
  margin: 2px 0 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.hero-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin: 4px 0;
}
.hero-wp-meta {
  margin: 6px 0 0;
  font-size: 0.66rem;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* mini hero chart */
.hero-chart-wrap {
  position: relative;
  z-index: 1;
  margin: 16px 0 0;
  padding-top: 14px;
  border-top: 1px solid oklch(0.18 0.018 90);
}
.hero-chart {
  width: 100%;
  height: 80px;
  display: block;
}
.hero-chart-mid {
  stroke: oklch(0.20 0.015 90);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.hero-chart-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.hero-chart-now line {
  stroke: var(--accent-secondary);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}
.hero-chart-days {
  display: flex;
  justify-content: space-between;
  margin: 4px 12px 0;
  padding: 0;
  list-style: none;
}
.hero-chart-days li {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.hero-chart-day-now { color: var(--accent-secondary); }

.hero-foot {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
.hero-cta {
  display: inline-flex; align-items: center; gap: 6px;
  background: oklch(0.78 0.18 92);
  color: oklch(0.10 0.012 90);
  border: none;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.84rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
              background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .hero-cta:hover { transform: translateY(-1px); }
}
.hero-cta:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.hero-cta:focus-visible {
  outline: 2px solid oklch(0.97 0.005 90);
  outline-offset: 2px;
}

/* ─── FEED ─────────────────────────────────────────────────── */
.feed-list {
  list-style: none;
  margin: 0; padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feed-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) 32px;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
@media (prefers-reduced-motion: no-preference) {
  .feed-card:hover { transform: translateY(-1px); }
}
.feed-card:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.feed-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.feed-card-upcoming { opacity: 0.86; }
.feed-card-edge {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
}
.feed-card-edge-live  { background: var(--accent-down); }
.feed-card-edge-final { background: var(--accent-up); }
.feed-card-edge-upcoming { background: oklch(0.30 0.015 90); }

.feed-team {
  display: flex; align-items: center; gap: 12px; min-width: 0;
}
.feed-team-home { justify-content: flex-start; }
.feed-team-away { justify-content: flex-end; }
.feed-avatar {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 6px 16px -8px oklch(0 0 0 / 0.55);
}
.feed-team-text { min-width: 0; }
.feed-team-text-right { text-align: right; }
.feed-team-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  line-height: 1.1;
  letter-spacing: -0.004em;
  color: var(--ink-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feed-team-meta {
  margin: 2px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.feed-score {
  margin: 0 0 0 auto;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.feed-team-away .feed-score { margin: 0 auto 0 0; }
.feed-score-dim {
  color: var(--ink-4);
  font-weight: 700;
}

.feed-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.feed-status {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}
.feed-status-live {
  color: var(--accent-down);
  background: oklch(0.74 0.22 25 / 0.10);
  border-color: oklch(0.74 0.22 25 / 0.35);
}
.feed-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--accent-down);
}
@media (prefers-reduced-motion: no-preference) {
  .feed-status-dot { animation: mlist-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.feed-status-final {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border-color: oklch(0.74 0.18 145 / 0.35);
}
.feed-status-upcoming {
  color: var(--ink-3);
  background: oklch(0.16 0.015 90);
  border-color: oklch(0.22 0.015 90);
}
.feed-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.feed-wp {
  display: inline-flex; align-items: baseline; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.92rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}
.feed-wp-pct-sep {
  color: var(--ink-5);
  font-weight: 600;
}

.feed-share {
  width: 28px; height: 28px;
  display: grid; place-items: center;
  background: transparent;
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 8px;
  color: var(--ink-3);
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1),
              border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.feed-share:hover { color: var(--ink-1); border-color: oklch(0.36 0.015 90); }
.feed-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.feed-share:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* ─── PILLS / FOOTER ───────────────────────────────────────── */
.quick {}
.pills {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex; flex-wrap: wrap;
  gap: 8px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
}
.pill-dot {
  width: 6px; height: 6px; border-radius: 50%;
  display: inline-block;
}
.pill-dot-primary   { background: var(--accent-primary); }
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-tertiary  { background: var(--accent-tertiary); }
.pill-dot-mute      { background: var(--ink-4); }
.pill-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.pill-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}

/* ─── MOBILE ───────────────────────────────────────────────── */
@media (max-width: 720px) {
  .hero { padding: 18px 16px 14px; border-radius: 16px; }
  .hero-faceoff { grid-template-columns: 1fr; gap: 14px; }
  .hero-team-home, .hero-team-away { align-items: flex-start; text-align: left; }
  .hero-team-away { align-items: flex-start; text-align: left; }
  .hero-center { flex-direction: row; flex-wrap: wrap; justify-content: flex-start; gap: 8px; padding: 6px 0; border-top: 1px solid oklch(0.18 0.018 90); border-bottom: 1px solid oklch(0.18 0.018 90); }
  .hero-wp-label, .hero-wp-meta { width: 100%; text-align: left; }
  .hero-vs { display: none; }
  .feed-card {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 8px 12px;
    padding: 12px 14px;
  }
  .feed-share { grid-row: 2; grid-column: 1 / -1; justify-self: end; }
  .feed-avatar { width: 38px; height: 38px; border-radius: 10px; }
  .feed-score { font-size: 1.15rem; }
  .feed-team-name { font-size: 0.92rem; }
  .feed-center { gap: 3px; }
}
</style>
