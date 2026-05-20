<template>
  <div class="rankings">
    <!-- ─────────────────────────────────────────────────────────────
         1. PAGE HEADER
         Eyebrow + headline + sub + inline context strip (NOT a tile grid).
    ────────────────────────────────────────────────────────────── -->
    <header class="page-head">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          Week {{ currentWeek }}
        </p>
        <h1 class="page-headline">Power Rankings</h1>
        <p class="page-sub">Who's hot. Who's cooked. Who's about to be.</p>
      </div>
      <ul class="page-context" role="list" aria-label="At a glance">
        <li class="page-context-stat">
          <span class="page-context-num">{{ currentWeek }}</span>
          <span class="page-context-label">weeks done</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num">{{ topFourGap }}</span>
          <span class="page-context-label">games separate top 4</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num page-context-num-accent">+{{ biggestClimber.trend }}</span>
          <span class="page-context-label">biggest jump</span>
        </li>
      </ul>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         2. HERO — Biggest Mover (the editorial moment)
         Mascot huge on left, declarative sentence + stats + share on right.
         NO bordered card chrome. Subtle radial glow only.
    ────────────────────────────────────────────────────────────── -->
    <section class="hero" :aria-labelledby="`hero-headline-${biggestClimberTeam.id}`">
      <div class="hero-portrait">
        <span class="hero-portrait-glow" aria-hidden="true"></span>
        <div
          class="hero-portrait-frame"
          :style="{ background: `linear-gradient(155deg, ${biggestClimberTeam.avatarColor})` }"
        >
          <img
            v-if="biggestClimberTeam.avatarUrl"
            :src="biggestClimberTeam.avatarUrl"
            class="hero-portrait-image avatar-image"
            alt=""
          />
          <span v-else class="hero-portrait-initials">{{ biggestClimberTeam.ownerInitials }}</span>
          <span class="hero-portrait-sheen" aria-hidden="true"></span>
        </div>
      </div>

      <div class="hero-copy">
        <p class="hero-eyebrow">
          <span class="hero-eyebrow-bar" aria-hidden="true"></span>
          Biggest mover of the week
        </p>
        <h2 class="hero-headline" :id="`hero-headline-${biggestClimberTeam.id}`">
          {{ biggestClimberTeam.name }} just took the throne.
        </h2>
        <p class="hero-body">
          Three straight wins. {{ heroPointsPerGame }} points per game. The conversation just changed.
        </p>

        <ul class="hero-stats" role="list">
          <li class="hero-stat hero-stat-primary">
            <span class="hero-stat-num">+{{ biggestClimber.trend }}</span>
            <span class="hero-stat-label">spots</span>
          </li>
          <li class="hero-stat hero-stat-tertiary">
            <span class="hero-stat-num">{{ biggestClimber.streak }}</span>
            <span class="hero-stat-label">streak</span>
          </li>
          <li class="hero-stat hero-stat-leader">
            <span class="hero-stat-num">{{ heroPointsPerGame }}</span>
            <span class="hero-stat-label">pts / wk</span>
          </li>
        </ul>

        <div class="hero-actions">
          <button
            type="button"
            class="hero-share"
            :aria-label="`Share the ${biggestClimberTeam.name} climb card`"
            @click="$emit('open-signup')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share this card
          </button>
          <span class="hero-actions-meta">From #{{ heroFromRank }} to #{{ biggestClimber.rank }} in eleven weeks</span>
        </div>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         3. SEASON TRAJECTORY — bump chart with team LOGOS at endpoints
    ────────────────────────────────────────────────────────────── -->
    <section class="trajectory" aria-labelledby="trajectory-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="trajectory-heading">Season trajectory</p>
        <h2 class="trajectory-headline">Eleven weeks of receipts.</h2>
        <p class="section-sub">Rank in standings, week by week.</p>
      </header>

      <div class="trajectory-chart-wrap">
        <svg
          class="trajectory-chart"
          :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="trajectoryAriaLabel"
        >
          <!-- Faint dashed grid -->
          <g class="trajectory-grid">
            <line
              v-for="r in 10"
              :key="`grid-${r}`"
              x1="0"
              :y1="rankY(r)"
              :x2="CHART_W"
              :y2="rankY(r)"
            />
          </g>

          <!-- Clip paths for circular logos -->
          <defs>
            <clipPath
              v-for="team in trajectoryTeams"
              :key="`clip-${team.id}`"
              :id="`endpoint-clip-${team.id}`"
            >
              <circle
                :cx="endpointX"
                :cy="rankY(currentRank(team.id))"
                :r="team.isMyTeam ? 16 : 14"
              />
            </clipPath>
          </defs>

          <!-- One smooth path per team -->
          <path
            v-for="team in trajectoryTeams"
            :key="`path-${team.id}`"
            class="trajectory-line"
            :class="{ 'trajectory-line-mine': team.isMyTeam }"
            :d="pathForTeam(team.id)"
            :stroke="lineColorFor(team.id)"
          />

          <!-- Logo endpoints at week 11 -->
          <g
            v-for="team in trajectoryTeams"
            :key="`endpoint-${team.id}`"
            class="trajectory-endpoint"
            :class="{ 'trajectory-endpoint-mine': team.isMyTeam }"
          >
            <!-- Backing color circle (shows through transparent logos) -->
            <circle
              :cx="endpointX"
              :cy="rankY(currentRank(team.id))"
              :r="team.isMyTeam ? 16 : 14"
              :fill="lineColorFor(team.id)"
            />
            <!-- The logo image, clipped to a circle -->
            <image
              v-if="team.avatarUrl"
              :href="team.avatarUrl"
              :x="endpointX - (team.isMyTeam ? 16 : 14)"
              :y="rankY(currentRank(team.id)) - (team.isMyTeam ? 16 : 14)"
              :width="team.isMyTeam ? 32 : 28"
              :height="team.isMyTeam ? 32 : 28"
              :clip-path="`url(#endpoint-clip-${team.id})`"
              preserveAspectRatio="xMidYMid slice"
            />
            <!-- Ring outline for definition against dark bg -->
            <circle
              :cx="endpointX"
              :cy="rankY(currentRank(team.id))"
              :r="team.isMyTeam ? 16 : 14"
              fill="none"
              :stroke="team.isMyTeam ? 'oklch(0.78 0.18 92)' : 'oklch(0.10 0.015 90)'"
              :stroke-width="team.isMyTeam ? 2 : 1.5"
            />
          </g>
        </svg>

        <ul class="trajectory-weeks" aria-hidden="true">
          <li v-for="w in WEEK_COUNT" :key="`wk-${w}`">W{{ w }}</li>
        </ul>
      </div>

      <ul class="trajectory-legend" role="list">
        <li
          v-for="team in trajectoryTeams"
          :key="`legend-${team.id}`"
          class="trajectory-legend-pill"
          :class="{ 'trajectory-legend-pill-mine': team.isMyTeam }"
          role="listitem"
        >
          <span
            class="trajectory-legend-avatar"
            :style="{ background: `linear-gradient(135deg, ${team.avatarColor})` }"
          >
            <img v-if="team.avatarUrl" :src="team.avatarUrl" class="avatar-image" alt="" />
            <span v-else>{{ team.ownerInitials }}</span>
          </span>
          <span class="trajectory-legend-name">{{ team.name }}</span>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4. POWER RANKINGS TABLE
         Compact, well-typed. Top-3 medal tints. My-team yellow row.
    ────────────────────────────────────────────────────────────── -->
    <section class="board" aria-labelledby="board-heading">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-magenta" id="board-heading">The Board</p>
          <h2 class="board-headline">Ten teams. One ladder.</h2>
          <p class="section-sub">Power score blends record, points for, and momentum.</p>
        </div>
        <div class="board-actions">
          <button
            type="button"
            class="board-customize"
            aria-label="Customize power ranking weights"
            @click="openCustomize"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Customize
          </button>
          <button
            type="button"
            class="board-share"
            aria-label="Share the full rankings board"
            @click="$emit('open-signup')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share standings
          </button>
        </div>
      </header>

      <div class="board-wrap">
        <table class="board-table">
          <thead>
            <tr>
              <th scope="col" class="col-rank">Rk</th>
              <th scope="col" class="col-team">Team</th>
              <th scope="col" class="col-change">Move</th>
              <th scope="col" class="col-score">Power</th>
              <th scope="col" class="col-spark">Last 6</th>
              <th scope="col" class="col-rec">Record</th>
              <th scope="col" class="col-allplay">All-Play</th>
              <th scope="col" class="col-ppw">PPW</th>
              <th scope="col" class="col-last3">Last 3</th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="row-flip">
            <tr
              v-for="row in boardRows"
              :key="row.teamId"
              class="board-row"
              :class="{ 'is-my-team': getTeam(row.teamId).isMyTeam }"
              tabindex="0"
              role="button"
              :aria-label="`Open ${getTeam(row.teamId).name} detail`"
              @click="openDetail(row.teamId, $event)"
              @keydown.enter.prevent="openDetail(row.teamId, $event)"
              @keydown.space.prevent="openDetail(row.teamId, $event)"
            >
              <td class="col-rank">
                <span class="rank-chip" :class="rankChipClass(row.rank)">
                  <svg v-if="row.rank === 1" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M3 7l4 4 5-7 5 7 4-4-1 11H4L3 7zM5 20h14v2H5z"/>
                  </svg>
                  <span v-else>{{ row.rank }}</span>
                </span>
              </td>
              <td class="col-team">
                <div class="team-cell">
                  <div
                    class="team-avatar"
                    :style="{ background: `linear-gradient(135deg, ${getTeam(row.teamId).avatarColor})` }"
                  >
                    <img
                      v-if="getTeam(row.teamId).avatarUrl"
                      :src="getTeam(row.teamId).avatarUrl"
                      class="avatar-image"
                      alt=""
                    />
                    <span v-else>{{ getTeam(row.teamId).ownerInitials }}</span>
                    <span v-if="getTeam(row.teamId).isMyTeam" class="team-star" aria-label="Your team" title="Your team">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <polygon points="12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9"/>
                      </svg>
                    </span>
                  </div>
                  <div class="team-name-block">
                    <p class="team-name">{{ getTeam(row.teamId).name }}</p>
                    <p class="team-owner">{{ getTeam(row.teamId).ownerName }}</p>
                    <p class="team-meta-mobile">
                      <span>{{ row.allPlayWins }}-{{ row.allPlayLosses }} AP</span>
                      <span class="team-meta-dot" aria-hidden="true">·</span>
                      <span>{{ row.pointsPerWeek.toFixed(1) }} PPW</span>
                      <span class="team-meta-dot" aria-hidden="true">·</span>
                      <span :style="{ color: last3Color(row.last3Score) }">L3 {{ row.last3Score }}</span>
                    </p>
                  </div>
                </div>
              </td>
              <td class="col-change">
                <span v-if="row.change > 0" class="change-chip change-chip-up" :aria-label="`Up ${row.change}`">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="6 15 12 9 18 15"/>
                  </svg>
                  {{ row.change }}
                </span>
                <span v-else-if="row.change < 0" class="change-chip change-chip-down" :aria-label="`Down ${Math.abs(row.change)}`">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  {{ Math.abs(row.change) }}
                </span>
                <span v-else class="change-chip change-chip-flat" aria-label="Unchanged">
                  <span class="change-flat-dot" aria-hidden="true"></span>
                </span>
              </td>
              <td class="col-score">
                <div class="score-block">
                  <span class="score-num">{{ row.powerScore.toFixed(1) }}</span>
                  <span class="score-raw">{{ row.pointsFor.toFixed(0) }} PF</span>
                </div>
              </td>
              <td class="col-spark">
                <svg class="row-spark" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
                  <path
                    class="row-spark-line"
                    :d="rowSparkPath(row.teamId)"
                    :stroke="getTeam(row.teamId).isMyTeam ? 'oklch(0.78 0.18 92)' : 'oklch(0.70 0.008 90)'"
                  />
                  <circle
                    class="row-spark-dot"
                    :cx="rowSparkEnd(row.teamId).x"
                    :cy="rowSparkEnd(row.teamId).y"
                    r="2.4"
                    :fill="getTeam(row.teamId).isMyTeam ? 'oklch(0.78 0.18 92)' : 'oklch(0.86 0.008 90)'"
                  />
                </svg>
              </td>
              <td class="col-rec">{{ row.wins }}-{{ row.losses }}</td>
              <td class="col-allplay">{{ row.allPlayWins }}-{{ row.allPlayLosses }}</td>
              <td class="col-ppw">{{ row.pointsPerWeek.toFixed(1) }}</td>
              <td class="col-last3">
                <span class="last3-num" :style="{ color: last3Color(row.last3Score) }">{{ row.last3Score }}</span>
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         5. MOVEMENT PULSE — three named callouts, DIFFERENT layouts
         A: Heater (biggest tile, 2/3 width)
         B: Long Fall (compact, downward sparkline)
         C: Steadiest Hand (text strip)
    ────────────────────────────────────────────────────────────── -->
    <section class="movement" aria-labelledby="movement-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="movement-heading">Movement</p>
        <h2 class="movement-headline">Pulse check.</h2>
      </header>

      <div class="movement-layout">
        <!-- Card A: On a Heater (largest) -->
        <article class="heater-card" :aria-label="`On a heater: ${heaterTeam.name}`">
          <div class="heater-portrait">
            <span class="heater-portrait-glow" aria-hidden="true"></span>
            <div
              class="heater-portrait-frame"
              :style="{ background: `linear-gradient(135deg, ${heaterTeam.avatarColor})` }"
            >
              <img v-if="heaterTeam.avatarUrl" :src="heaterTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ heaterTeam.ownerInitials }}</span>
            </div>
          </div>
          <div class="heater-body">
            <p class="heater-eyebrow">On a heater</p>
            <p class="heater-team">{{ heaterTeam.name }}</p>
            <p class="heater-owner">{{ heaterTeam.ownerName }}</p>
            <div class="heater-streak" :aria-label="`${biggestClimber.streak} win streak`">
              <svg
                v-for="i in 3"
                :key="`heater-chev-${i}`"
                class="heater-chev"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 15 12 9 18 15"/>
              </svg>
              <span class="heater-streak-label">{{ biggestClimber.streak }}</span>
            </div>
            <p class="heater-copy">
              Three straight wins. First-place vibes. The group chat hasn't shut up about it.
            </p>
          </div>
        </article>

        <!-- Card B: Long Fall (compact with downward arc) -->
        <article class="fall-card" :aria-label="`Long fall: ${fallTeam.name}`">
          <p class="fall-eyebrow">Long fall</p>
          <div class="fall-head">
            <span
              class="fall-avatar"
              :style="{ background: `linear-gradient(135deg, ${fallTeam.avatarColor})` }"
            >
              <img v-if="fallTeam.avatarUrl" :src="fallTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ fallTeam.ownerInitials }}</span>
            </span>
            <div class="fall-id">
              <p class="fall-team">{{ fallTeam.name }}</p>
              <p class="fall-owner">{{ fallTeam.ownerName }}</p>
            </div>
          </div>
          <svg class="fall-spark" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
            <path class="fall-spark-line" :d="fallSparkPath"/>
            <circle
              class="fall-spark-end"
              :cx="fallSparkEnd.x"
              :cy="fallSparkEnd.y"
              r="3.6"
            />
          </svg>
          <p class="fall-meta">
            <span class="fall-from">#{{ fallFromRank }}</span>
            <span class="fall-arrow" aria-hidden="true">to</span>
            <span class="fall-to">#{{ fallTeamRow.rank }}</span>
            <span class="fall-since">since week 1</span>
          </p>
        </article>

        <!-- Card C: Steadiest Hand (text strip) -->
        <article class="steady-card" :aria-label="`Steadiest hand: ${steadyTeam.name}`">
          <p class="steady-eyebrow">Steadiest hand</p>
          <div class="steady-row">
            <span
              class="steady-avatar"
              :style="{ background: `linear-gradient(135deg, ${steadyTeam.avatarColor})` }"
            >
              <img v-if="steadyTeam.avatarUrl" :src="steadyTeam.avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ steadyTeam.ownerInitials }}</span>
            </span>
            <p class="steady-copy">
              <span class="steady-team">{{ steadyTeam.name }}</span>
              has been top 4 every week and top 3 most of the season. Always there, never loud.
            </p>
          </div>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         6. FOOTER PILLS — quick reads
    ────────────────────────────────────────────────────────────── -->
    <section class="quick" aria-labelledby="quick-heading">
      <h2 class="section-eyebrow section-eyebrow-mute" id="quick-heading">Quick reads</h2>
      <ul class="pills" role="list">
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-secondary" aria-hidden="true"></span>
          <span class="pill-label">Top scorer this week</span>
          <span class="pill-value">5th Year Senior · 124.7</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-tertiary" aria-hidden="true"></span>
          <span class="pill-label">Most explosive week</span>
          <span class="pill-value">Almost Famous · 142.1</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-secondary" aria-hidden="true"></span>
          <span class="pill-label">Worst projection miss</span>
          <span class="pill-value">Reign Delay · 22.1 below proj</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-tertiary" aria-hidden="true"></span>
          <span class="pill-label">Bubble watch</span>
          <span class="pill-value">#6 Reign Delay vs #7 Commish Impossible</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-mute" aria-hidden="true"></span>
          <span class="pill-label">Floor of the league</span>
          <span class="pill-value">Auto-Draft Allstars · L5</span>
        </li>
      </ul>
    </section>

    <!-- Modals -->
    <CustomizeRankingsModal v-if="customizeOpen" @close="closeCustomize" />
    <TeamDetailModal
      v-if="detailTeamId"
      :team-id="detailTeamId"
      @close="closeDetail"
      @open-signup="$emit('open-signup')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  teams,
  standings2025Week11,
  seasonRankHistory,
  currentWeek,
  getTeam,
  teamSeasonStats,
} from '@/fixtures/pillarsLeague'
import { useDemoPowerRankings } from '@/composables/useDemoPowerRankings'
import CustomizeRankingsModal from '@/components/demo/CustomizeRankingsModal.vue'
import TeamDetailModal from '@/components/demo/TeamDetailModal.vue'
import { accentFor } from '@/utils/teamColor'
import { smoothPath, type Point } from '@/utils/svgPath'
import { ordinal } from '@/utils/format'

defineEmits<{ (e: 'open-signup'): void }>()

const standings = standings2025Week11
const myTeam = teams.find((t) => t.isMyTeam)!
const { liveRankings } = useDemoPowerRankings()

/* ─── Customize + Detail modal state ───────────────────────────── */
const customizeOpen = ref(false)
const detailTeamId = ref<string | null>(null)

function openCustomize() {
  customizeOpen.value = true
}
function closeCustomize() {
  customizeOpen.value = false
}
function openDetail(teamId: string, ev: Event) {
  detailTeamId.value = teamId
  // Stash the trigger so we can return focus on close.
  const target = ev.currentTarget as HTMLElement | null
  if (target) lastClickedRowRef.value = target
}
function closeDetail() {
  detailTeamId.value = null
  lastClickedRowRef.value?.focus?.()
}
const lastClickedRowRef = ref<HTMLElement | null>(null)

/* ─── Live rankings — what the table renders ───────────────────── */
// The table is bound to liveRankings (which re-sorts as the user adjusts
// weights in the Customize modal). Each row joins on the static standing
// to keep wins/losses/streak/PF in sync with the canonical fixture.
interface BoardRow {
  teamId: string
  rank: number
  prevRank: number
  change: number
  powerScore: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  allPlayWins: number
  allPlayLosses: number
  pointsPerWeek: number
  last3Score: number
}
const boardRows = computed<BoardRow[]>(() => {
  return liveRankings.value.map((row) => {
    const s = standings.find((x) => x.teamId === row.teamId)!
    const stats = teamSeasonStats[row.teamId]
    return {
      teamId: row.teamId,
      rank: row.rank,
      prevRank: row.prevRank,
      change: row.change,
      powerScore: row.score,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      pointsFor: s.pointsFor,
      allPlayWins: stats.allPlayWins,
      allPlayLosses: stats.allPlayLosses,
      pointsPerWeek: stats.pointsPerWeek,
      last3Score: stats.last3Score,
    }
  })
})

function last3Color(v: number) {
  if (v >= 75) return 'oklch(0.78 0.18 145)'
  if (v >= 50) return 'oklch(0.97 0.005 90)'
  if (v >= 30) return 'oklch(0.78 0.18 50)'
  return 'oklch(0.74 0.20 25)'
}

/* ─── Biggest mover derivations ─────────────────────────────── */
const biggestClimber = computed(() => {
  const sorted = [...standings].sort((a, b) => b.trend - a.trend)
  return sorted[0]
})
const biggestClimberTeam = computed(() => getTeam(biggestClimber.value.teamId))

// Hero supporting numbers
const heroPointsPerGame = computed(() => {
  const row = biggestClimber.value
  const games = row.wins + row.losses + row.ties
  return games > 0 ? (row.pointsFor / games).toFixed(1) : '0.0'
})
const heroFromRank = computed(() => {
  const week1 = seasonRankHistory[0]
  return week1.ranks[biggestClimber.value.teamId]
})

// Header context strip
const topFourGap = computed(() => {
  const top = standings.find(s => s.rank === 1)!
  const fourth = standings.find(s => s.rank === 4)!
  return (top.wins - fourth.wins).toFixed(0)
})

/* ─── Trajectory bump chart ─────────────────────────────────── */
const CHART_W = 1000
const CHART_H = 360
const X_MARGIN = 40
const Y_MARGIN = 28
const WEEK_COUNT = seasonRankHistory.length // 11
const RANK_COUNT = 10
// We pull paths in from the right edge so logo circles don't overlap the lines.
// weekX() reserves ENDPOINT_INSET on the right so lines stop short of the logo column.
const ENDPOINT_INSET = 22
const endpointX = CHART_W - X_MARGIN // logos sit at the rightmost week position

const trajectoryTeams = computed(() =>
  [...teams].sort((a, b) => currentRank(a.id) - currentRank(b.id))
)

const myTeamRankNow = computed(() => currentRank(myTeam.id))
const trajectoryAriaLabel = computed(
  () =>
    `Season rank trajectory for all 10 teams across 11 weeks. Commish Impossible is currently ${ordinal(myTeamRankNow.value)}.`
)

function weekX(week: number) {
  const idx = week - 1
  // Reserve extra space on the right so the path ends slightly before the logo circle.
  const usableW = CHART_W - X_MARGIN * 2 - ENDPOINT_INSET
  return X_MARGIN + (idx / (WEEK_COUNT - 1)) * usableW
}
function rankY(rank: number) {
  const idx = rank - 1
  const span = CHART_H - Y_MARGIN * 2
  return Y_MARGIN + (idx / (RANK_COUNT - 1)) * span
}
function currentRank(teamId: string) {
  const row = standings.find(s => s.teamId === teamId)
  return row ? row.rank : 10
}
function lineColorFor(teamId: string) {
  if (teamId === myTeam.id) return 'var(--accent-primary)'
  return accentFor(getTeam(teamId))
}

function pathForTeam(teamId: string) {
  const points: Point[] = seasonRankHistory.map(w => ({
    x: weekX(w.week),
    y: rankY(w.ranks[teamId] ?? 10),
  }))
  return smoothPath(points)
}

/* ─── Per-row sparkline (last 6 weeks of rank) ──────────────── */
const SPARK_W = 120
const SPARK_H = 32
const SPARK_PAD_X = 3
const SPARK_PAD_Y = 4

function rankHistoryFor(teamId: string): number[] {
  return seasonRankHistory.slice(-6).map(w => w.ranks[teamId] ?? 10)
}
function rowSparkPoints(teamId: string) {
  const ranks = rankHistoryFor(teamId)
  return ranks.map((r, i) => ({
    x: SPARK_PAD_X + (i / (ranks.length - 1)) * (SPARK_W - SPARK_PAD_X * 2),
    // Lower rank = higher on chart (invert: rank 1 → top)
    y: SPARK_PAD_Y + ((r - 1) / (RANK_COUNT - 1)) * (SPARK_H - SPARK_PAD_Y * 2),
  }))
}
function rowSparkPath(teamId: string): string {
  return smoothPath(rowSparkPoints(teamId))
}
function rowSparkEnd(teamId: string) {
  const pts = rowSparkPoints(teamId)
  return pts[pts.length - 1] ?? { x: 0, y: 0 }
}

/* ─── Rank chip tint (medal classes for top 3) ──────────────── */
function rankChipClass(rank: number) {
  if (rank === 1) return 'rank-chip-gold'
  if (rank === 2) return 'rank-chip-silver'
  if (rank === 3) return 'rank-chip-bronze'
  return ''
}

/* ─── Movement Pulse data derivations ───────────────────────── */
// Heater = biggest climber with a W streak.
const heaterTeam = computed(() => biggestClimberTeam.value)

// Long Fall = biggest faller by trend, breaking ties with biggest week-1-to-now drop.
const fallTeamRow = computed(() => {
  const sorted = [...standings].sort((a, b) => {
    if (a.trend !== b.trend) return a.trend - b.trend
    const w1 = seasonRankHistory[0].ranks
    const dropA = a.rank - w1[a.teamId]
    const dropB = b.rank - w1[b.teamId]
    return dropB - dropA
  })
  return sorted[0]
})
const fallTeam = computed(() => getTeam(fallTeamRow.value.teamId))
const fallFromRank = computed(() => seasonRankHistory[0].ranks[fallTeamRow.value.teamId])

// Steadiest Hand = team with smallest stdev in season rank history,
// excluding the cellar (#10 the whole way is "steady" but not the story).
const steadyTeam = computed(() => {
  let bestId = teams[0].id
  let bestStd = Infinity
  for (const t of teams) {
    const ranks = seasonRankHistory.map(w => w.ranks[t.id] ?? 10)
    if (ranks.every(r => r === 10)) continue // skip permanent cellar
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length
    const variance = ranks.reduce((s, r) => s + (r - mean) * (r - mean), 0) / ranks.length
    const std = Math.sqrt(variance)
    // prefer top-half teams as the editorial "steadiest hand"
    if (mean <= 5 && std < bestStd) {
      bestStd = std
      bestId = t.id
    }
  }
  return getTeam(bestId)
})

// Fall sparkline: this team's rank across all 11 weeks, drawn as a falling arc.
const FALL_W = 200
const FALL_H = 80
const fallSparkPoints = computed(() => {
  const id = fallTeamRow.value.teamId
  const ranks = seasonRankHistory.map(w => w.ranks[id] ?? 10)
  const padX = 6
  const padY = 8
  return ranks.map((r, i) => ({
    x: padX + (i / (ranks.length - 1)) * (FALL_W - padX * 2),
    y: padY + ((r - 1) / (RANK_COUNT - 1)) * (FALL_H - padY * 2),
  }))
})
const fallSparkPath = computed(() => {
  const pts = fallSparkPoints.value
  if (!pts.length) return ''
  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const dx = (curr.x - prev.x) / 3
    d += ` C ${(prev.x + dx).toFixed(2)},${prev.y.toFixed(2)} ${(curr.x - dx).toFixed(2)},${curr.y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`
  }
  return d
})
const fallSparkEnd = computed(() => {
  const pts = fallSparkPoints.value
  return pts[pts.length - 1] ?? { x: 0, y: 0 }
})
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from .demo-shell in DemoLayout. */
.rankings {
  display: flex;
  flex-direction: column;
  gap: 64px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── Shared section heading typography ───────────────────────── */
.section-head {
  margin-bottom: 18px;
}
.section-head-flex {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-2);
  margin: 0 0 4px;
}
.section-eyebrow-teal { color: var(--accent-tertiary); }
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-mute { color: var(--ink-3); }
.section-sub {
  font-size: 0.86rem;
  color: var(--ink-3);
  margin: 0;
  max-width: 65ch;
  line-height: 1.5;
}

/* ─── 1. PAGE HEADER ─────────────────────────────────────────── */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.page-head-copy { max-width: 60ch; }
.page-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 12px;
}
.page-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.page-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.25rem, 5vw, 3.4rem);
  line-height: 0.94;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.page-sub {
  font-size: 1.02rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 50ch;
}
.page-context {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.page-context-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.page-context-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}
.page-context-num-accent { color: var(--accent-secondary); }
.page-context-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.page-context-sep {
  width: 1px;
  height: 14px;
  background: var(--ink-5);
  display: inline-block;
}

@media (max-width: 720px) {
  .page-head { flex-direction: column; align-items: flex-start; gap: 16px; }
  .page-context { gap: 12px; }
}

/* ─── 2. HERO — Biggest Mover ─────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 48px;
  align-items: center;
  padding: 8px 0 16px;
  position: relative;
}
.hero::before {
  content: '';
  position: absolute;
  inset: -20px -20px -20px -20px;
  background:
    radial-gradient(ellipse 60% 70% at 22% 50%, oklch(0.70 0.27 350 / 0.12), transparent 70%),
    radial-gradient(ellipse 40% 50% at 80% 50%, oklch(0.72 0.18 195 / 0.05), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.hero > * { position: relative; z-index: 1; }

.hero-portrait {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1 / 1;
  max-width: 360px;
  width: 100%;
  margin: 0 auto;
}
.hero-portrait-glow {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, oklch(0.78 0.18 92 / 0.22), transparent 65%);
  filter: blur(18px);
  pointer-events: none;
}
.hero-portrait-frame {
  position: relative;
  width: 88%;
  height: 88%;
  border-radius: 36px;
  overflow: hidden;
  display: grid;
  place-items: center;
  box-shadow:
    0 24px 60px -28px oklch(0 0 0 / 0.85),
    inset 0 1px 0 oklch(1 0 0 / 0.08);
}
.hero-portrait-image { border-radius: inherit; }
.hero-portrait-initials {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(4rem, 10vw, 7rem);
  letter-spacing: 0.02em;
  color: oklch(0.12 0.012 90);
}
.hero-portrait-sheen {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 28% 22%, oklch(1 0 0 / 0.16), transparent 50%);
  pointer-events: none;
}

.hero-copy { min-width: 0; }
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 14px;
}
.hero-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5.6vw, 3.8rem);
  line-height: 0.96;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 18px;
  max-width: 22ch;
}
.hero-body {
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 24px;
  max-width: 48ch;
}

.hero-stats {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  align-items: flex-end;
  gap: 28px;
  flex-wrap: wrap;
}
.hero-stat {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}
.hero-stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  line-height: 0.95;
  letter-spacing: -0.012em;
  font-variant-numeric: tabular-nums;
}
.hero-stat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.hero-stat-primary .hero-stat-num { color: oklch(0.86 0.16 145); }  /* "+2 spots" — climbing = green */
.hero-stat-tertiary .hero-stat-num { color: var(--accent-tertiary); }
.hero-stat-leader .hero-stat-num { color: var(--accent-primary); }

.hero-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.hero-share {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: oklch(0.10 0.012 90);
  background: var(--accent-primary);
  border: none;
  padding: 12px 20px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .hero-share:hover { transform: translateY(-1px); background: oklch(0.82 0.18 92); }
}
.hero-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.hero-share:focus-visible {
  outline: 2px solid var(--ink-1);
  outline-offset: 2px;
}
.hero-actions-meta {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}

@media (max-width: 880px) {
  .hero { grid-template-columns: 1fr; gap: 24px; }
  .hero-portrait { max-width: 240px; }
}

/* ─── 3. SEASON TRAJECTORY ────────────────────────────────────── */
.trajectory-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 6px;
}
.trajectory-chart-wrap {
  background:
    radial-gradient(ellipse at top right, oklch(0.72 0.18 195 / 0.06), transparent 65%),
    oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 18px;
  padding: 26px 30px 16px;
  position: relative;
}
.trajectory-chart {
  width: 100%;
  height: 360px;
  display: block;
  overflow: visible;
}
.trajectory-grid line {
  stroke: oklch(0.97 0.005 90 / 0.05);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.trajectory-line {
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.55;
  vector-effect: non-scaling-stroke;
}
.trajectory-line-mine {
  stroke-width: 2.6;
  opacity: 1;
  filter: drop-shadow(0 0 5px oklch(0.78 0.18 92 / 0.55));
}
.trajectory-endpoint { transition: opacity 200ms cubic-bezier(0.22, 1, 0.36, 1); }
.trajectory-endpoint-mine {
  filter: drop-shadow(0 0 6px oklch(0.78 0.18 92 / 0.55));
}
.trajectory-weeks {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
  display: grid;
  grid-template-columns: repeat(11, 1fr);
  padding-left: calc(40px * 100% / 1000);
  /* Match the chart's reserved right inset so W11 sits under its endpoint logos. */
  padding-right: calc((40px + 22px) * 100% / 1000);
}
.trajectory-weeks li {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.trajectory-legend {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
}
.trajectory-legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 5px;
  border-radius: 999px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ink-2);
}
.trajectory-legend-pill-mine {
  border-color: oklch(0.78 0.18 92 / 0.55);
  background: oklch(0.78 0.18 92 / 0.06);
  color: var(--ink-1);
  box-shadow: 0 0 0 1px oklch(0.78 0.18 92 / 0.25);
}
.trajectory-legend-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.66rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.trajectory-legend-name { white-space: nowrap; }

@media (max-width: 720px) {
  .trajectory-chart-wrap { padding: 16px 14px 10px; }
  .trajectory-chart { height: 240px; }
  .trajectory-weeks li { font-size: 0.6rem; letter-spacing: 0.06em; }
}

/* ─── 4. POWER RANKINGS TABLE ─────────────────────────────────── */
.board-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 6px;
}
.board-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.board-customize,
.board-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.30 0.015 90);
  padding: 7px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.board-customize:hover,
.board-share:hover { color: var(--ink-1); border-color: oklch(0.48 0.015 90); }
.board-customize:active,
.board-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.board-customize:focus-visible,
.board-share:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.board-customize {
  color: var(--accent-secondary);
  border-color: oklch(0.70 0.27 350 / 0.40);
}
.board-customize:hover {
  color: oklch(0.92 0.18 350);
  border-color: oklch(0.70 0.27 350 / 0.70);
}

.board-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 16px;
  overflow: hidden;
}
.board-table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.board-table thead th {
  text-align: left;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  padding: 14px 16px;
  background: oklch(0.08 0.014 90);
  border-bottom: 1px solid oklch(0.18 0.015 90);
}
.board-table tbody tr {
  border-bottom: 1px solid oklch(0.14 0.018 90);
  transition: background-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.board-table tbody tr:last-child { border-bottom: none; }
.board-table tbody tr:hover { background: oklch(0.12 0.015 90); }
.board-table tbody td {
  padding: 14px 16px;
  font-size: 0.92rem;
  color: var(--ink-2);
}
.board-table tr.is-my-team {
  background: oklch(0.78 0.18 92 / 0.06);
}
.board-table tr.is-my-team:hover { background: oklch(0.78 0.18 92 / 0.10); }

.col-rank { width: 56px; }
.rank-chip {
  display: inline-grid;
  place-items: center;
  width: 32px; height: 32px;
  border-radius: 10px;
  background: oklch(0.16 0.015 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-2);
}
.rank-chip-gold {
  background: oklch(0.78 0.18 92 / 0.18);
  color: oklch(0.92 0.16 92);
  box-shadow: inset 0 0 0 1px oklch(0.78 0.18 92 / 0.35);
}
.rank-chip-silver {
  background: oklch(0.70 0.02 90 / 0.18);
  color: oklch(0.92 0.01 90);
  box-shadow: inset 0 0 0 1px oklch(0.70 0.02 90 / 0.35);
}
.rank-chip-bronze {
  background: oklch(0.55 0.10 50 / 0.20);
  color: oklch(0.85 0.09 60);
  box-shadow: inset 0 0 0 1px oklch(0.55 0.10 50 / 0.35);
}

.col-team { min-width: 220px; }
.team-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.team-avatar {
  position: relative;
  width: 36px; height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: visible;
}
.team-star {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: oklch(0.10 0.015 90);
  display: grid;
  place-items: center;
  color: oklch(0.78 0.18 92);
  border: 1px solid oklch(0.78 0.18 92);
}
.team-name {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
}
.team-owner {
  margin: 1px 0 0;
  font-size: 0.74rem;
  color: var(--ink-3);
}

.col-change { width: 80px; }
.change-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 3px 9px;
  border-radius: 999px;
}
.change-chip-up {
  background: oklch(0.72 0.18 145 / 0.16);
  color: oklch(0.86 0.16 145);
}
.change-chip-down {
  background: oklch(0.70 0.27 350 / 0.14);
  color: oklch(0.85 0.20 350);
}
.change-chip-flat {
  background: oklch(0.16 0.015 90);
  color: var(--ink-3);
  padding: 3px 9px;
}
.change-flat-dot {
  display: inline-block;
  width: 6px; height: 2px;
  border-radius: 1px;
  background: currentColor;
}

.col-score { width: 110px; }
.score-block {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
}
.score-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  line-height: 1;
}
.is-my-team .score-num { color: var(--accent-primary); }
.score-raw {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.col-spark { width: 140px; }
.row-spark {
  width: 120px;
  height: 32px;
  display: block;
  overflow: visible;
}
.row-spark-line {
  fill: none;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.row-spark-dot { stroke: oklch(0.10 0.015 90); stroke-width: 1.2; }

.col-rec {
  width: 80px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--ink-1);
}

.col-allplay,
.col-ppw,
.col-last3 {
  width: 84px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.94rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.col-allplay { width: 92px; }
.col-last3 { width: 78px; }
.last3-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}

/* Clickable rows */
.board-row { cursor: pointer; }
.board-row:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}

/* Mobile meta line is hidden on wide screens — the dedicated columns take over. */
.team-meta-mobile {
  display: none;
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  gap: 6px;
  flex-wrap: wrap;
}
.team-meta-dot { color: var(--ink-5); }

/* TransitionGroup: FLIP-style row reordering as the user adjusts weights. */
.row-flip-move {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .row-flip-move { transition: none; }
}

@media (max-width: 900px) {
  .col-allplay, th.col-allplay,
  .col-ppw, th.col-ppw,
  .col-last3, th.col-last3 { display: none; }
  .team-meta-mobile { display: inline-flex; }
}
@media (max-width: 720px) {
  .board-table thead th { padding: 12px 10px; font-size: 0.62rem; }
  .board-table tbody td { padding: 10px; font-size: 0.86rem; }
  .col-spark, th.col-spark { display: none; }
  .team-owner { display: none; }
  .col-team { min-width: 160px; }
  .score-num { font-size: 1.2rem; }
}

/* ─── 5. MOVEMENT PULSE ───────────────────────────────────────── */
.movement-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 6px;
}

/* Intentionally asymmetric layout: A is large (2/3), B is medium, C spans full width below. */
.movement-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  grid-template-areas:
    'heater fall'
    'steady steady';
  gap: 14px;
  align-items: stretch;
}
.heater-card { grid-area: heater; }
.fall-card { grid-area: fall; }
.steady-card { grid-area: steady; }

@media (max-width: 760px) {
  .movement-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      'heater'
      'fall'
      'steady';
  }
}

/* ── Card A: heater ── */
.heater-card {
  position: relative;
  background:
    radial-gradient(ellipse at 12% 50%, oklch(0.70 0.27 350 / 0.10), transparent 60%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.70 0.27 350 / 0.30);
  border-radius: 18px;
  padding: 24px 26px 26px;
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 24px;
  align-items: center;
  overflow: hidden;
}
.heater-portrait {
  position: relative;
  width: 140px;
  height: 140px;
}
.heater-portrait-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 35% 35%, oklch(0.70 0.27 350 / 0.45), transparent 65%);
  filter: blur(14px);
}
.heater-portrait-frame {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  color: oklch(0.12 0.012 90);
  box-shadow: 0 14px 40px -20px oklch(0 0 0 / 0.7);
}
.heater-body { min-width: 0; }
.heater-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: oklch(0.86 0.16 145);  /* climbing = green */
  margin: 0 0 8px;
}
.heater-team {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.7rem;
  line-height: 1.0;
  color: var(--ink-1);
}
.heater-owner {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--ink-3);
}
.heater-streak {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 12px;
  padding: 5px 11px;
  border-radius: 999px;
  background: oklch(0.74 0.18 145 / 0.16);
  color: oklch(0.86 0.16 145);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}
.heater-chev { color: oklch(0.86 0.16 145); }
.heater-streak-label { margin-left: 6px; }
.heater-copy {
  margin: 14px 0 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
  max-width: 40ch;
}

/* ── Card B: long fall ── */
.fall-card {
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 18px;
  padding: 20px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fall-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);  /* falling = magenta/pink */
  margin: 0;
}
.fall-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.fall-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  color: oklch(0.12 0.012 90);
  opacity: 0.65;
  filter: saturate(0.7);
  overflow: hidden;
}
.fall-id { min-width: 0; }
.fall-team {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--ink-2);
}
.fall-owner {
  margin: 1px 0 0;
  font-size: 0.74rem;
  color: var(--ink-3);
}
.fall-spark {
  width: 100%;
  height: 80px;
  display: block;
  overflow: visible;
  margin-top: 4px;
}
.fall-spark-line {
  fill: none;
  stroke: oklch(0.85 0.20 350);  /* falling = magenta/pink */
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 5px oklch(0.70 0.27 350 / 0.4));
}
.fall-spark-end {
  fill: oklch(0.85 0.20 350);  /* falling = magenta/pink */
  stroke: oklch(0.10 0.015 90);
  stroke-width: 1.4;
}
.fall-meta {
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 0.02em;
  flex-wrap: wrap;
}
.fall-from, .fall-to {
  font-weight: 900;
  font-size: 1.5rem;
  color: var(--ink-1);
  line-height: 1;
}
.fall-to { color: var(--accent-secondary); }  /* falling = magenta/pink */
.fall-arrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.fall-since {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-left: 4px;
}

/* ── Card C: steadiest hand ── */
.steady-card {
  background: oklch(0.10 0.015 90);
  border: 1px dashed oklch(0.24 0.015 90);
  border-radius: 14px;
  padding: 14px 18px;
}
.steady-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 8px;
}
.steady-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.steady-avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.steady-copy {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
}
.steady-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: var(--ink-1);
  letter-spacing: 0.01em;
  margin-right: 4px;
}

/* ─── 6. QUICK PILLS ──────────────────────────────────────────── */
.pills {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  align-items: center;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  line-height: 1.3;
  color: var(--ink-2);
}
.pill-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-tertiary { background: var(--accent-tertiary); }
.pill-dot-mute { background: oklch(0.45 0.015 90); }
.pill-label {
  color: var(--ink-3);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
}
.pill-value {
  color: var(--ink-1);
  font-weight: 600;
}

/* ─── Shared avatar image fill ────────────────────────────────── */
.avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}
</style>
