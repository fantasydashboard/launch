<template>
  <div class="recap-page">
      <!-- Header -->
      <div class="recap-header">
        <div class="recap-eyebrow">📨 Weekly Recap</div>
        <h1 class="recap-title">
          Week {{ selectedWeek }} <span class="recap-title-muted">·</span>
          <span class="recap-league">{{ leagueName }}</span>
        </h1>
        <p class="recap-sub">
          {{ sportConfig?.name || 'League' }} · {{ headlineDate }}
        </p>

        <!-- Week selector -->
        <div class="week-selector" v-if="availableWeeks.length > 0">
          <button
            class="week-btn"
            :disabled="selectedWeek <= 1"
            @click="selectedWeek = Math.max(1, selectedWeek - 1)"
          >‹ Prev</button>
          <select v-model.number="selectedWeek" class="week-select">
            <option v-for="w in availableWeeks" :key="w" :value="w">Week {{ w }}</option>
          </select>
          <button
            class="week-btn"
            :disabled="selectedWeek >= maxAvailableWeek"
            @click="selectedWeek = Math.min(maxAvailableWeek, selectedWeek + 1)"
          >Next ›</button>
        </div>
      </div>

      <!-- Loading -->
      <LoadingSpinner
        v-if="loading"
        size="lg"
        :message="`Building your Week ${selectedWeek} recap...`"
      />

      <!-- Empty: pre-season or week 1 with no completed games -->
      <div v-else-if="awards.length === 0 || allEmpty" class="empty-state">
        <div class="empty-icon">📭</div>
        <h2>No recap yet</h2>
        <p v-if="selectedWeek === 1">
          Week 1 hasn't completed yet. Check back after the games are over.
        </p>
        <p v-else>
          We couldn't find matchups for Week {{ selectedWeek }} of this league.
        </p>
      </div>

      <!-- Recap content -->
      <template v-else>
        <!-- Hero: Headline -->
        <div class="hero-card" v-if="topStory">
          <div class="hero-eyebrow">🏆 Top Story</div>
          <div class="hero-team">
            <img
              v-if="topStory.winner?.logo_url"
              :src="topStory.winner.logo_url"
              :alt="topStory.winner.team_name"
              class="hero-logo"
              @error="onLogoError"
            />
            <div v-else class="hero-logo hero-logo-fallback">🏈</div>
            <div class="hero-team-info">
              <div class="hero-team-name">{{ topStory.winner?.team_name }}</div>
              <div class="hero-team-stat">
                {{ topStory.winner?.value }}
                <span class="hero-stat-label">{{ heroStatLabel }}</span>
              </div>
            </div>
          </div>
          <div class="hero-headline">
            {{ heroHeadline }}
          </div>
        </div>

        <!-- Award grid -->
        <div class="award-grid">
          <div
            v-for="award in awardsToShow"
            :key="award.title"
            :class="['award-card', { 'award-shame': award.isShame }]"
          >
            <div class="award-title">{{ award.title }}</div>
            <div v-if="award.winner" class="award-body">
              <div class="award-row">
                <img
                  v-if="award.winner.logo_url"
                  :src="award.winner.logo_url"
                  :alt="award.winner.team_name"
                  class="award-logo"
                  @error="onLogoError"
                />
                <div v-else class="award-logo award-logo-fallback">🏈</div>
                <div class="award-team">{{ award.winner.team_name }}</div>
              </div>
              <div class="award-value" :class="{ 'value-shame': award.isShame }">
                {{ award.winner.value }}
              </div>
              <div class="award-details">{{ award.winner.details }}</div>
            </div>
            <div v-else class="award-empty">No data</div>
          </div>
        </div>

        <!-- Share strip -->
        <div class="share-strip">
          <button class="share-btn" @click="onShare">
            <span class="share-icon">📲</span> Share to League Chat
          </button>
          <p class="share-hint">
            Drop this in the group chat — nothing starts an argument faster.
          </p>
        </div>
      </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { getSportConfig, getLeagueType } from '@/config/sports'
import type {
  UnifiedMatchup,
  SportType,
  LeagueType,
} from '@/config/sports'
import { normalizeMatchups, type AdapterOptions } from '@/services/adapters'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { computeWeeklyAwards, computeCategoryWeeklyAwards, type Award } from '@/utils/weeklyAwards'
import { trackCardShare } from '@/services/shareTracking'

const route = useRoute()
const router = useRouter()
const leagueStore = useLeagueStore()

const loading = ref(false)
const matchups = ref<UnifiedMatchup[]>([])
const selectedWeek = ref(1)

const leagueId = computed(() => leagueStore.activeLeagueId)

const platform = computed((): 'sleeper' | 'yahoo' | 'espn' => {
  const id = leagueId.value || ''
  if (id.startsWith('espn_')) return 'espn'
  if (id.includes('.l.')) return 'yahoo'
  return 'sleeper'
})

const sport = computed((): SportType => {
  const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
  return (league?.sport as SportType) || 'football'
})

const leagueType = computed((): LeagueType => {
  const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
  return getLeagueType(league?.scoring_type)
})

const sportConfig = computed(() => getSportConfig(sport.value))

const isPointsLeague = computed(() => leagueType.value === 'points')
const isCategoryLeague = computed(() => leagueType.value === 'categories' || leagueType.value === 'roto')

const leagueName = computed(() => {
  const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
  return league?.name || leagueStore.currentLeague?.name || 'Your League'
})

const adapterOptions = computed((): AdapterOptions => ({
  sport: sport.value,
  platform: platform.value,
  leagueType: leagueType.value,
}))

const currentWeek = computed(() => leagueStore.currentLeague?.settings?.leg || 1)

const maxAvailableWeek = computed(() => {
  // Last *completed* week is currentWeek - 1, but we also allow viewing the
  // current week (in case games are done but the league hasn't advanced yet).
  return Math.max(1, currentWeek.value)
})

const availableWeeks = computed(() => {
  const weeks: number[] = []
  for (let i = 1; i <= maxAvailableWeek.value; i++) weeks.push(i)
  return weeks
})

const headlineDate = computed(() => {
  const d = new Date()
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
})

// Map UnifiedMatchup[] → the shape each helper expects, then call the
// matching helper. Points and category leagues have different units of
// competition (score vs. categories won).
const awards = computed<Award[]>(() => {
  if (isCategoryLeague.value) {
    const cat = matchups.value.map(m => ({
      team1: {
        name: m.team1.name,
        logo_url: m.team1.avatar || '',
        categoriesWon: m.team1Wins || 0,
      },
      team2: {
        name: m.team2.name,
        logo_url: m.team2.avatar || '',
        categoriesWon: m.team2Wins || 0,
      },
      ties: m.ties || 0,
    }))
    return computeCategoryWeeklyAwards(cat)
  }

  const pts = matchups.value.map(m => ({
    teams: [
      { name: m.team1.name, points: m.team1Score || 0, logo_url: m.team1.avatar || '' },
      { name: m.team2.name, points: m.team2Score || 0, logo_url: m.team2.avatar || '' },
    ],
  }))
  return computeWeeklyAwards(pts)
})

const allEmpty = computed(() => awards.value.every(a => !a.winner))

const heroAwardTitle = computed(() => isCategoryLeague.value ? 'Most Dominant Win' : 'Week High Score')

const topStory = computed<Award | null>(() => {
  return awards.value.find(a => a.title === heroAwardTitle.value && a.winner) || null
})

const awardsToShow = computed(() => awards.value.filter(a => a.title !== heroAwardTitle.value))

const heroHeadline = computed(() => {
  if (!topStory.value) return ''
  return isCategoryLeague.value
    ? `posted the most dominant win of Week ${selectedWeek.value}`
    : `posted the highest score of Week ${selectedWeek.value}`
})

const heroStatLabel = computed(() => isCategoryLeague.value ? 'cats' : 'points')

function fetchRawData(): any {
  switch (platform.value) {
    case 'sleeper':
      return {
        matchups: leagueStore.leagueMatchups || [],
        rosters: leagueStore.leagueRosters || [],
        users: leagueStore.leagueUsers || {},
        leagueUsers: leagueStore.leagueUsersArray || [],
      }
    case 'yahoo':
      return {
        matchups: leagueStore.yahooMatchups || [],
        teams: leagueStore.yahooStandings || [],
      }
    case 'espn':
      return {
        schedule: leagueStore.espnSchedule || [],
        teams: leagueStore.espnTeams || [],
        members: leagueStore.espnMembers || [],
      }
    default:
      return null
  }
}

function loadWeek() {
  if (!leagueId.value) return
  loading.value = true
  try {
    const raw = fetchRawData()
    if (!raw) {
      matchups.value = []
      return
    }
    matchups.value = normalizeMatchups(raw, adapterOptions.value, selectedWeek.value)
  } catch (e) {
    console.error('[WeeklyRecapView] load error', e)
    matchups.value = []
  } finally {
    loading.value = false
  }
}

function onLogoError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function onShare() {
  trackCardShare({ dashboard_type: 'weekly_recap' })
  // v0: copy a shareable URL. Image-render comes later.
  const url = `${window.location.origin}/recap?week=${selectedWeek.value}`
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).catch(() => {})
  }
}

onMounted(() => {
  // Pick week from query, or default to last completed
  const qWeek = parseInt(String(route.query.week || ''), 10)
  if (qWeek && qWeek >= 1) {
    selectedWeek.value = Math.min(qWeek, maxAvailableWeek.value)
  } else {
    selectedWeek.value = Math.max(1, currentWeek.value - 1)
  }
  loadWeek()
})

watch(selectedWeek, w => {
  if (String(route.query.week || '') !== String(w)) {
    router.replace({ query: { ...route.query, week: String(w) } })
  }
  loadWeek()
})

watch(leagueId, () => loadWeek())
</script>

<style scoped>
.recap-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px 16px 64px;
  color: #e5e7eb;
}

/* Header */
.recap-header {
  margin-bottom: 28px;
}
.recap-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #22c55e;
  margin-bottom: 8px;
}
.recap-title {
  font-size: clamp(28px, 5vw, 42px);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin: 0;
  color: #fff;
}
.recap-title-muted {
  color: #4b5563;
  font-weight: 700;
}
.recap-league {
  color: #fbbf24;
}
.recap-sub {
  font-size: 13px;
  color: #9ca3af;
  margin: 8px 0 16px;
}
.week-selector {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #11131a;
  border: 1px solid #1e2130;
  border-radius: 10px;
  padding: 4px;
}
.week-btn {
  background: transparent;
  border: none;
  color: #d1d5db;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.week-btn:hover:not(:disabled) {
  background: #1e2130;
  color: #fff;
}
.week-btn:disabled {
  color: #4b5563;
  cursor: not-allowed;
}
.week-select {
  background: #0a0c14;
  border: 1px solid #1e2130;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
}

/* Hero */
.hero-card {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.10), rgba(34, 197, 94, 0.02));
  border: 1px solid rgba(34, 197, 94, 0.35);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 18px;
}
.hero-eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: #22c55e;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.hero-team {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
}
.hero-logo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid rgba(34, 197, 94, 0.5);
  object-fit: cover;
  flex-shrink: 0;
  background: #11131a;
}
.hero-logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
.hero-team-info {
  display: flex;
  flex-direction: column;
}
.hero-team-name {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
}
.hero-team-stat {
  font-size: 32px;
  font-weight: 900;
  color: #22c55e;
  line-height: 1;
  margin-top: 4px;
}
.hero-stat-label {
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  margin-left: 4px;
}
.hero-headline {
  font-size: 14px;
  color: #d1d5db;
  font-style: italic;
}

/* Award grid */
.award-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.award-card {
  background: #11131a;
  border: 1px solid #1e2130;
  border-radius: 12px;
  padding: 18px;
}
.award-card.award-shame {
  border-color: rgba(239, 68, 68, 0.25);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), #11131a);
}
.award-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fbbf24;
  margin-bottom: 12px;
}
.award-card.award-shame .award-title {
  color: #f87171;
}
.award-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.award-logo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  background: #0a0c14;
  border: 1px solid #1e2130;
}
.award-logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.award-team {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}
.award-value {
  font-size: 28px;
  font-weight: 900;
  color: #22c55e;
  line-height: 1;
  margin: 6px 0 4px;
}
.award-value.value-shame {
  color: #ef4444;
}
.award-details {
  font-size: 12px;
  color: #9ca3af;
}
.award-empty {
  font-size: 13px;
  color: #4b5563;
  font-style: italic;
}

/* Share */
.share-strip {
  background: #11131a;
  border: 1px solid #1e2130;
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.share-btn {
  background: #22c55e;
  color: #0a0c14;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.share-btn:hover {
  background: #16a34a;
}
.share-icon { font-size: 16px; }
.share-hint {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
  margin: 0;
  flex: 1;
  min-width: 200px;
}

/* Empty */
.empty-state {
  text-align: center;
  padding: 64px 16px;
  color: #6b7280;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-state h2 {
  font-size: 18px;
  color: #d1d5db;
  margin: 0 0 8px;
}
</style>
